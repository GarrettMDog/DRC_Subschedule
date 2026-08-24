const db = require('../db/db');

/**
 * Passwordless auth for subcontractors. No Entra account exists for them —
 * they access their schedule via a unique, persistent link (e.g.
 * https://app.example.com/my-schedule/:token). This middleware looks up the
 * subcontractor by that token and attaches it to req.subcontractor.
 *
 * Token lives in the URL path, not a header — subs are opening a link from
 * an email/text on their phone, not authenticating through a login screen.
 */
function requireSubToken(req, res, next) {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'Missing schedule token' });
  }

  const subcontractor = db
    .prepare('SELECT * FROM subcontractors WHERE link_token = ? AND active = 1')
    .get(token);

  if (!subcontractor) {
    return res.status(404).json({ error: 'Schedule link not found or inactive' });
  }

  req.subcontractor = subcontractor;
  next();
}

module.exports = requireSubToken;
