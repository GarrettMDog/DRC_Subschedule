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

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
