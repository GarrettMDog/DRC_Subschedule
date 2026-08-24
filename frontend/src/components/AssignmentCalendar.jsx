import { useMemo, useState } from 'react';
import { Button } from '@fluentui/react-components';
import { STATUS_HEX } from '../theme';

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

export default function AssignmentCalendar({ assignments }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

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

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          flexWrap: 'wrap',
          gap: 8
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

      <div className="calendar-grid">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday">
            {label}
          </div>
        ))}

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
              {visible.map((a) => (
                <div
                  key={a.id}
                  className="calendar-pill"
                  style={{ background: STATUS_HEX[a.status] || '#6B7280' }}
                  title={`${a.subcontractor_name} → ${a.job_name} (${a.status})`}
                >
                  {a.subcontractor_name}
                </div>
              ))}
              {extraCount > 0 && <div className="calendar-more">+{extraCount} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
