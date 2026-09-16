import { useEffect, useState } from 'react';
import {
  Button,
  Field,
  Dropdown,
  Option,
  Combobox,
  Input,
  Badge,
  MessageBar,
  MessageBarBody
} from '@fluentui/react-components';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import { materialsOrderedColor, formatJobType } from '../theme';
import { formatDateRange, formatDateHeader, formatTime } from '../dateUtils';
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
  const [labelMode, setLabelMode] = useState('subcontractor'); // 'subcontractor' | 'job'
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [subFilterId, setSubFilterId] = useState(null); // null = show everyone
  const [subFilterText, setSubFilterText] = useState('');

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

  // One sub per job, total — a job with any active assignment drops out of
  // the picker. Cancelled/declined don't count as "occupying" the job, so
  // it becomes available again once an assignment there is cancelled.
  const assignedJobIds = new Set(
    assignments.filter((a) => a.status !== 'cancelled' && a.status !== 'declined').map((a) => a.job_id)
  );
  const availableJobs = jobs.filter((j) => !assignedJobIds.has(j.id));

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
                placeholder={availableJobs.length === 0 ? 'No unassigned jobs' : 'Select a job'}
                value={availableJobs.find((j) => j.id === form.job_id)?.address || ''}
                onOptionSelect={(_, data) => setForm({ ...form, job_id: Number(data.optionValue) })}
              >
                {availableJobs.map((j) => (
                  <Option key={j.id} value={String(j.id)}>
                    {j.address}
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {view === 'calendar' && (
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
              )}
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

          {view === 'list' && (
            <div style={{ marginBottom: 12, maxWidth: 260 }}>
              <Combobox
                placeholder="Filter by subcontractor…"
                value={subFilterText}
                onInput={(e) => setSubFilterText(e.target.value)}
                onOptionSelect={(_, data) => {
                  setSubFilterId(data.optionValue === 'all' ? null : Number(data.optionValue));
                  setSubFilterText(data.optionValue === 'all' ? '' : data.optionText);
                }}
              >
                <Option value="all">All subcontractors</Option>
                {subcontractors
                  .filter((s) => s.company_name.toLowerCase().includes(subFilterText.toLowerCase()))
                  .map((s) => (
                    <Option key={s.id} value={String(s.id)} text={s.company_name}>
                      {s.company_name}
                    </Option>
                  ))}
              </Combobox>
            </div>
          )}

          {view === 'calendar' ? (
            <AssignmentCalendar
              assignments={assignments}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
              labelMode={labelMode}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(() => {
                // Master group: date. Sub-group: subcontractor. The array
                // already arrives sorted by [start_date, job time] from the
                // backend, and plain JS objects preserve insertion order for
                // string keys, so building groups this way naturally keeps
                // that same chronological order — no re-sorting needed.
                const visibleAssignments =
                  subFilterId === null
                    ? assignments
                    : assignments.filter((a) => a.subcontractor_id === subFilterId);

                const dateGroups = {};
                for (const a of visibleAssignments) {
                  if (!dateGroups[a.start_date]) dateGroups[a.start_date] = {};
                  if (!dateGroups[a.start_date][a.subcontractor_name]) {
                    dateGroups[a.start_date][a.subcontractor_name] = [];
                  }
                  dateGroups[a.start_date][a.subcontractor_name].push(a);
                }
                const dateKeys = Object.keys(dateGroups);

                if (dateKeys.length === 0) {
                  return <p>{subFilterId === null ? 'No assignments yet.' : 'No assignments match this filter.'}</p>;
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {Object.entries(dateGroups[dateKey]).map(([subName, subAssignments]) => (
                        <div key={subName}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--colorNeutralForeground2)',
                              marginBottom: 6
                            }}
                          >
                            {subName}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {subAssignments.map((a) => {
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
                                    <strong>
                                      {a.job_type ? `${formatJobType(a.job_type)} — ` : ''}
                                      {a.job_address}
                                    </strong>
                                    <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                                      {formatDateRange(a.start_date, a.end_date)}
                                      {a.job_time && ` · ${formatTime(a.job_time)}`}
                                    </div>
                                  </div>
                                  {a.status !== 'pending' && (
                                    <Badge color={STATUS_COLOR[a.status] || 'informative'}>{a.status}</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
