import { useEffect, useState } from 'react';
import { Button, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import AssignmentCalendar from '../components/AssignmentCalendar';

export default function OfficeDashboard() {
  const { getToken } = useApiToken();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [labelMode, setLabelMode] = useState('subcontractor'); // 'subcontractor' | 'job'
  const [selectedJobId, setSelectedJobId] = useState(null);

  async function loadAll() {
    try {
      setError(null);
      const token = await getToken();
      const a = await api.getAssignments(token);
      setAssignments(a);
    } catch (err) {
      setError(err.message || 'Something went wrong loading the calendar.');
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
        <h3 style={{ margin: 0 }}>Calendar</h3>
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
      </div>

      <AssignmentCalendar
        assignments={assignments}
        selectedJobId={selectedJobId}
        onSelectJob={setSelectedJobId}
        labelMode={labelMode}
      />
    </div>
  );
}
