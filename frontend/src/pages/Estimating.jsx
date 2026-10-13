import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
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
import { Add20Regular, Dismiss24Regular, Delete20Regular, Search20Regular } from '@fluentui/react-icons';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import { formatDate, toYMD } from '../dateUtils';
import { useConfirmDialog } from '../components/useConfirmDialog';
import AddressAutocomplete from '../components/AddressAutocomplete';

const PRIORITIES = ['High', 'Medium', 'Low'];
const PRIORITY_COLOR = { High: 'danger', Medium: 'warning', Low: 'informative' };

const emptyForm = () => ({
  date_received: toYMD(new Date()),
  address: '',
  contact: '',
  priority: 'Medium',
  completed: false,
  due_date: ''
});

export default function Estimating() {
  const { getToken } = useApiToken();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [hideCompleted, setHideCompleted] = useState(true);
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
      address: row.address || '',
      contact: row.contact || '',
      priority: row.priority,
      completed: !!row.completed,
      due_date: row.due_date || ''
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

  // Quick-toggle straight from the table — saves immediately, no form needed.
  async function toggleCompleted(row) {
    setError(null);
    try {
      const token = await getToken();
      await api.updateEstimate(token, row.id, { completed: !row.completed });
      await load();
    } catch (err) {
      setError(err.message || 'Could not update that estimate.');
    }
  }

  async function handleDelete(row) {
    const confirmed = await confirm(`Remove "${row.address}" from the estimating list?`);
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

  const visibleRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((r) => {
      // Searching looks through completed items too, so an old one is findable
      // even while "Hide completed" is on.
      if (!q) return !(hideCompleted && r.completed);
      return (r.address || '').toLowerCase().includes(q) || (r.contact || '').toLowerCase().includes(q);
    });
  }, [rows, searchText, hideCompleted]);

  if (loading) return <p>Loading…</p>;

  const isCreating = drawer === 'create';
  const editingRow = drawer && !isCreating ? drawer : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Estimating ({visibleRows.length})</h3>
        <Button appearance="primary" icon={<Add20Regular />} onClick={openCreate}>
          Add
        </Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Input
          style={{ flex: 1, minWidth: 200 }}
          contentBefore={<Search20Regular />}
          placeholder="Search address or contact…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Search estimates"
        />
        <Checkbox
          label="Hide completed"
          checked={hideCompleted}
          onChange={(_, data) => setHideCompleted(data.checked)}
        />
      </div>

      {visibleRows.length === 0 ? (
        <p>
          {rows.length === 0
            ? 'Nothing on the estimating list. Click "Add" to add an address to it.'
            : searchText.trim()
            ? 'No estimates match your search.'
            : 'Nothing outstanding — nice work.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Table aria-label="Estimating list" style={{ minWidth: 640 }}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Completed</TableHeaderCell>
                <TableHeaderCell>Due Date</TableHeaderCell>
                <TableHeaderCell>Address</TableHeaderCell>
                <TableHeaderCell>Contact</TableHeaderCell>
                <TableHeaderCell>Priority</TableHeaderCell>
                <TableHeaderCell>Date Received</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => openEdit(r)}
                  style={{ cursor: 'pointer', opacity: r.completed ? 0.55 : 1 }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={!!r.completed}
                      onChange={() => toggleCompleted(r)}
                      aria-label={`Mark ${r.address} completed`}
                    />
                  </TableCell>
                  <TableCell>{r.due_date ? formatDate(r.due_date) : ''}</TableCell>
                  <TableCell>
                    <strong style={{ textDecoration: r.completed ? 'line-through' : 'none' }}>{r.address}</strong>
                  </TableCell>
                  <TableCell>{r.contact}</TableCell>
                  <TableCell>
                    <Badge color={PRIORITY_COLOR[r.priority] || 'informative'}>{r.priority}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(r.date_received)}</TableCell>
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
            <Checkbox
              label="Completed"
              checked={form.completed}
              onChange={(_, data) => setForm({ ...form, completed: data.checked })}
            />
            <Field label="Due date">
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </Field>
            <Field label="Address" required>
              <AddressAutocomplete
                required
                value={form.address}
                onChange={(newValue) => setForm({ ...form, address: newValue })}
              />
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
            <Field label="Date received" required>
              <Input
                type="date"
                required
                value={form.date_received}
                onChange={(e) => setForm({ ...form, date_received: e.target.value })}
              />
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
          {/* Nested inside the drawer (not a sibling) so the drawer's fields keep
              working after the confirmation closes. */}
          {confirmDialog}
        </DrawerBody>
      </OverlayDrawer>
    </div>
  );
}
