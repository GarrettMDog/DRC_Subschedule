const express = require('express');
const db = require('../db/db');

const router = express.Router();

const PRIORITIES = ['High', 'Medium', 'Low'];

// GET /api/estimates — highest priority first, then oldest received first
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM estimates
       ORDER BY CASE priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 ELSE 2 END,
                date_received ASC, id ASC`
    )
    .all();
  res.json(rows);
});

// POST /api/estimates
router.post('/', (req, res) => {
  const { date_received, project_name, address, contact, priority = 'Medium' } = req.body;

  if (!date_received || !project_name) {
    return res.status(400).json({ error: 'date_received and project_name are required' });
  }
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${PRIORITIES.join(', ')}` });
  }

  const createdBy = req.user?.name || req.user?.email || null;
  const result = db
    .prepare(
      `INSERT INTO estimates (date_received, project_name, address, contact, priority, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(date_received, project_name, address || null, contact || null, priority, createdBy);

  res.status(201).json(db.prepare('SELECT * FROM estimates WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/estimates/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM estimates WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Estimate not found' });

  const {
    date_received = existing.date_received,
    project_name = existing.project_name,
    address = existing.address,
    contact = existing.contact,
    priority = existing.priority
  } = req.body;

  if (!date_received || !project_name) {
    return res.status(400).json({ error: 'date_received and project_name are required' });
  }
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${PRIORITIES.join(', ')}` });
  }

  db.prepare(
    `UPDATE estimates
     SET date_received = ?, project_name = ?, address = ?, contact = ?, priority = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(date_received, project_name, address || null, contact || null, priority, id);

  res.json(db.prepare('SELECT * FROM estimates WHERE id = ?').get(id));
});

// DELETE /api/estimates/:id — a real delete; finished estimates just come off the list
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM estimates WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Estimate not found' });

  db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
