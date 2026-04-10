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
    effort       INTEGER DEFAULT 2
  );

  CREATE TABLE IF NOT EXISTS members (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
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

  CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
  CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_members_workspace_id ON members(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_activities_workspace_id_created_at ON activities(workspace_id, created_at DESC);
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

export default db;
export { ADMIN_EMAIL };
