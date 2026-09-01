/**
 * Formats a YYYY-MM-DD date string for display: "Today" if it matches the
 * current date, otherwise mm/dd/yy. Same display convention as Bedrock's
 * dateUtils, for consistency across tools.
 */
export function formatDate(dateString) {
  if (!dateString) return '';

  if (dateString === toYMD(new Date())) return 'Today';

  // Split the string directly rather than `new Date(dateString)` — the
  // latter parses as UTC midnight, which can silently shift a day depending
  // on the browser's local timezone offset (the same class of bug the
  // calendar component already guards against).
  const [year, month, day] = dateString.split('-');
  return `${month}/${day}/${year.slice(2)}`;
}

/**
 * Formats a date range for display. Collapses to a single formatted date
 * when start and end are the same day (a one-day job/assignment), rather
 * than showing a redundant "08/24/26 – 08/24/26".
 */
export function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '';
  if (startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

/**
 * Parses a YYYY-MM-DD string into a local-time Date object (midnight local,
 * not UTC). Useful when something downstream (like an Excel export) needs a
 * real Date instance rather than a formatted display string.
 */
export function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a SQLite `datetime('now')` timestamp (e.g. "2026-08-28 14:32:10")
 * for display. Different from formatDate/formatDateRange above — those
 * handle plain YYYY-MM-DD dates with no time component and no timezone
 * concerns. This one has both: SQLite's datetime('now') is UTC, so it must
 * be parsed as UTC explicitly (not as local time, which `new Date(str)`
 * would otherwise do inconsistently), then rendered in the viewer's own
 * local time.
 */
export function formatDateTime(sqliteTimestamp) {
  if (!sqliteTimestamp) return null;
  const utcDate = new Date(sqliteTimestamp.replace(' ', 'T') + 'Z');
  return utcDate.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Formats an HTML `<input type="time">` value ("HH:MM", 24-hour) as a
 * friendly "h:mm AM/PM" string. Not a timestamp — no timezone conversion
 * involved, same as start_date/end_date aren't timezone-converted. It's a
 * plain wall-clock time (e.g. "job starts at 10am"), stored and displayed
 * as-is regardless of who's viewing it or from where.
 */
export function formatTime(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}
