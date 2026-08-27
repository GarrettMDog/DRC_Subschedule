import { useEffect, useState } from 'react';
import {
  Button,
  Field,
  Dropdown,
  Option,
  Input,
  Badge,
  Checkbox,
  MessageBar,
  MessageBarBody
} from '@fluentui/react-components';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import { STATUS_HEX, materialsOrderedColor } from '../theme';
import { formatDateRange } from '../dateUtils';
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
  const [view, setView] = useState('calendar'); // 'list' | 'calendar'
  const [labelMode, setLabelMode] = useState('subcontractor'); // 'subcontractor' | 'job'
  const [selectedJobId, setSelectedJobId] = useState(null);

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

  // One-field quick toggle, saved immediately — no separate "Save" button
  // needed for just flipping this checkbox from the dashboard panel.
  async function toggleMaterialsOrdered(job) {
    setError(null);
    try {
      const token = await getToken();
      await api.updateJob(token, job.id, { ...job, materials_ordered: !job.materials_ordered });
      await loadAll();
    } catch (err) {
      setError(err.message || 'Could not update materials-ordered status.');
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

          {selectedJobId &&
            (() => {
              const selectedJobDetails = jobs.find((j) => j.id === selectedJobId);
              const jobAssignments = assignments.filter((a) => a.job_id === selectedJobId);
              if (!selectedJobDetails) return null;
              return (
                <div style={{ marginTop: 24 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8
                    }}
                  >
                    <h4 style={{ margin: 0 }}>{selectedJobDetails.name}</h4>
                    <Button size="small" appearance="subtle" onClick={() => setSelectedJobId(null)}>
                      Clear
                    </Button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--colorNeutralForeground3)', marginTop: 4, marginBottom: 12 }}>
                    {selectedJobDetails.address && <>{selectedJobDetails.address}<br /></>}
                    {selectedJobDetails.status}
                  </div>

                  <Checkbox
                    label="Materials ordered"
                    checked={!!selectedJobDetails.materials_ordered}
                    onChange={() => toggleMaterialsOrdered(selectedJobDetails)}
                    style={{ marginBottom: 16 }}
                  />

                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    Assigned subcontractors ({jobAssignments.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {jobAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="status-card"
                        style={{ '--status-color': STATUS_HEX[a.status] || '#6B7280' }}
                      >
                        <strong>{a.subcontractor_name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)', marginTop: 2 }}>
                          {formatDateRange(a.start_date, a.end_date)}
                        </div>
                        {a.status !== 'pending' && (
                          <Badge color={STATUS_COLOR[a.status] || 'informative'} style={{ marginTop: 6 }}>
                            {a.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {jobAssignments.length === 0 && (
                      <p style={{ fontSize: 13, color: 'var(--colorNeutralForeground3)' }}>
                        No subcontractors assigned yet.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  size="small"
                  appearance={labelMode === 'subcontractor' ? 'primary' : 'secondary'}
                  onClick={() => setLabelMode('subcontractor')}
                >
                  Subcontractor
                </Button>
                <Button
                  size="small"
                  appearance={labelMode === 'job' ? 'primary' : 'secondary'}
                  onClick={() => setLabelMode('job')}
                >
                  Job
                </Button>
              </div>
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
          </div>

          {view === 'calendar' ? (
            <AssignmentCalendar
              assignments={assignments}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
              labelMode={labelMode}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignments.map((a) => {
                const isSelected = selectedJobId === a.job_id;
                const isDimmed = selectedJobId !== null && !isSelected;
                return (
                  <div
                    key={a.id}
                    className="status-card"
                    style={{
                      '--status-color': materialsOrderedColor(a.materials_ordered),
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                      cursor: 'pointer',
                      opacity: isDimmed ? 0.4 : 1,
                      boxShadow: isSelected
                        ? '0 0 0 2px white, 0 0 0 4px var(--colorNeutralForeground1)'
                        : 'none'
                    }}
                    onClick={() => setSelectedJobId(isSelected ? null : a.job_id)}
                  >
                    <div>
                      {labelMode === 'job' ? (
                        <>
                          <strong>{a.job_name}</strong> → {a.subcontractor_name}
                        </>
                      ) : (
                        <>
                          <strong>{a.subcontractor_name}</strong> → {a.job_name}
                        </>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                        {formatDateRange(a.start_date, a.end_date)} · {a.job_address}
                      </div>
                    </div>
                    {a.status !== 'pending' && (
                      <Badge color={STATUS_COLOR[a.status] || 'informative'}>{a.status}</Badge>
                    )}
                  </div>
                );
              })}
              {assignments.length === 0 && <p>No assignments yet.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
