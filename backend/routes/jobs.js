const express = require('express');
const db = require('../db/db');

const router = express.Router();

// Multi-value fields (job_type, materials) support more than one value —
// e.g. a job that's both Prep and Pour, or needs both Concrete and Pump.
// Frontend sends an array from the multiselect/checkboxes; stored as a
// plain comma-separated string in the column — no schema change needed
// for these small, fixed sets of options.
function normalizeMultiValue(value) {
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
  const { address, start_date, end_date, time, job_type, yardage, materials, ordered_materials, notes } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'address is required' });
  }

  // The `name` column still exists (NOT NULL) and stays internally in sync
  // with address — avoids a risky ALTER on an existing NOT NULL constraint
  // for what's really just a UI simplification. Nothing reads name as a
  // distinct concept from address anywhere in the app anymore.
  const name = address;
  const createdBy = req.user?.name || req.user?.email || null;

  const result = db
    .prepare(
      `INSERT INTO jobs (name, address, start_date, end_date, time, job_type, yardage, materials, ordered_materials, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      address,
      start_date || null,
      end_date || null,
      time || null,
      normalizeMultiValue(job_type),
      yardage || null,
      normalizeMultiValue(materials),
      normalizeMultiValue(ordered_materials),
      notes || null,
      createdBy
    );

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
    yardage = existing.yardage,
    materials = existing.materials,
    ordered_materials = existing.ordered_materials,
    notes = existing.notes
  } = req.body;

  // name always mirrors address now, not a separately-edited value.
  const name = address;

  db.prepare(
    `UPDATE jobs SET name = ?, address = ?, start_date = ?, end_date = ?, time = ?, job_type = ?, yardage = ?, materials = ?, ordered_materials = ?, notes = ? WHERE id = ?`
  ).run(
    name,
    address,
    start_date,
    end_date,
    time,
    normalizeMultiValue(job_type),
    yardage,
    normalizeMultiValue(materials),
    normalizeMultiValue(ordered_materials),
    notes,
    id
  );

  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id));
});

// DELETE /api/jobs/:id — a real delete, not a status change. Assignments
// referencing this job are removed first (job_id there is NOT NULL, so an
// assignment can't meaningfully outlive its job); todos linked to this job
// don't need handling here — their own ON DELETE SET NULL already unassigns
// them automatically, same as when a service assignee gets deleted.
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });

  db.prepare('DELETE FROM assignments WHERE job_id = ?').run(id);
  db.prepare('DELETE FROM jobs WHERE id = ?').run(id);

  res.json({ ok: true });
});

module.exports = router;
