import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Open (or create) the SQLite database file next to this file.
const db = new Database(join(__dirname, "taskpilot.db"));

// Enable WAL mode for better concurrent read performance.
db.pragma("journal_mode = WAL");
// Enforce foreign key constraints (SQLite disables them by default).
db.pragma("foreign_keys = ON");

// Create all tables on first run. IF NOT EXISTS makes this safe to re-run.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name         TEXT NOT NULL,
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
    status       TEXT NOT NULL DEFAULT 'Planning',
    priority     TEXT NOT NULL DEFAULT 'Medium',
    start_date   TEXT,
    end_date     TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'Todo',
    priority     TEXT NOT NULL DEFAULT 'Medium',
    assignee_id  TEXT DEFAULT '',
    due_date     TEXT DEFAULT '',
    effort       INTEGER DEFAULT 2
  );

  CREATE TABLE IF NOT EXISTS members (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'Member',
    email        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    message      TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );
`);

export default db;