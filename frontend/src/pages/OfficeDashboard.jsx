import { useEffect, useState } from 'react';
import {
  Button,
  Field,
  Dropdown,
  Option,
  Input,
  Badge,
  MessageBar,
  MessageBarBody
} from '@fluentui/react-components';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import { STATUS_HEX } from '../theme';
import AssignmentCalendar from '../components/AssignmentCalendar';

const STATUS_COLOR = {
  pending: 'warning',
  confirmed: 'success',
  declined: 'danger',
  cancelled: 'subtle'
};

export default function OfficeDashboard() {
  const { getToken } = useApiToken();
  const [assignments, setAssignments] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ subcontractor_id: '', job_id: '', start_date: '', end_date: '' });
  const [conflictWarning, setConflictWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'calendar'

  async function loadAll() {
    try {
      setError(null);
      const token = await getToken();
      const [a, s, j] = await Promise.all([
        api.getAssignments(token),
        api.getSubcontractors(token),
        api.getJobs(token)
      ]);
      setAssignments(a);
      setSubcontractors(s);
      setJobs(j);
    } catch (err) {
      setError(err.message || 'Something went wrong loading the dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAssign(e) {
    e.preventDefault();
    setConflictWarning(null);
    setError(null);
    try {
      const token = await getToken();
      const { conflicts } = await api.addAssignment(token, form);

      if (conflicts.length > 0) {
        setConflictWarning(
          `Heads up: this sub already has ${conflicts.length} overlapping assignment(s) in that window. Saved anyway — review below.`
        );
      }

      setForm({ subcontractor_id: '', job_id: '', start_date: '', end_date: '' });
      await loadAll();
    } catch (err) {
      setError(err.message || 'Could not save that assignment.');
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <div className="dashboard-layout">
        <section>
          <h3 style={{ marginTop: 0 }}>Assign a subcontractor</h3>
          {conflictWarning && (
            <MessageBar intent="warning" style={{ marginBottom: 12 }}>
              <MessageBarBody>{conflictWarning}</MessageBarBody>
            </MessageBar>
          )}
          <form onSubmit={handleAssign} style={{ display: 'grid', gap: 12 }}>
            <Field label="Subcontractor">
              <Dropdown
                placeholder="Select a subcontractor"
                value={subcontractors.find((s) => s.id === form.subcontractor_id)?.company_name || ''}
                onOptionSelect={(_, data) => setForm({ ...form, subcontractor_id: Number(data.optionValue) })}
              >
                {subcontractors.map((s) => (
                  <Option key={s.id} value={String(s.id)}>
                    {s.company_name}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field label="Job">
              <Dropdown
                placeholder="Select a job"
                value={jobs.find((j) => j.id === form.job_id)?.name || ''}
                onOptionSelect={(_, data) => setForm({ ...form, job_id: Number(data.optionValue) })}
              >
                {jobs.map((j) => (
                  <Option key={j.id} value={String(j.id)}>
                    {j.name}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field label="Start date">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </Field>

            <Field label="End date">
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </Field>

            <Button appearance="primary" type="submit">
              Assign
            </Button>
          </form>
        </section>

        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <h3 style={{ margin: 0 }}>All assignments</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                size="small"
                appearance={view === 'list' ? 'primary' : 'secondary'}
                onClick={() => setView('list')}
              >
                List
              </Button>
              <Button
                size="small"
                appearance={view === 'calendar' ? 'primary' : 'secondary'}
                onClick={() => setView('calendar')}
              >
                Calendar
              </Button>
            </div>
          </div>

          {view === 'calendar' ? (
            <AssignmentCalendar assignments={assignments} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="status-card"
                  style={{
                    '--status-color': STATUS_HEX[a.status] || '#6B7280',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <strong>{a.subcontractor_name}</strong> → {a.job_name}
                    <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                      {a.start_date} – {a.end_date} · {a.job_address}
                    </div>
                  </div>
                  <Badge color={STATUS_COLOR[a.status] || 'informative'}>{a.status}</Badge>
                </div>
              ))}
              {assignments.length === 0 && <p>No assignments yet.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
