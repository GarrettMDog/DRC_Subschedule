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
 * visual accent for jobs everywhere they appear (Jobs tab, Dashboard list
 * and calendar, a subcontractor's job history) — deliberately takes over
 * from status-based coloring for this accent, since materials-ordered is
 * the thing that needs to catch someone's eye at a glance.
 */
export function materialsOrderedColor(materialsOrdered) {
  return materialsOrdered ? '#1E7C4D' : '#B42318';
}
