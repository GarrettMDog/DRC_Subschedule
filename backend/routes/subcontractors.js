const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db/db');

const router = express.Router();

// GET /api/subcontractors — full directory
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM subcontractors ORDER BY company_name COLLATE NOCASE')
    .all();
  res.json(rows);
});

// POST /api/subcontractors — add a new subcontractor, generates their link token
router.post('/', (req, res) => {
  const { company_name, trade, contact_name, email, phone } = req.body;

  if (!company_name) {
    return res.status(400).json({ error: 'company_name is required' });
  }

  const link_token = nanoid(24);

  const result = db
    .prepare(
      `INSERT INTO subcontractors (company_name, trade, contact_name, email, phone, link_token)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(company_name, trade || null, contact_name || null, email || null, phone || null, link_token);

  const created = db.prepare('SELECT * FROM subcontractors WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);

  // TODO: send the sub their schedule link by email here once an email
  // provider is wired up (e.g. https://app.example.com/my-schedule/{link_token}).
});

// PUT /api/subcontractors/:id — edit details or toggle active
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM subcontractors WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Subcontractor not found' });

  const {
    company_name = existing.company_name,
    trade = existing.trade,
    contact_name = existing.contact_name,
    email = existing.email,
    phone = existing.phone,
    active = existing.active
  } = req.body;

  db.prepare(
    `UPDATE subcontractors
     SET company_name = ?, trade = ?, contact_name = ?, email = ?, phone = ?, active = ?
     WHERE id = ?`
  ).run(company_name, trade, contact_name, email, phone, active ? 1 : 0, id);

  res.json(db.prepare('SELECT * FROM subcontractors WHERE id = ?').get(id));
});

module.exports = router;
