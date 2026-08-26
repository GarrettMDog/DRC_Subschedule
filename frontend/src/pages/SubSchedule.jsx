import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { subApi } from '../api/client';
import { STATUS_HEX } from '../theme';
import { formatDateRange } from '../dateUtils';

// Read-only for subs now — no confirm/decline action, so "pending" no longer
// means "awaiting a response." Relabeled to avoid implying something's
// outstanding when there's nothing left to do. Declined/confirmed are kept
// here too in case any assignment already has one of those statuses from
// before this change — nothing breaks for existing data.
const STATUS_DISPLAY = {
  pending: { label: 'Scheduled', color: 'success', hex: STATUS_HEX.confirmed },
  confirmed: { label: 'Confirmed', color: 'success', hex: STATUS_HEX.confirmed },
  declined: { label: 'Declined', color: 'danger', hex: STATUS_HEX.declined },
  cancelled: { label: 'Cancelled', color: 'subtle', hex: STATUS_HEX.cancelled }
};

export default function SubSchedule() {
  const { linkToken } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

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
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 4 }}>{data.subcontractor.company_name}</h2>
      <p style={{ marginTop: 0, color: 'var(--colorNeutralForeground3)' }}>Your upcoming schedule</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.assignments.map((a) => {
          const display = STATUS_DISPLAY[a.status] || { label: a.status, color: 'informative', hex: '#6B7280' };
          return (
            <div key={a.id} className="status-card" style={{ '--status-color': display.hex, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{a.job_name}</strong>
                  <div style={{ fontSize: 13, color: 'var(--colorNeutralForeground3)' }}>{a.job_address}</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{formatDateRange(a.start_date, a.end_date)}</div>
                </div>
                <Badge color={display.color}>{display.label}</Badge>
              </div>
            </div>
          );
        })}
        {data.assignments.length === 0 && <p>No assignments yet.</p>}
      </div>
    </div>
  );
}
