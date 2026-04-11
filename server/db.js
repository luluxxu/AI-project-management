import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new Database(join(__dirname, "taskpilot.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create all tables on first run. IF NOT EXISTS makes this safe to re-run.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name         TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'Member',
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  TEXT NOT NULL,
    owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS projects (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'Planning' CHECK (status IN ('Planning', 'Active', 'Completed', 'On Hold', 'Cancelled')),
    priority     TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    start_date   TEXT,
    end_date     TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'Done')),
    priority     TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    assignee_id  TEXT DEFAULT '',
    due_date     TEXT DEFAULT '',
    effort       INTEGER DEFAULT 2,
    planned_start TEXT DEFAULT '',
    planned_end   TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS members (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'Member')),
    email        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    message      TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id              TEXT PRIMARY KEY,
    workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invited_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_email   TEXT NOT NULL,
    invited_name    TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'Member')),
    status          TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
    invited_by_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TEXT NOT NULL,
    responded_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         TEXT NOT NULL DEFAULT 'Member',
    joined_at    TEXT NOT NULL,
    UNIQUE(workspace_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS workspace_join_requests (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'Pending',
    created_at   TEXT NOT NULL,
    UNIQUE(workspace_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    task_id      TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    type         TEXT NOT NULL,
    message      TEXT NOT NULL,
    trigger_date TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    read_at      TEXT,
    UNIQUE(user_id, task_id, type)
  );

  CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
  CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_members_workspace_id ON members(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_members_workspace_user_unique ON members(workspace_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_activities_workspace_id_created_at ON activities(workspace_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_invitations_workspace_id ON invitations(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_invitations_invited_user_id_status ON invitations(invited_user_id, status);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_workspace_user_pending_unique
    ON invitations(workspace_id, invited_user_id, status);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_trigger_date ON notifications(user_id, trigger_date);
  CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);
`);

// Validation triggers from teammate's work
db.exec(`
  CREATE TRIGGER IF NOT EXISTS validate_projects_before_insert
  BEFORE INSERT ON projects FOR EACH ROW
  WHEN NEW.status NOT IN ('Planning', 'Active', 'Completed', 'On Hold', 'Cancelled')
    OR NEW.priority NOT IN ('Low', 'Medium', 'High')
  BEGIN SELECT RAISE(ABORT, 'Invalid project status or priority'); END;

  CREATE TRIGGER IF NOT EXISTS validate_projects_before_update
  BEFORE UPDATE ON projects FOR EACH ROW
  WHEN NEW.status NOT IN ('Planning', 'Active', 'Completed', 'On Hold', 'Cancelled')
    OR NEW.priority NOT IN ('Low', 'Medium', 'High')
  BEGIN SELECT RAISE(ABORT, 'Invalid project status or priority'); END;

  CREATE TRIGGER IF NOT EXISTS validate_tasks_before_insert
  BEFORE INSERT ON tasks FOR EACH ROW
  WHEN NEW.status NOT IN ('Todo', 'In Progress', 'Done')
    OR NEW.priority NOT IN ('Low', 'Medium', 'High')
  BEGIN SELECT RAISE(ABORT, 'Invalid task status or priority'); END;

  CREATE TRIGGER IF NOT EXISTS validate_tasks_before_update
  BEFORE UPDATE ON tasks FOR EACH ROW
  WHEN NEW.status NOT IN ('Todo', 'In Progress', 'Done')
    OR NEW.priority NOT IN ('Low', 'Medium', 'High')
  BEGIN SELECT RAISE(ABORT, 'Invalid task status or priority'); END;

  CREATE TRIGGER IF NOT EXISTS validate_members_before_insert
  BEFORE INSERT ON members FOR EACH ROW
  WHEN NEW.role NOT IN ('Owner', 'Admin', 'Member')
  BEGIN SELECT RAISE(ABORT, 'Invalid member role'); END;

  CREATE TRIGGER IF NOT EXISTS validate_members_before_update
  BEFORE UPDATE ON members FOR EACH ROW
  WHEN NEW.role NOT IN ('Owner', 'Admin', 'Member')
  BEGIN SELECT RAISE(ABORT, 'Invalid member role'); END;

  CREATE TRIGGER IF NOT EXISTS validate_task_project_workspace_before_insert
  BEFORE INSERT ON tasks FOR EACH ROW
  WHEN NOT EXISTS (
    SELECT 1 FROM projects WHERE projects.id = NEW.project_id AND projects.workspace_id = NEW.workspace_id
  )
  BEGIN SELECT RAISE(ABORT, 'Task project must belong to the same workspace'); END;

  CREATE TRIGGER IF NOT EXISTS validate_task_project_workspace_before_update
  BEFORE UPDATE OF project_id, workspace_id ON tasks FOR EACH ROW
  WHEN NOT EXISTS (
    SELECT 1 FROM projects WHERE projects.id = NEW.project_id AND projects.workspace_id = NEW.workspace_id
  )
  BEGIN SELECT RAISE(ABORT, 'Task project must belong to the same workspace'); END;
`);

// Add role column for existing databases that don't have it yet
try { db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'Member'"); } catch { /* column already exists */ }
try { db.exec("ALTER TABLE tasks ADD COLUMN planned_start TEXT DEFAULT ''"); } catch { /* column already exists */ }
try { db.exec("ALTER TABLE tasks ADD COLUMN planned_end TEXT DEFAULT ''"); } catch { /* column already exists */ }
try { db.exec("ALTER TABLE members ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE"); } catch { /* column already exists */ }

db.prepare(`
  UPDATE members
  SET user_id = (
    SELECT users.id
    FROM users
    WHERE lower(users.email) = lower(members.email)
  )
  WHERE (user_id IS NULL OR user_id = '')
    AND EXISTS (
      SELECT 1
      FROM users
      WHERE lower(users.email) = lower(members.email)
    )
`).run();

// ── Seed default admin user ──
const ADMIN_EMAIL = "admin@example.com";

let adminUser = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
if (!adminUser) {
  const hash = bcrypt.hashSync("admin123", 10);
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("u-admin", ADMIN_EMAIL, hash, "Admin", "Admin", now);
}
db.prepare("UPDATE users SET role = 'Admin' WHERE email = ?").run(ADMIN_EMAIL);

// ── Migrate: backfill workspace_members for existing workspace owners ──
const ownersWithoutMembership = db.prepare(`
  SELECT w.id AS workspace_id, w.owner_id AS user_id
  FROM workspaces w
  LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = w.owner_id
  WHERE wm.id IS NULL
`).all();
for (const row of ownersWithoutMembership) {
  db.prepare(
    "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, 'Owner', ?)"
  ).run(`wm-${row.workspace_id}-owner`, row.workspace_id, row.user_id, new Date().toISOString());
}

// Keep the legacy members table in sync for routes/components that still read from it.
db.prepare(`
  INSERT OR IGNORE INTO members (id, workspace_id, user_id, name, role, email)
  SELECT
    'm-' || substr(hex(randomblob(8)), 1, 8),
    wm.workspace_id,
    wm.user_id,
    u.name,
    wm.role,
    u.email
  FROM workspace_members wm
  JOIN users u ON u.id = wm.user_id
`).run();

export default db;
export { ADMIN_EMAIL };
