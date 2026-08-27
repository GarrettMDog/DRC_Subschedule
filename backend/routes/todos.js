const express = require('express');
const db = require('../db/db');

const router = express.Router();

// GET /api/todos — open items first, then by due date, joined with names so
// the frontend doesn't need a separate lookup to display who/what a to-do
// is attached to.
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, sa.name AS assignee_name, j.name AS job_name
       FROM todos t
       LEFT JOIN service_assignees sa ON sa.id = t.assignee_id
       LEFT JOIN jobs j ON j.id = t.job_id
       ORDER BY t.completed ASC, COALESCE(t.due_date, '9999-99-99') ASC, t.created_at ASC`
    )
    .all();
  res.json(rows);
});

// POST /api/todos
router.post('/', (req, res) => {
  const { title, description, assignee_id, job_id, due_date } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const result = db
    .prepare(
      `INSERT INTO todos (title, description, assignee_id, job_id, due_date)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(title, description || null, assignee_id || null, job_id || null, due_date || null);

  res.status(201).json(db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/todos/:id — edit any field, including just toggling completed
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'To-do not found' });

  const {
    title = existing.title,
    description = existing.description,
    assignee_id = existing.assignee_id,
    job_id = existing.job_id,
    due_date = existing.due_date,
    completed = existing.completed
  } = req.body;

  db.prepare(
    `UPDATE todos
     SET title = ?, description = ?, assignee_id = ?, job_id = ?, due_date = ?, completed = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(title, description, assignee_id, job_id, due_date, completed ? 1 : 0, id);

  res.json(db.prepare('SELECT * FROM todos WHERE id = ?').get(id));
});

// DELETE /api/todos/:id — real delete; to-dos aren't worth preserving
// history for the way assignments/jobs are.
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'To-do not found' });

  db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
