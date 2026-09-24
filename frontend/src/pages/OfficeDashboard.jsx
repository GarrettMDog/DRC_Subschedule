import { useEffect, useState } from 'react';
import { MessageBar, MessageBarBody } from '@fluentui/react-components';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import AssignmentCalendar from '../components/AssignmentCalendar';

export default function OfficeDashboard() {
  const { getToken } = useApiToken();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

      <AssignmentCalendar assignments={assignments} selectedJobId={selectedJobId} onSelectJob={setSelectedJobId} />
    </div>
  );
}
