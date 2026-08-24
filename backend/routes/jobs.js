const express = require('express');
const db = require('../db/db');

const router = express.Router();

// GET /api/jobs
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM jobs ORDER BY start_date').all();
  res.json(rows);
});

// POST /api/jobs
router.post('/', (req, res) => {
  const { name, address, start_date, end_date } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const createdBy = req.user?.email || null;

  const result = db
    .prepare(
      `INSERT INTO jobs (name, address, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, address || null, start_date || null, end_date || null, createdBy);

  res.status(201).json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/jobs/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });

  const {
    name = existing.name,
    address = existing.address,
    start_date = existing.start_date,
    end_date = existing.end_date,
    status = existing.status
  } = req.body;

  db.prepare(
    `UPDATE jobs SET name = ?, address = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?`
  ).run(name, address, start_date, end_date, status, id);

  res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id));
});

module.exports = router;
