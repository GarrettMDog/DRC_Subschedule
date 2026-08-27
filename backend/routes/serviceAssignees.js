const express = require('express');
const db = require('../db/db');

const router = express.Router();

// GET /api/service-assignees
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM service_assignees ORDER BY name COLLATE NOCASE').all();
  res.json(rows);
});

// POST /api/service-assignees
router.post('/', (req, res) => {
  const { name, email, phone } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const result = db
    .prepare('INSERT INTO service_assignees (name, email, phone) VALUES (?, ?, ?)')
    .run(name, email || null, phone || null);

  res.status(201).json(db.prepare('SELECT * FROM service_assignees WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/service-assignees/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM service_assignees WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Assignee not found' });

  const { name = existing.name, email = existing.email, phone = existing.phone } = req.body;

  db.prepare('UPDATE service_assignees SET name = ?, email = ?, phone = ? WHERE id = ?').run(
    name,
    email,
    phone,
    id
  );

  res.json(db.prepare('SELECT * FROM service_assignees WHERE id = ?').get(id));
});

// DELETE /api/service-assignees/:id — a real delete (unlike jobs/subcontractors,
// which are never hard-deleted). Any to-dos assigned to this person get
// automatically unassigned (assignee_id -> NULL) via the ON DELETE SET NULL
// foreign key, not left dangling or blocking the delete.
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM service_assignees WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Assignee not found' });

  db.prepare('DELETE FROM service_assignees WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
