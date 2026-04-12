import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH || join(__dirname, "taskpilot.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const ADMIN_EMAIL = "admin@example.com";

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );
`);

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

const migrations = [
  {
    version: 1,
    name: "initial_schema",
    up: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id            TEXT PRIMARY KEY,
          email         TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name          TEXT NOT NULL,
          role          TEXT NOT NULL DEFAULT 'Member',
          created_at    TEXT NOT NULL
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
          id            TEXT PRIMARY KEY,
          workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          title         TEXT NOT NULL,
          description   TEXT DEFAULT '',
          status        TEXT NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'Done')),
          priority      TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
          assignee_id   TEXT DEFAULT '',
          due_date      TEXT DEFAULT '',
          effort        INTEGER DEFAULT 2,
          planned_start TEXT DEFAULT '',
          planned_end   TEXT DEFAULT ''
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
        CREATE INDEX IF NOT EXISTS idx_activities_workspace_id_created_at ON activities(workspace_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_invitations_workspace_id ON invitations(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_invitations_invited_user_id_status ON invitations(invited_user_id, status);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_workspace_user_pending_unique
          ON invitations(workspace_id, invited_user_id, status);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_trigger_date ON notifications(user_id, trigger_date);
        CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);

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
    },
  },
  {
    version: 2,
    name: "add_missing_columns",
    up: () => {
      if (!columnExists("users", "role")) {
        db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'Member'");
      }
      if (!columnExists("tasks", "planned_start")) {
        db.exec("ALTER TABLE tasks ADD COLUMN planned_start TEXT DEFAULT ''");
      }
      if (!columnExists("tasks", "planned_end")) {
        db.exec("ALTER TABLE tasks ADD COLUMN planned_end TEXT DEFAULT ''");
      }
    },
  },
  {
    version: 3,
    name: "backfill_workspace_owner_memberships",
    up: () => {
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
    },
  },
  {
    version: 4,
    name: "migrate_legacy_members_table",
    up: () => {
      const hasLegacyMembersTable = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'members'
      `).get();

      if (!hasLegacyMembersTable) return;

      if (!columnExists("members", "user_id")) {
        db.exec("ALTER TABLE members ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
      }

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

      db.prepare(`
        INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role, joined_at)
        SELECT
          'wm-' || substr(hex(randomblob(8)), 1, 8),
          m.workspace_id,
          m.user_id,
          m.role,
          COALESCE(w.created_at, datetime('now'))
        FROM members m
        JOIN workspaces w ON w.id = m.workspace_id
        WHERE m.user_id IS NOT NULL AND m.user_id <> ''
      `).run();

      db.exec("DROP TABLE members");
    },
  },
  {
    version: 5,
    name: "add_archive_columns",
    up: () => {
      if (!columnExists("workspaces", "archived_at")) {
        db.exec("ALTER TABLE workspaces ADD COLUMN archived_at TEXT");
      }
      if (!columnExists("projects", "archived_at")) {
        db.exec("ALTER TABLE projects ADD COLUMN archived_at TEXT");
      }
      if (!columnExists("tasks", "archived_at")) {
        db.exec("ALTER TABLE tasks ADD COLUMN archived_at TEXT");
      }

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_workspaces_archived_at ON workspaces(archived_at);
        CREATE INDEX IF NOT EXISTS idx_projects_workspace_archived_at ON projects(workspace_id, archived_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_workspace_archived_at ON tasks(workspace_id, archived_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_project_archived_at ON tasks(project_id, archived_at);
      `);
    },
  },
  {
    version: 6,
    name: "add_data_integrity_constraints",
    up: () => {
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS validate_users_before_insert
        BEFORE INSERT ON users FOR EACH ROW
        WHEN length(trim(COALESCE(NEW.name, ''))) = 0
          OR length(trim(COALESCE(NEW.email, ''))) = 0
        BEGIN SELECT RAISE(ABORT, 'User name and email are required'); END;

        CREATE TRIGGER IF NOT EXISTS validate_users_before_update
        BEFORE UPDATE ON users FOR EACH ROW
        WHEN length(trim(COALESCE(NEW.name, ''))) = 0
          OR length(trim(COALESCE(NEW.email, ''))) = 0
        BEGIN SELECT RAISE(ABORT, 'User name and email are required'); END;

        CREATE TRIGGER IF NOT EXISTS validate_workspaces_before_insert
        BEFORE INSERT ON workspaces FOR EACH ROW
        WHEN length(trim(COALESCE(NEW.name, ''))) = 0
        BEGIN SELECT RAISE(ABORT, 'Workspace name is required'); END;

        CREATE TRIGGER IF NOT EXISTS validate_workspaces_before_update
        BEFORE UPDATE ON workspaces FOR EACH ROW
        WHEN length(trim(COALESCE(NEW.name, ''))) = 0
        BEGIN SELECT RAISE(ABORT, 'Workspace name is required'); END;

        CREATE TRIGGER IF NOT EXISTS validate_projects_integrity_before_insert
        BEFORE INSERT ON projects FOR EACH ROW
        WHEN length(trim(COALESCE(NEW.name, ''))) = 0
          OR (
            COALESCE(NEW.start_date, '') <> ''
            AND COALESCE(NEW.end_date, '') <> ''
            AND NEW.end_date < NEW.start_date
          )
        BEGIN SELECT RAISE(ABORT, 'Project name is required and end date must not be before start date'); END;

        CREATE TRIGGER IF NOT EXISTS validate_projects_integrity_before_update
        BEFORE UPDATE ON projects FOR EACH ROW
        WHEN length(trim(COALESCE(NEW.name, ''))) = 0
          OR (
            COALESCE(NEW.start_date, '') <> ''
            AND COALESCE(NEW.end_date, '') <> ''
            AND NEW.end_date < NEW.start_date
          )
        BEGIN SELECT RAISE(ABORT, 'Project name is required and end date must not be before start date'); END;

        CREATE TRIGGER IF NOT EXISTS validate_tasks_integrity_before_insert
        BEFORE INSERT ON tasks FOR EACH ROW
        WHEN length(trim(COALESCE(NEW.title, ''))) = 0
          OR NEW.effort < 1
          OR NEW.effort > 8
          OR (
            COALESCE(NEW.planned_start, '') <> ''
            AND COALESCE(NEW.planned_end, '') <> ''
            AND NEW.planned_end < NEW.planned_start
          )
        BEGIN SELECT RAISE(ABORT, 'Task title is required, effort must be between 1 and 8, and planned end must not be before planned start'); END;

        CREATE TRIGGER IF NOT EXISTS validate_tasks_integrity_before_update
        BEFORE UPDATE ON tasks FOR EACH ROW
        WHEN length(trim(COALESCE(NEW.title, ''))) = 0
          OR NEW.effort < 1
          OR NEW.effort > 8
          OR (
            COALESCE(NEW.planned_start, '') <> ''
            AND COALESCE(NEW.planned_end, '') <> ''
            AND NEW.planned_end < NEW.planned_start
          )
        BEGIN SELECT RAISE(ABORT, 'Task title is required, effort must be between 1 and 8, and planned end must not be before planned start'); END;

        CREATE TRIGGER IF NOT EXISTS validate_workspace_members_before_insert
        BEFORE INSERT ON workspace_members FOR EACH ROW
        WHEN NEW.role NOT IN ('Owner', 'Admin', 'Member')
        BEGIN SELECT RAISE(ABORT, 'Workspace member role is invalid'); END;

        CREATE TRIGGER IF NOT EXISTS validate_workspace_members_before_update
        BEFORE UPDATE ON workspace_members FOR EACH ROW
        WHEN NEW.role NOT IN ('Owner', 'Admin', 'Member')
        BEGIN SELECT RAISE(ABORT, 'Workspace member role is invalid'); END;

        CREATE TRIGGER IF NOT EXISTS validate_join_requests_before_insert
        BEFORE INSERT ON workspace_join_requests FOR EACH ROW
        WHEN NEW.status NOT IN ('Pending', 'Approved', 'Rejected')
        BEGIN SELECT RAISE(ABORT, 'Join request status is invalid'); END;

        CREATE TRIGGER IF NOT EXISTS validate_join_requests_before_update
        BEFORE UPDATE ON workspace_join_requests FOR EACH ROW
        WHEN NEW.status NOT IN ('Pending', 'Approved', 'Rejected')
        BEGIN SELECT RAISE(ABORT, 'Join request status is invalid'); END;
      `);
    },
  },
  {
    version: 7,
    name: "add_notification_emailed_at",
    up: () => {
      if (!columnExists("notifications", "emailed_at")) {
        db.exec("ALTER TABLE notifications ADD COLUMN emailed_at TEXT");
      }
    },
  },
  {
    version: 8,
    name: "add_workspace_is_public",
    up: () => {
      if (!columnExists("workspaces", "is_public")) {
        db.exec("ALTER TABLE workspaces ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0");
      }
    },
  },
];

function applyMigrations() {
  const appliedVersions = new Set(
    db.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map((row) => row.version)
  );

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;

    const runMigration = db.transaction(() => {
      migration.up();
      db.prepare(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)"
      ).run(migration.version, migration.name, new Date().toISOString());
    });

    runMigration();
  }
}

applyMigrations();

// Seed default admin user after schema is ready.
let adminUser = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
if (!adminUser) {
  const hash = bcrypt.hashSync("admin123", 10);
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("u-admin", ADMIN_EMAIL, hash, "Admin", "Admin", now);
}
db.prepare("UPDATE users SET role = 'Admin' WHERE email = ?").run(ADMIN_EMAIL);

export default db;
export { ADMIN_EMAIL };
