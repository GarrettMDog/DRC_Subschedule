import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@fluentui/react-components';
import { materialsOrderedColor, materialsOrderStatus } from '../theme';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_PILLS_PER_DAY = 3;

function toYMD(date) {
  // Local-time formatting (not toISOString) — avoids the classic UTC
  // off-by-one-day bug when the browser's timezone is behind UTC.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);

  const days = [];
  // 6 rows x 7 days covers every possible month layout.
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    days.push(date);
  }
  return days;
}

export default function AssignmentCalendar({ assignments, selectedJobId, onSelectJob }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const navRowRef = useRef(null);
  const weekdayScrollRef = useRef(null);
  const gridScrollRef = useRef(null);

  // Mirrors the grid's horizontal scroll position onto the weekday row's
  // own scroll container, keeping the two in sync. They have to be two
  // separate scroll containers rather than one shared one — an element
  // with overflow-x: auto forces its own overflow-y to compute as auto
  // too (a real CSS spec behavior), which would silently turn the grid's
  // scroll container into an unwanted vertical scroll container as well,
  // breaking position: sticky for anything inside it. Keeping the sticky
  // weekday row in its own separate scroll container, outside the grid's,
  // avoids that entirely.
  function handleGridScroll() {
    if (weekdayScrollRef.current && gridScrollRef.current) {
      weekdayScrollRef.current.scrollLeft = gridScrollRef.current.scrollLeft;
    }
  }

  // The month-nav row's height isn't fixed — "September 2026" plus three
  // buttons could wrap on a narrow screen — so the weekday labels row
  // (which sticks right below it) can't safely assume a hardcoded pixel
  // offset. Measuring the real rendered height, same approach used for
  // the app's own header elsewhere in this project.
  useEffect(() => {
    const el = navRowRef.current;
    if (!el) return;
    const updateHeight = () => {
      document.documentElement.style.setProperty('--calendar-nav-height', `${el.offsetHeight}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayYMD = toYMD(today);

  const days = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const assignmentsByDay = useMemo(() => {
    const map = {};
    for (const day of days) {
      const ymd = toYMD(day);
      map[ymd] = assignments.filter((a) => a.start_date <= ymd && a.end_date >= ymd);
    }
    return map;
  }, [days, assignments]);

  function goToPrevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function goToNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }
  function goToToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  // Clicking a pill highlights every other pill for that same job across the
  // whole month — clicking the same job again (or Clear) turns it back off.
  // Selection lives in the parent so the Dashboard's detail panel can share it.
  function togglePillSelection(assignment) {
    onSelectJob(selectedJobId === assignment.job_id ? null : assignment.job_id);
  }

  const selectedJob = selectedJobId ? assignments.find((a) => a.job_id === selectedJobId) : null;

  return (
    <div>
      <div
        ref={navRowRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          flexWrap: 'wrap',
          gap: 8,
          position: 'sticky',
          top: 'var(--header-height, 0px)',
          zIndex: 6,
          background: 'var(--colorNeutralBackground1)',
          paddingBottom: 8
        }}
      >
        <strong>{monthLabel}</strong>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="small" appearance="secondary" onClick={goToPrevMonth}>
            ← Prev
          </Button>
          <Button size="small" appearance="secondary" onClick={goToToday}>
            Today
          </Button>
          <Button size="small" appearance="secondary" onClick={goToNextMonth}>
            Next →
          </Button>
        </div>
      </div>

      {selectedJob && (
        <div className="calendar-job-banner">
          <span>
            Highlighting <strong>{selectedJob.job_address}</strong>
          </span>
          <Button size="small" appearance="subtle" onClick={() => onSelectJob(null)}>
            Clear
          </Button>
        </div>
      )}

      <div
        style={{
          position: 'sticky',
          top: 'calc(var(--header-height, 0px) + var(--calendar-nav-height, 0px))',
          zIndex: 5,
          background: 'var(--colorNeutralBackground1)'
        }}
      >
        <div ref={weekdayScrollRef} style={{ overflow: 'hidden' }}>
          <div className="calendar-weekday-row">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="calendar-weekday">
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="calendar-grid-scroll" ref={gridScrollRef} onScroll={handleGridScroll}>
        <div className="calendar-grid">
          {days.map((day) => {
            const ymd = toYMD(day);
            const isOutsideMonth = day.getMonth() !== month;
            const isToday = ymd === todayYMD;
            const dayAssignments = assignmentsByDay[ymd] || [];
            const visible = dayAssignments.slice(0, MAX_PILLS_PER_DAY);
            const extraCount = dayAssignments.length - visible.length;

            return (
              <div
                key={ymd}
                className={`calendar-day ${isOutsideMonth ? 'is-outside-month' : ''} ${
                  isToday ? 'is-today' : ''
                }`}
              >
                <div className="calendar-day-number">{day.getDate()}</div>
                {visible.map((a) => {
                  const isSelected = selectedJobId === a.job_id;
                  const isDimmed = selectedJobId !== null && !isSelected;
                  const orderStatus = materialsOrderStatus(a);
                  const orderStatusLabel = { none: 'not ordered', partial: 'partially ordered', full: 'ordered' }[
                    orderStatus
                  ];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`calendar-pill ${isSelected ? 'is-selected-job' : ''} ${
                        isDimmed ? 'is-dimmed' : ''
                      }`}
                      style={{ background: materialsOrderedColor(orderStatus) }}
                      title={`${a.subcontractor_name} → ${a.job_address} — materials ${orderStatusLabel}`}
                      onClick={() => togglePillSelection(a)}
                    >
                      {a.job_address}
                    </button>
                  );
                })}
                {extraCount > 0 && <div className="calendar-more">+{extraCount} more</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
