const express = require('express');
const db = require('../db/db');

const router = express.Router();

// job_type now supports multiple values (e.g. a job that's both Prep and
// Pour). Frontend sends an array from the multiselect control; stored as a
// plain comma-separated string in the same column — no schema change
// needed for a fixed set of 3 possible values.
function normalizeJobType(value) {
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(',');
    return joined || null;
  }
  return value || null;
}

// GET /api/jobs
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM jobs ORDER BY address COLLATE NOCASE').all();
  res.json(rows);
});

// POST /api/jobs
router.post('/', (req, res) => {
  const { address, start_date, end_date, job_type } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'address is required' });
  }

  // The `name` column still exists (NOT NULL) and stays internally in sync
  // with address — avoids a risky ALTER on an existing NOT NULL constraint
  // for what's really just a UI simplification. Nothing reads name as a
  // distinct concept from address anywhere in the app anymore.
  const name = address;
  const createdBy = req.user?.email || null;

  const result = db
    .prepare(
      `INSERT INTO jobs (name, address, start_date, end_date, job_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, address, start_date || null, end_date || null, normalizeJobType(job_type), createdBy);

  res.status(201).json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/jobs/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });

  const {
    address = existing.address,
    start_date = existing.start_date,
    end_date = existing.end_date,
    time = existing.time,
    job_type = existing.job_type,
    status = existing.status,
    materials_ordered = existing.materials_ordered
  } = req.body;

  // name always mirrors address now, not a separately-edited value.
  const name = address;

  db.prepare(
    `UPDATE jobs SET name = ?, address = ?, start_date = ?, end_date = ?, time = ?, job_type = ?, status = ?, materials_ordered = ? WHERE id = ?`
  ).run(name, address, start_date, end_date, time, normalizeJobType(job_type), status, materials_ordered ? 1 : 0, id);

  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id));
});

module.exports = router;
