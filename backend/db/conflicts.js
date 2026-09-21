const db = require('./db');

// How close two same-day jobs' times need to be before flagging a
// scheduling conflict for the same sub. 4 hours is a reasonable default for
// concrete work — enough buffer for drive time and a job actually running
// long — but this is just a starting point, easy to tune if it's flagging
// too eagerly or missing real conflicts in practice.
const CONFLICT_WINDOW_MINUTES = 240;

function toMinutes(time) {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Returns any existing assignments for a subcontractor, on the same day as
 * [startDate, endDate], whose job's time-of-day is close enough to the new
 * assignment's job time to realistically clash. A sub can freely work
 * multiple jobs in a day — this only flags same-day work that's actually
 * close together in time, not same-day work generally. If either job
 * (the new one or an existing one) has no time set at all, there's nothing
 * to compare, so it's excluded rather than guessed at.
 *
 * This is a soft warning, not a hard block — office/PMs sometimes need to
 * double-book a sub on purpose. Callers decide whether to surface it as a
 * blocking confirmation.
 */
function findConflicts({ subcontractorId, jobId, startDate, endDate, excludeAssignmentId }) {
  const newJob = db.prepare('SELECT time FROM jobs WHERE id = ?').get(jobId);
  const newJobMinutes = toMinutes(newJob ? newJob.time : null);

  const rows = db
    .prepare(
      `SELECT a.*, j.name AS job_name, j.time AS job_time
       FROM assignments a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.subcontractor_id = ?
         AND a.status NOT IN ('declined', 'cancelled')
         AND a.id != COALESCE(?, -1)
         AND a.start_date <= ?
         AND a.end_date >= ?`
    )
    .all(subcontractorId, excludeAssignmentId || null, endDate, startDate);

  if (newJobMinutes === null) return [];

  return rows.filter((row) => {
    const existingMinutes = toMinutes(row.job_time);
    if (existingMinutes === null) return false;
    return Math.abs(newJobMinutes - existingMinutes) <= CONFLICT_WINDOW_MINUTES;
  });
}

module.exports = { findConflicts };
