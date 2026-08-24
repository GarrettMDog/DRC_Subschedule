import { useEffect, useState } from 'react';
import { Button, Field, Input, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';

const EMPTY_FORM = { company_name: '', trade: '', contact_name: '', email: '', phone: '' };

export default function SubcontractorDirectory() {
  const { getToken } = useApiToken();
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  async function load() {
    try {
      setError(null);
      const token = await getToken();
      setSubs(await api.getSubcontractors(token));
    } catch (err) {
      setError(err.message || 'Something went wrong loading the directory.');
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
      await api.addSubcontractor(token, form);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.message || 'Could not add that subcontractor.');
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
          <h3 style={{ marginTop: 0 }}>Add a subcontractor</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gap: 12 }}>
            <Field label="Company name" required>
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </Field>
            <Field label="Trade">
              <Input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} />
            </Field>
            <Field label="Contact name">
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Button appearance="primary" type="submit">
              Add subcontractor
            </Button>
          </form>
        </section>

        <section>
          <h3 style={{ marginTop: 0 }}>Directory</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subs.map((s) => (
              <div key={s.id} className="status-card">
                <strong>{s.company_name}</strong> {s.trade && `· ${s.trade}`}
                <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                  {s.contact_name} {s.email && `· ${s.email}`} {s.phone && `· ${s.phone}`}
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <code
                    style={{
                      fontSize: 12,
                      background: 'var(--colorNeutralBackground3)',
                      padding: '4px 8px',
                      borderRadius: 4,
                      wordBreak: 'break-all'
                    }}
                  >
                    {`${window.location.origin}/my-schedule/${s.link_token}`}
                  </code>
                  <Button
                    size="small"
                    appearance="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/my-schedule/${s.link_token}`);
                      setCopiedId(s.id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                  >
                    {copiedId === s.id ? 'Copied!' : 'Copy link'}
                  </Button>
                </div>
              </div>
            ))}
            {subs.length === 0 && <p>No subcontractors yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
