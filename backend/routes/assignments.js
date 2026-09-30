const express = require('express');
const db = require('../db/db');

const router = express.Router();

// GET /api/assignments — everything, joined with sub + job names, for the dashboard/calendar
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, s.company_name AS subcontractor_name, j.name AS job_name, j.address AS job_address,
              j.job_type AS job_type, j.materials AS materials, j.ordered_materials AS ordered_materials,
              j.time AS job_time, j.yardage AS job_yardage
       FROM assignments a
       JOIN subcontractors s ON s.id = a.subcontractor_id
       JOIN jobs j ON j.id = a.job_id
       ORDER BY a.start_date, CASE WHEN j.time IS NULL THEN 1 ELSE 0 END, j.time`
    )
    .all();
  res.json(rows);
});

// POST /api/assignments — assign a sub to a job. No overlap/conflict check:
// subs commonly run multiple crews and can legitimately be on two jobs at
// the same time, so a double-booking isn't actually an error here.
router.post('/', (req, res) => {
  const { subcontractor_id, job_id, start_date, end_date, notes } = req.body;

  if (!subcontractor_id || !job_id || !start_date || !end_date) {
    return res.status(400).json({
      error: 'subcontractor_id, job_id, start_date, and end_date are required'
    });
  }

  const result = db
    .prepare(
      `INSERT INTO assignments (subcontractor_id, job_id, start_date, end_date, notes)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(subcontractor_id, job_id, start_date, end_date, notes || null);

  const created = db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ assignment: created });

  // TODO: notify the sub of the new assignment (email/SMS) once a provider is wired up.
});

// PUT /api/assignments/:id — reschedule, reassign to a different sub, edit
// notes, or change status from the office side
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Assignment not found' });

  const {
    subcontractor_id = existing.subcontractor_id,
    start_date = existing.start_date,
    end_date = existing.end_date,
    status = existing.status,
    notes = existing.notes
  } = req.body;

  db.prepare(
    `UPDATE assignments
     SET subcontractor_id = ?, start_date = ?, end_date = ?, status = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(subcontractor_id, start_date, end_date, status, notes, id);

  res.json({ assignment: db.prepare('SELECT * FROM assignments WHERE id = ?').get(id) });
});

// DELETE /api/assignments/:id — cancel rather than hard-delete, keeps history intact
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Assignment not found' });

  db.prepare(`UPDATE assignments SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(id);
  res.json({ ok: true });
});

module.exports = router;
