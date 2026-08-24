const express = require('express');
const db = require('../db/db');
const { findConflicts } = require('../db/conflicts');

const router = express.Router();

// GET /api/assignments — everything, joined with sub + job names, for the dashboard/calendar
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, s.company_name AS subcontractor_name, j.name AS job_name, j.address AS job_address
       FROM assignments a
       JOIN subcontractors s ON s.id = a.subcontractor_id
       JOIN jobs j ON j.id = a.job_id
       ORDER BY a.start_date`
    )
    .all();
  res.json(rows);
});

// POST /api/assignments — assign a sub to a job. Returns any soft conflicts
// alongside the created assignment so the UI can flag them.
router.post('/', (req, res) => {
  const { subcontractor_id, job_id, start_date, end_date, notes } = req.body;

  if (!subcontractor_id || !job_id || !start_date || !end_date) {
    return res.status(400).json({
      error: 'subcontractor_id, job_id, start_date, and end_date are required'
    });
  }

  const conflicts = findConflicts({ subcontractorId: subcontractor_id, startDate: start_date, endDate: end_date });

  const result = db
    .prepare(
      `INSERT INTO assignments (subcontractor_id, job_id, start_date, end_date, notes)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(subcontractor_id, job_id, start_date, end_date, notes || null);

  const created = db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ assignment: created, conflicts });

  // TODO: notify the sub of the new assignment (email/SMS) once a provider is wired up.
});

// PUT /api/assignments/:id — reschedule, edit notes, or change status from the office side
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Assignment not found' });

  const {
    start_date = existing.start_date,
    end_date = existing.end_date,
    status = existing.status,
    notes = existing.notes
  } = req.body;

  const conflicts = findConflicts({
    subcontractorId: existing.subcontractor_id,
    startDate: start_date,
    endDate: end_date,
    excludeAssignmentId: id
  });

  db.prepare(
    `UPDATE assignments
     SET start_date = ?, end_date = ?, status = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(start_date, end_date, status, notes, id);

  res.json({ assignment: db.prepare('SELECT * FROM assignments WHERE id = ?').get(id), conflicts });
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
