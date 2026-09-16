import { useEffect, useState } from 'react';
import { Button, Option, Combobox, Badge, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import { materialsOrderedColor, formatJobType } from '../theme';
import { formatDateRange, formatDateHeader, formatTime, toYMD } from '../dateUtils';
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
      const [a, s] = await Promise.all([api.getAssignments(token), api.getSubcontractors(token)]);
      setAssignments(a);
      setSubcontractors(s);
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

  if (loading) return <p>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

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
            <Button size="small" appearance={view === 'list' ? 'primary' : 'secondary'} onClick={() => setView('list')}>
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
            // List view only shows today and future — anything fully
            // concluded (end_date before today) drops off. Filtered here
            // in the frontend, not the backend query, since Calendar
            // view uses that same unfiltered data and should keep
            // showing history when you navigate to a past month.
            const todayYMD = toYMD(new Date());
            const visibleAssignments = assignments
              .filter((a) => a.end_date >= todayYMD)
              .filter((a) => subFilterId === null || a.subcontractor_id === subFilterId);

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
              let message = 'No assignments yet.';
              if (assignments.length > 0) {
                message =
                  subFilterId === null
                    ? 'Nothing upcoming — the schedule is clear from here on.'
                    : 'No upcoming assignments match this filter.';
              }
              return <p>{message}</p>;
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
    </div>
  );
}
