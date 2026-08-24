const db = require('./db');

/**
 * Returns any existing assignments for a subcontractor whose date range
 * overlaps [startDate, endDate]. Excludes declined/cancelled assignments
 * (those don't hold a real slot) and, when updating, excludes the
 * assignment being edited.
 *
 * This is a soft warning, not a hard block — office/PMs sometimes need to
 * double-book a sub on purpose (e.g. a short site visit alongside a longer
 * job). Callers decide whether to surface it as a blocking confirmation.
 */
function findConflicts({ subcontractorId, startDate, endDate, excludeAssignmentId }) {
  const rows = db
    .prepare(
      `SELECT a.*, j.name AS job_name
       FROM assignments a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.subcontractor_id = ?
         AND a.status NOT IN ('declined', 'cancelled')
         AND a.id != COALESCE(?, -1)
         AND a.start_date <= ?
         AND a.end_date >= ?`
    )
    .all(subcontractorId, excludeAssignmentId || null, endDate, startDate);

  return rows;
}

module.exports = { findConflicts };
