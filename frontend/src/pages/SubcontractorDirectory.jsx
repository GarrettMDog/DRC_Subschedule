import { useEffect, useState } from 'react';
import { Button, Field, Input } from '@fluentui/react-components';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';

const EMPTY_FORM = { company_name: '', trade: '', contact_name: '', email: '', phone: '' };

export default function SubcontractorDirectory() {
  const { getToken } = useApiToken();
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = await getToken();
    setSubs(await api.getSubcontractors(token));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const token = await getToken();
    await api.addSubcontractor(token, form);
    setForm(EMPTY_FORM);
    await load();
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section>
        <h3>Add a subcontractor</h3>
        <form onSubmit={handleAdd} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
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
        <h3>Directory</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {subs.map((s) => (
            <div
              key={s.id}
              style={{ border: '1px solid var(--colorNeutralStroke2)', borderRadius: 8, padding: 12 }}
            >
              <strong>{s.company_name}</strong> {s.trade && `· ${s.trade}`}
              <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                {s.contact_name} {s.email && `· ${s.email}`} {s.phone && `· ${s.phone}`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)', marginTop: 4 }}>
                Schedule link: /my-schedule/{s.link_token}
              </div>
            </div>
          ))}
          {subs.length === 0 && <p>No subcontractors yet.</p>}
        </div>
      </section>
    </div>
  );
}
