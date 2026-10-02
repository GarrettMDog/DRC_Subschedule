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

export function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * The Monday that begins "week 0" — the week containing today, except when
 * today is itself a weekend, in which case week 0 rolls forward to next
 * week's Monday. Matches the rule the Jobs list already uses to decide
 * whether a Saturday/Sunday job belongs to the currently-active work week.
 * Exported (rather than kept private) so the Jobs list and anything that
 * needs to compute a weekOffset relative to it — like jumping there from
 * the Calendar — share one definition instead of two that could drift.
 */
export function getWeek0Monday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = ((5 - dayOfWeek) % 7 + 7) % 7;
  const friday = new Date(today);
  friday.setDate(friday.getDate() + daysUntilFriday);
  const monday = new Date(friday);
  monday.setDate(monday.getDate() - 4);
  return monday;
}

/**
 * Given a YYYY-MM-DD date, returns which weekOffset (0 = this week, 1 =
 * next week, -1 = last week, etc.) that date falls in — the Monday–Sunday
 * window it belongs to, relative to week 0 above. Used to jump the Jobs
 * list straight to the week containing a date clicked on the Calendar.
 */
export function getWeekOffsetForDate(dateString) {
  const week0Monday = getWeek0Monday();
  const target = parseLocalDate(dateString);
  const diffDays = Math.round((target - week0Monday) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
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

function ordinalSuffix(day) {
  if (day >= 11 && day <= 13) return 'th'; // 11th/12th/13th are the exception to the pattern below
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Formats a YYYY-MM-DD date string as a full section-header style date:
 * "Thursday, September 18th". Distinct from formatDate above — that one is
 * for compact inline references (mm/dd/yy or "Today"); this is specifically
 * for group/section headers where a fuller, more readable date reads better.
 */
export function formatDateHeader(dateString) {
  if (!dateString) return '';
  const date = parseLocalDate(dateString);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
  const month = date.toLocaleDateString(undefined, { month: 'long' });
  const day = date.getDate();
  return `${weekday}, ${month} ${day}${ordinalSuffix(day)}`;
}
