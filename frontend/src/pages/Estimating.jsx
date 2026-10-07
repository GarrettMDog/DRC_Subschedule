import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Field,
  Input,
  Dropdown,
  Option,
  MessageBar,
  MessageBarBody,
  OverlayDrawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell
} from '@fluentui/react-components';
import { Add20Regular, Dismiss24Regular, Delete20Regular } from '@fluentui/react-icons';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import { formatDate, toYMD } from '../dateUtils';
import { useConfirmDialog } from '../components/useConfirmDialog';

const PRIORITIES = ['High', 'Medium', 'Low'];
const PRIORITY_COLOR = { High: 'danger', Medium: 'warning', Low: 'informative' };

const emptyForm = () => ({
  date_received: toYMD(new Date()),
  project_name: '',
  address: '',
  contact: '',
  priority: 'Medium'
});

export default function Estimating() {
  const { getToken } = useApiToken();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 'create' shows the add form, a row object edits that row, null closes it.
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError(null);
      const token = await getToken();
      setRows(await api.getEstimates(token));
    } catch (err) {
      setError(err.message || 'Something went wrong loading the estimating list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setDrawer('create');
  }

  function openEdit(row) {
    setForm({
      date_received: row.date_received,
      project_name: row.project_name,
      address: row.address || '',
      contact: row.contact || '',
      priority: row.priority
    });
    setDrawer(row);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (drawer === 'create') {
        await api.addEstimate(token, form);
      } else {
        await api.updateEstimate(token, drawer.id, form);
      }
      setDrawer(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save that estimate.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const confirmed = await confirm(`Remove "${row.project_name}" from the estimating list?`);
    if (!confirmed) return;
    setError(null);
    try {
      const token = await getToken();
      await api.deleteEstimate(token, row.id);
      setDrawer(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not remove that estimate.');
    }
  }

  if (loading) return <p>Loading…</p>;

  const isCreating = drawer === 'create';
  const editingRow = drawer && !isCreating ? drawer : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {confirmDialog}
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Estimating ({rows.length})</h3>
        <Button appearance="primary" icon={<Add20Regular />} onClick={openCreate}>
          Add
        </Button>
      </div>

      {rows.length === 0 ? (
        <p>Nothing on the estimating list. Click "Add" to put a project on it.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Table aria-label="Estimating list" style={{ minWidth: 640 }}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Date Received</TableHeaderCell>
                <TableHeaderCell>Project Name</TableHeaderCell>
                <TableHeaderCell>Address</TableHeaderCell>
                <TableHeaderCell>Contact</TableHeaderCell>
                <TableHeaderCell>Priority</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} onClick={() => openEdit(r)} style={{ cursor: 'pointer' }}>
                  <TableCell>{formatDate(r.date_received)}</TableCell>
                  <TableCell>
                    <strong>{r.project_name}</strong>
                  </TableCell>
                  <TableCell>{r.address}</TableCell>
                  <TableCell>{r.contact}</TableCell>
                  <TableCell>
                    <Badge color={PRIORITY_COLOR[r.priority] || 'informative'}>{r.priority}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <OverlayDrawer
        open={drawer !== null}
        onOpenChange={(_, { open }) => !open && setDrawer(null)}
        position="start"
        size="small"
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={() => setDrawer(null)} />}
          >
            {isCreating ? 'Add to estimating' : 'Edit estimate'}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <form onSubmit={handleSave} style={{ display: 'grid', gap: 12 }}>
            <Field label="Date received" required>
              <Input
                type="date"
                required
                value={form.date_received}
                onChange={(e) => setForm({ ...form, date_received: e.target.value })}
              />
            </Field>
            <Field label="Project name" required>
              <Input
                required
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
              />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Contact">
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
            <Field label="Priority">
              <Dropdown
                value={form.priority}
                selectedOptions={[form.priority]}
                onOptionSelect={(_, data) => setForm({ ...form, priority: data.optionValue })}
              >
                {PRIORITIES.map((p) => (
                  <Option key={p} value={p}>
                    {p}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Button appearance="primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : isCreating ? 'Add' : 'Save changes'}
            </Button>
            {editingRow && (
              <Button appearance="subtle" icon={<Delete20Regular />} onClick={() => handleDelete(editingRow)}>
                Remove from list
              </Button>
            )}
          </form>
        </DrawerBody>
      </OverlayDrawer>
    </div>
  );
}
