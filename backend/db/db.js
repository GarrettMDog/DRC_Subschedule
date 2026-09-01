const Database = require('better-sqlite3');
const path = require('path');

// Same pattern as Bedrock: persistent disk on Render, mounted at DB_PATH.
// Falls back to a local file for dev.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'subschedule.db');
console.log(`Using database at: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS subcontractors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    trade TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    link_token TEXT UNIQUE NOT NULL,
    last_viewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    time TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    materials_ordered INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subcontractor_id INTEGER NOT NULL REFERENCES subcontractors(id),
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    decline_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Formal directory of people to-dos can be assigned to. Deliberately its
  -- own table, not reusing subcontractors — a to-do assignee might be office
  -- staff, not a subcontractor at all, and there's no other staff directory
  -- in the app yet.
  CREATE TABLE IF NOT EXISTS service_assignees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    assignee_id INTEGER REFERENCES service_assignees(id) ON DELETE SET NULL,
    job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_assignments_sub ON assignments(subcontractor_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_job ON assignments(job_id);
  CREATE INDEX IF NOT EXISTS idx_todos_assignee ON todos(assignee_id);
  CREATE INDEX IF NOT EXISTS idx_todos_job ON todos(job_id);
`);

// Safe migration: adds materials_ordered to any database that already
// existed before this column was introduced. No-op on a fresh database,
// since CREATE TABLE above already includes it. Same pattern as Bedrock's
// safe editedAt migration.
const jobColumns = db.prepare('PRAGMA table_info(jobs)').all();
const hasMaterialsOrdered = jobColumns.some((col) => col.name === 'materials_ordered');
if (!hasMaterialsOrdered) {
  db.exec('ALTER TABLE jobs ADD COLUMN materials_ordered INTEGER NOT NULL DEFAULT 0');
}

const subColumns = db.prepare('PRAGMA table_info(subcontractors)').all();
const hasLastViewedAt = subColumns.some((col) => col.name === 'last_viewed_at');
if (!hasLastViewedAt) {
  db.exec('ALTER TABLE subcontractors ADD COLUMN last_viewed_at TEXT');
}

const hasJobTime = jobColumns.some((col) => col.name === 'time');
if (!hasJobTime) {
  db.exec('ALTER TABLE jobs ADD COLUMN time TEXT');
}

module.exports = db;
