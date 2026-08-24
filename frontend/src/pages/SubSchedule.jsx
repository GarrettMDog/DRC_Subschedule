import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Badge, Textarea, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { subApi } from '../api/client';
import { STATUS_HEX } from '../theme';

const STATUS_COLOR = {
  pending: 'warning',
  confirmed: 'success',
  declined: 'danger',
  cancelled: 'subtle'
};

export default function SubSchedule() {
  const { linkToken } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

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

  async function handleConfirm(id) {
    await subApi.respondToAssignment(linkToken, id, 'confirmed');
    await load();
  }

  async function handleDecline(id) {
    await subApi.respondToAssignment(linkToken, id, 'declined', declineReason);
    setDecliningId(null);
    setDeclineReason('');
    await load();
  }

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
        {data.assignments.map((a) => (
          <div
            key={a.id}
            className="status-card"
            style={{ '--status-color': STATUS_HEX[a.status] || '#6B7280', padding: 14 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong>{a.job_name}</strong>
                <div style={{ fontSize: 13, color: 'var(--colorNeutralForeground3)' }}>{a.job_address}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {a.start_date} – {a.end_date}
                </div>
              </div>
              <Badge color={STATUS_COLOR[a.status] || 'informative'}>{a.status}</Badge>
            </div>

            {a.status === 'pending' && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="large" appearance="primary" onClick={() => handleConfirm(a.id)}>
                  Confirm
                </Button>
                <Button size="large" appearance="secondary" onClick={() => setDecliningId(a.id)}>
                  Decline
                </Button>
              </div>
            )}

            {decliningId === a.id && (
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <Textarea
                  placeholder="Optional: let them know why (e.g. schedule conflict)"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button appearance="primary" onClick={() => handleDecline(a.id)}>
                    Send decline
                  </Button>
                  <Button appearance="subtle" onClick={() => setDecliningId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {data.assignments.length === 0 && <p>No assignments yet.</p>}
      </div>
    </div>
  );
}
