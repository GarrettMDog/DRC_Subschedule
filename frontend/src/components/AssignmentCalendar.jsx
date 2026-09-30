import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Popover, PopoverSurface } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import { materialsOrderedColor, materialsOrderStatus, formatJobType, formatMaterials } from '../theme';
import { formatDate, formatTime } from '../dateUtils';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_PILLS_PER_DAY = 3;
const MOBILE_BREAKPOINT = 600;

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

// The four rows shared by both the desktop popover and the mobile card —
// same content either way, just a different shell around it.
function JobDetailRows({ assignment }) {
  const whatParts = [];
  if (assignment.job_type) whatParts.push(formatJobType(assignment.job_type));
  if (assignment.job_yardage) whatParts.push(`${assignment.job_yardage} yards`);
  if (assignment.materials) whatParts.push(formatMaterials(assignment.materials));
  const whatText = whatParts.join(' – ');

  const whenParts = [formatDate(assignment.start_date)];
  if (assignment.job_time) whenParts.push(formatTime(assignment.job_time));
  const whenText = whenParts.join(', ');

  const rows = [
    { label: 'Who', value: assignment.subcontractor_name },
    { label: 'What', value: whatText },
    { label: 'When', value: whenText },
    {
      label: 'Where',
      value: (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(assignment.job_address)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          {assignment.job_address}
        </a>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(
        (row) =>
          row.value && (
            <div key={row.label}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--colorNeutralForeground3)'
                }}
              >
                {row.label}
              </div>
              <div style={{ fontSize: 14 }}>{row.value}</div>
            </div>
          )
      )}
    </div>
  );
}

export default function AssignmentCalendar({ assignments }) {
  const today = new Date();
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [detailAssignment, setDetailAssignment] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  const navRowRef = useRef(null);
  const weekdayScrollRef = useRef(null);
  const gridScrollRef = useRef(null);

  useEffect(() => {
    function updateIsMobile() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

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

  function openDetail(assignment, el) {
    setDetailAssignment(assignment);
    setAnchorEl(el);
  }
  function closeDetail() {
    setDetailAssignment(null);
    setAnchorEl(null);
  }
  function goToEdit() {
    if (!detailAssignment) return;
    navigate(`/?editJobId=${detailAssignment.job_id}`);
  }

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
                  const orderStatus = materialsOrderStatus(a);
                  const orderStatusLabel = { none: 'not ordered', partial: 'partially ordered', full: 'ordered' }[
                    orderStatus
                  ];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className="calendar-pill"
                      style={{ background: materialsOrderedColor(orderStatus) }}
                      title={`${a.subcontractor_name} → ${a.job_address} — materials ${orderStatusLabel}`}
                      onClick={(e) => openDetail(a, e.currentTarget)}
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

      {/* Desktop: a true floating popover, anchored to whichever pill was
          clicked. Mobile: a full-width card instead — a floating popover
          has nowhere near enough room to work with next to a small pill
          on a narrow phone screen. */}
      {!isMobile && (
        <Popover
          open={!!detailAssignment}
          onOpenChange={(_, data) => {
            if (!data.open) closeDetail();
          }}
          positioning={{ target: anchorEl, position: 'after', align: 'top' }}
          withArrow
        >
          <PopoverSurface style={{ maxWidth: 280, padding: 16 }}>
            {detailAssignment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <JobDetailRows assignment={detailAssignment} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button size="small" appearance="secondary" onClick={goToEdit}>
                    Edit
                  </Button>
                </div>
              </div>
            )}
          </PopoverSurface>
        </Popover>
      )}

      {isMobile && detailAssignment && (
        <div
          onClick={closeDetail}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'var(--colorNeutralBackground1)',
              borderRadius: '12px 12px 0 0',
              padding: 20,
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                size="small"
                appearance="subtle"
                icon={<Dismiss20Regular />}
                aria-label="Close"
                onClick={closeDetail}
              />
            </div>
            <JobDetailRows assignment={detailAssignment} />
            <Button appearance="primary" onClick={goToEdit}>
              Edit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
