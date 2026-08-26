import { useEffect, useState } from 'react';
import {
  Button,
  Field,
  Input,
  Badge,
  MessageBar,
  MessageBarBody,
  OverlayDrawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle
} from '@fluentui/react-components';
import { ChevronRight20Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import { materialsOrderedColor } from '../theme';
import { formatDateRange } from '../dateUtils';

const EMPTY_FORM = { company_name: '', trade: '', contact_name: '', email: '', phone: '' };

const STATUS_COLOR = {
  pending: 'warning',
  confirmed: 'success',
  declined: 'danger',
  cancelled: 'subtle'
};

export default function SubcontractorDirectory() {
  const { getToken } = useApiToken();
  const [subs, setSubs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Drawer state: 'create' shows the add form (small side panel), a sub
  // object shows its full-screen detail view (schedule link + their jobs).
  const [drawerContent, setDrawerContent] = useState(null);

  async function load() {
    try {
      setError(null);
      const token = await getToken();
      const [subsData, assignmentsData] = await Promise.all([
        api.getSubcontractors(token),
        api.getAssignments(token)
      ]);
      setSubs(subsData);
      setAssignments(assignmentsData);
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
      setDrawerContent(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not add that subcontractor.');
    }
  }

  function copyLink(sub) {
    navigator.clipboard.writeText(`${window.location.origin}/my-schedule/${sub.link_token}`);
    setCopiedId(sub.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (loading) return <p>Loading…</p>;

  const isCreating = drawerContent === 'create';
  const viewingSub = drawerContent && drawerContent !== 'create' ? drawerContent : null;
  const subJobs = viewingSub ? assignments.filter((a) => a.subcontractor_id === viewingSub.id) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Subcontractors</h3>
        <Button appearance="primary" onClick={() => setDrawerContent('create')}>
          + Add subcontractor
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {subs.map((s) => (
          <div key={s.id} className="list-row" onClick={() => setDrawerContent(s)}>
            <div>
              <strong>{s.company_name}</strong>
              {s.trade && (
                <span style={{ color: 'var(--colorNeutralForeground3)', fontSize: 13 }}> · {s.trade}</span>
              )}
            </div>
            <ChevronRight20Regular />
          </div>
        ))}
        {subs.length === 0 && <p>No subcontractors yet. Click "Add subcontractor" to create one.</p>}
      </div>

      {/* Small side panel for creating a new subcontractor */}
      <OverlayDrawer
        open={isCreating}
        onOpenChange={(_, { open }) => !open && setDrawerContent(null)}
        position="start"
        size="small"
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={() => setDrawerContent(null)} />
            }
          >
            Add a subcontractor
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
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
        </DrawerBody>
      </OverlayDrawer>

      {/* Full-screen detail view: schedule link up top, then every job
          this subcontractor has ever been assigned to. */}
      <OverlayDrawer
        open={viewingSub !== null}
        onOpenChange={(_, { open }) => !open && setDrawerContent(null)}
        position="start"
        size="full"
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={() => setDrawerContent(null)} />
            }
          >
            {viewingSub?.company_name}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {viewingSub && (
            <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="status-card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)', marginBottom: 6 }}>
                  Schedule link — send this to {viewingSub.company_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <code
                    style={{
                      fontSize: 13,
                      background: 'var(--colorNeutralBackground3)',
                      padding: '6px 10px',
                      borderRadius: 4,
                      wordBreak: 'break-all'
                    }}
                  >
                    {`${window.location.origin}/my-schedule/${viewingSub.link_token}`}
                  </code>
                  <Button size="small" appearance="secondary" onClick={() => copyLink(viewingSub)}>
                    {copiedId === viewingSub.id ? 'Copied!' : 'Copy link'}
                  </Button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {viewingSub.trade && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>Trade</div>
                    <div>{viewingSub.trade}</div>
                  </div>
                )}
                {viewingSub.contact_name && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>Contact</div>
                    <div>{viewingSub.contact_name}</div>
                  </div>
                )}
                {viewingSub.email && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>Email</div>
                    <a href={`mailto:${viewingSub.email}`}>{viewingSub.email}</a>
                  </div>
                )}
                {viewingSub.phone && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>Phone</div>
                    <a href={`tel:${viewingSub.phone}`}>{viewingSub.phone}</a>
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ marginBottom: 12 }}>
                  Jobs ({subJobs.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {subJobs.map((a) => (
                    <div
                      key={a.id}
                      className="status-card"
                      style={{
                        '--status-color': materialsOrderedColor(a.materials_ordered),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <strong>{a.job_name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                          {formatDateRange(a.start_date, a.end_date)} · {a.job_address}
                        </div>
                      </div>
                      {a.status !== 'pending' && (
                        <Badge color={STATUS_COLOR[a.status] || 'informative'}>{a.status}</Badge>
                      )}
                    </div>
                  ))}
                  {subJobs.length === 0 && <p>No jobs assigned to this subcontractor yet.</p>}
                </div>
              </div>
            </div>
          )}
        </DrawerBody>
      </OverlayDrawer>
    </div>
  );
}
