import { createLightTheme } from '@fluentui/react-components';

// A warm amber/construction-safety accent — deliberately not Fluent's default
// blue, and not the generic cream+terracotta pairing common in AI-generated
// UI. Hand-generated 16-step brand ramp (Fluent's convention: 10 = lightest
// tint, 160 = darkest shade, ~80-90 is the "true" saturated brand tone used
// for solid buttons and active states).
const brand = {
  10: '#F9F8F5',
  20: '#F5F1EA',
  30: '#F1E8DA',
  40: '#EFDFC8',
  50: '#EDD3AB',
  60: '#EEC78B',
  70: '#EFB761',
  80: '#F2A736',
  90: '#F2960D',
  100: '#D8870E',
  110: '#BD770F',
  120: '#A16812',
  130: '#815513',
  140: '#614214',
  150: '#3F2D12',
  160: '#21190D'
};

export const subscheduleTheme = createLightTheme(brand);

// Status colors used consistently across the dashboard list, the calendar,
// and the sub-facing schedule page — kept outside the Fluent theme since
// these are semantic (pending/confirmed/declined/cancelled), not brand.
export const STATUS_HEX = {
  pending: '#9CA3AF', // neutral — no longer actionable, just the default state
  confirmed: '#1E7C4D', // green — settled, good to go
  declined: '#B42318', // red — needs office attention
  cancelled: '#6B7280' // neutral gray — inactive, out of the way
};

// Jobs have their own, separate status vocabulary from assignments.
export const JOB_STATUS_HEX = {
  active: '#1E7C4D',
  completed: '#6B7280',
  cancelled: '#B42318'
};

/**
 * Red until materials are marked ordered, then green. Used as the primary
 * visual accent for jobs everywhere they appear (Jobs tab, Calendar,
 * a subcontractor's job history). Takes a plain boolean — callers compute
 * that boolean via isFullyOrdered() below, which is what actually decides
 * whether a job counts as "ordered" now.
 */
export function materialsOrderedColor(isOrdered) {
  return isOrdered ? '#1E7C4D' : '#B42318';
}

/**
 * Generic helpers for a comma-separated multi-value column (a fixed, tiny
 * set of options where more than one can apply — job type, materials).
 * Formats "Prep,Pour" -> "Prep + Pour"; parses it back into an array for
 * populating a multiselect/checkbox control.
 */
function formatMultiValue(value) {
  if (!value) return '';
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .join(' + ');
}

function parseMultiValue(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * A job can have more than one type (e.g. both Prep and Pour). Stored as a
 * plain comma-separated string in the `job_type` column — no schema change
 * needed for what's a fixed, tiny set of values (Box/Prep/Pour).
 */
export function formatJobType(jobType) {
  return formatMultiValue(jobType);
}

export function parseJobTypes(jobType) {
  return parseMultiValue(jobType);
}

/**
 * A job can need more than one material (e.g. both Concrete and Pump).
 * Stored as a comma-separated string in the `materials` column — which
 * materials this job needs, not whether they've been ordered.
 */
export function formatMaterials(materials) {
  return formatMultiValue(materials);
}

export function parseMaterials(materials) {
  return parseMultiValue(materials);
}

/**
 * Replaces the old single "materials ordered" boolean. Each needed material
 * now has its own ordered/not-ordered status, tracked as a second
 * comma-separated list (`ordered_materials`) of which needed materials have
 * been marked ordered so far. A job counts as fully ordered only once every
 * material it needs also appears in that ordered list — red otherwise.
 * A job with no materials specified at all is treated as not ordered
 * (there's nothing to vacuously satisfy; it just hasn't been set up yet).
 */
export function isFullyOrdered(job) {
  const needed = parseMaterials(job.materials);
  if (needed.length === 0) return false;
  const ordered = parseMaterials(job.ordered_materials);
  return needed.every((m) => ordered.includes(m));
}
