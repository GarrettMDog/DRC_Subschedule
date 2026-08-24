const Database = require('better-sqlite3');
const path = require('path');

// Same pattern as Bedrock: persistent disk on Render, mounted at DB_PATH.
// Falls back to a local file for dev.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'subschedule.db');

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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
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

  CREATE INDEX IF NOT EXISTS idx_assignments_sub ON assignments(subcontractor_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_job ON assignments(job_id);
`);

module.exports = db;
