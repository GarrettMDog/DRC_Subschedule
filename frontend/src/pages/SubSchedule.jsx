import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageBar, MessageBarBody } from '@fluentui/react-components';
import { subApi } from '../api/client';
import { formatJobType, formatMaterials, materialsOrderStatus } from '../theme';
import { formatTime, formatDateHeader, toYMD } from '../dateUtils';
import LeafIcon from '../components/LeafIcon';

// Every assignment that reaches this page is already active (the backend
// only sends current/future, non-cancelled/declined ones) — so there's
// nothing left to distinguish with a status badge or a varying border
// color. One consistent green for every card, same green the old
// "Scheduled"/"Confirmed" states already shared.
const ACTIVE_STATUS_COLOR = '#1E7C4D';

export default function SubSchedule() {
  const { linkToken } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // Which assignment's notes are currently expanded, if any — read-only
  // reveal, not an edit surface. Only ever set for assignments whose job
  // actually has notes; a card with nothing to show just isn't clickable.
  const [expandedId, setExpandedId] = useState(null);

  async function load() {
    try {
      setData(await subApi.getMySchedule(linkToken));
    } catch (err) {
      setError('This schedule link isn\u2019t valid. Check the link and try again, or reach out to your contact.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  if (!data) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 4 }}>{data.subcontractor.company_name}</h2>
      <p style={{ marginTop: 0, color: 'var(--colorNeutralForeground3)' }}>Your upcoming schedule</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {(() => {
          // Grouped by date only — this page always shows exactly one
          // subcontractor's own assignments, so a subcontractor sub-group
          // would just repeat their own name under every date for no reason.
          // Pre-seeded with the next 28 days so open days show too, not
          // just days that already have something booked — same treatment
          // as the internal Jobs tab and the office-facing sub profile view.
          const dateGroups = {};
          for (let i = 0; i < 28; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            dateGroups[toYMD(d)] = [];
          }
          for (const a of data.assignments) {
            if (!dateGroups[a.start_date]) dateGroups[a.start_date] = [];
            dateGroups[a.start_date].push(a);
          }
          const dateKeys = Object.keys(dateGroups).sort();

          if (data.assignments.length === 0 && dateKeys.every((d) => dateGroups[d].length === 0)) {
            return <p>No assignments yet.</p>;
          }

          return dateKeys.map((dateKey) => (
            <div key={dateKey}>
              <h4
                style={{
                  margin: '0 0 10px',
                  paddingBottom: 6,
                  borderBottom: '1px solid var(--colorNeutralStroke2)'
                }}
              >
                {formatDateHeader(dateKey)}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dateGroups[dateKey].length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--colorNeutralForeground3)' }}>
                    Nothing scheduled yet.
                  </p>
                ) : (
                  dateGroups[dateKey].map((a) => {
                  // Same yardage @ time + materials formatting as the
                  // internal Jobs tab row, and the same materials-ordered
                  // status wording — this page should read as identical to
                  // that view, just without any way to edit anything.
                  const orderStatus = materialsOrderStatus({
                    materials: a.job_materials,
                    ordered_materials: a.job_ordered_materials
                  });
                  const orderStatusText = {
                    none: 'Materials pending',
                    partial: 'Some materials ordered',
                    full: 'Materials ordered'
                  }[orderStatus];

                  const yardageTimeParts = [];
                  if (a.job_yardage) yardageTimeParts.push(`${a.job_yardage} yards`);
                  if (a.job_time) yardageTimeParts.push(formatTime(a.job_time));
                  const yardageTimeText = yardageTimeParts.join(' @ ');

                  const parenParts = [];
                  if (yardageTimeText) parenParts.push(yardageTimeText);
                  if (a.job_materials) parenParts.push(formatMaterials(a.job_materials));
                  const parenText = parenParts.length > 0 ? ` (${parenParts.join(', ')})` : '';

                  const hasNotes = !!a.job_notes;
                  const isExpanded = expandedId === a.id;

                  return (
                    <div
                      key={a.id}
                      className="status-card"
                      style={{
                        '--status-color': ACTIVE_STATUS_COLOR,
                        padding: 14,
                        position: 'relative',
                        cursor: hasNotes ? 'pointer' : 'default'
                      }}
                      onClick={hasNotes ? () => setExpandedId(isExpanded ? null : a.id) : undefined}
                    >
                      {hasNotes && (
                        <LeafIcon
                          size={13}
                          title="Has notes — tap to view"
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 14,
                            color: 'var(--colorNeutralForeground3)'
                          }}
                        />
                      )}
                      <div style={{ paddingRight: hasNotes ? 20 : 0 }}>
                        <strong>
                          {a.job_type ? `${formatJobType(a.job_type)} — ` : ''}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              a.job_address
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'inherit', textDecoration: 'underline' }}
                          >
                            {a.job_address}
                          </a>
                          {parenText}
                        </strong>
                        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)', marginTop: 4 }}>
                          {a.job_materials ? orderStatusText : ''}
                        </div>
                      </div>
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: '1px solid var(--colorNeutralStroke2)',
                            fontSize: 13,
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {a.job_notes}
                        </div>
                      )}
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
