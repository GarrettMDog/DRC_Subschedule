import { useEffect, useState } from 'react';
import { Button, Field, Input, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';

const EMPTY_FORM = { name: '', address: '', start_date: '', end_date: '' };

export default function JobList() {
  const { getToken } = useApiToken();
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setError(null);
      const token = await getToken();
      setJobs(await api.getJobs(token));
    } catch (err) {
      setError(err.message || 'Something went wrong loading the job list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    try {
      const token = await getToken();
      await api.addJob(token, form);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.message || 'Could not add that job.');
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

      <div className="page-layout">
        <section>
          <h3 style={{ marginTop: 0 }}>Add a job</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gap: 12 }}>
            <Field label="Job name" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
              Add job
            </Button>
          </form>
        </section>

        <section>
          <h3 style={{ marginTop: 0 }}>Jobs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {jobs.map((j) => (
              <div key={j.id} className="status-card">
                <strong>{j.name}</strong>
                <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                  {j.address} · {j.start_date} – {j.end_date} · {j.status}
                </div>
              </div>
            ))}
            {jobs.length === 0 && <p>No jobs yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
