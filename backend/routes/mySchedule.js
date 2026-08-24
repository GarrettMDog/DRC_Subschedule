const express = require('express');
const db = require('../db/db');
const requireSubToken = require('../middleware/requireSubToken');

// mergeParams so this router can read :token from the parent mount path
const router = express.Router({ mergeParams: true });

router.use(requireSubToken);

// GET /api/my-schedule/:token — this sub's assignments only
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, j.name AS job_name, j.address AS job_address
       FROM assignments a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.subcontractor_id = ?
       ORDER BY a.start_date`
    )
    .all(req.subcontractor.id);

  res.json({
    subcontractor: {
      company_name: req.subcontractor.company_name,
      contact_name: req.subcontractor.contact_name
    },
    assignments: rows
  });
});

// PUT /api/my-schedule/:token/assignments/:id — confirm or decline
router.put('/assignments/:id', (req, res) => {
  const { id } = req.params;
  const { status, decline_reason } = req.body;

  if (!['confirmed', 'declined'].includes(status)) {
    return res.status(400).json({ error: "status must be 'confirmed' or 'declined'" });
  }

  const assignment = db
    .prepare('SELECT * FROM assignments WHERE id = ? AND subcontractor_id = ?')
    .get(id, req.subcontractor.id);

  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  db.prepare(
    `UPDATE assignments
     SET status = ?, decline_reason = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(status, status === 'declined' ? decline_reason || null : null, id);

  res.json(db.prepare('SELECT * FROM assignments WHERE id = ?').get(id));

  // TODO: notify the office/PM when a sub confirms or declines, once a
  // notification channel (email/Teams webhook) is wired up.
});

module.exports = router;
