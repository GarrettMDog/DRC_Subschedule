import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Field,
  Input,
  Dropdown,
  Option,
  Badge,
  Checkbox,
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
import { formatDateRange, formatDate } from '../dateUtils';
import { STATUS_HEX, materialsOrderedColor } from '../theme';

const EMPTY_FORM = { name: '', address: '' };
const STATUS_LABEL = { active: 'Active', completed: 'Completed', cancelled: 'Cancelled' };

const ASSIGNMENT_STATUS_COLOR = {
  pending: 'warning',
  confirmed: 'success',
  declined: 'danger',
  cancelled: 'subtle'
};

export default function JobList() {
  const { getToken } = useApiToken();
  const [jobs, setJobs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 'create' shows the add form (small drawer). A job object shows its
  // full-screen edit view. null closes the drawer entirely.
  const [drawerContent, setDrawerContent] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Search / filter / sort — matters more as the job list grows.
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('name');

  async function load() {
    try {
      setError(null);
      const token = await getToken();
      const [jobsData, assignmentsData, todosData] = await Promise.all([
        api.getJobs(token),
        api.getAssignments(token),
        api.getTodos(token)
      ]);
      setJobs(jobsData);
      setAssignments(assignmentsData);
      setTodos(todosData);
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
      setDrawerContent(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not add that job.');
    }
  }

  function openJobDetail(job) {
    setDrawerContent(job);
    setEditForm({
      name: job.name,
      address: job.address || '',
      time: job.time || '',
      status: job.status || 'active',
      materials_ordered: !!job.materials_ordered
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      await api.updateJob(token, drawerContent.id, editForm);
      await load();
      setDrawerContent(null);
    } catch (err) {
      setError(err.message || 'Could not save changes to that job.');
    } finally {
      setSaving(false);
    }
  }

  // Quick-toggle from within the job view, same pattern as materials-ordered
  // — auto-saves immediately, no separate Save button for just this.
  async function toggleTodoCompleted(todo) {
    setError(null);
    try {
      const token = await getToken();
      await api.updateTodo(token, todo.id, { ...todo, completed: !todo.completed });
      await load();
    } catch (err) {
      setError(err.message || 'Could not update that to-do.');
    }
  }

  const visibleJobs = useMemo(() => {
    let result = jobs;

    if (statusFilter !== 'all') {
      result = result.filter((j) => (j.status || 'active') === statusFilter);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (j) => j.name.toLowerCase().includes(q) || (j.address || '').toLowerCase().includes(q)
      );
    }

    const sorted = [...result].sort((a, b) => {
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [jobs, statusFilter, searchText, sortBy]);

  if (loading) return <p>Loading…</p>;

  const isCreating = drawerContent === 'create';
  const editingJob = drawerContent && drawerContent !== 'create' ? drawerContent : null;
  const jobAssignments = editingJob ? assignments.filter((a) => a.job_id === editingJob.id) : [];
  // Driven only by job_id and the to-do's own completed flag — never by the
  // job's status, so a to-do on a "Completed" job still shows until it's
  // checked off itself.
  const jobTodos = editingJob ? todos.filter((t) => t.job_id === editingJob.id && !t.completed) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Jobs</h3>
        <Button appearance="primary" onClick={() => setDrawerContent('create')}>
          + Add job
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field label="Search" style={{ minWidth: 200, flex: 1 }}>
          <Input
            placeholder="Job name or address…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Field>
        <Field label="Status">
          <Dropdown
            value={STATUS_LABEL[statusFilter] || 'All'}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_, data) => setStatusFilter(data.optionValue)}
          >
            <Option value="all">All</Option>
            <Option value="active">Active</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
          </Dropdown>
        </Field>
        <Field label="Sort by">
          <Dropdown
            value={sortBy === 'status' ? 'Status' : 'Name (A–Z)'}
            selectedOptions={[sortBy]}
            onOptionSelect={(_, data) => setSortBy(data.optionValue)}
          >
            <Option value="name">Name (A–Z)</Option>
            <Option value="status">Status</Option>
          </Dropdown>
        </Field>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleJobs.map((j) => (
          <div
            key={j.id}
            className="list-row"
            style={{ '--status-color': materialsOrderedColor(j.materials_ordered) }}
            onClick={() => openJobDetail(j)}
          >
            <div>
              <strong>{j.name}</strong>
              <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                {[j.address, STATUS_LABEL[j.status] || j.status, j.materials_ordered ? 'Materials ordered' : 'Materials not ordered']
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <ChevronRight20Regular />
          </div>
        ))}
        {visibleJobs.length === 0 && jobs.length > 0 && (
          <p>No jobs match your search/filter.</p>
        )}
        {jobs.length === 0 && <p>No jobs yet. Click "Add job" to create one.</p>}
      </div>

      {/* Small side panel for creating a new job */}
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
            Add a job
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <form onSubmit={handleAdd} style={{ display: 'grid', gap: 12 }}>
            <Field label="Job name" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Button appearance="primary" type="submit">
              Add job
            </Button>
          </form>
        </DrawerBody>
      </OverlayDrawer>

      {/* Full-screen edit view: editable job details, plus everyone assigned to it */}
      <OverlayDrawer
        open={editingJob !== null}
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
            {editingJob?.name}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {editingJob && editForm && (
            <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <form onSubmit={handleSaveEdit} style={{ display: 'grid', gap: 12 }}>
                <Field label="Job name" required>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </Field>
                <Field label="Address">
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </Field>
                <Field label="Time">
                  <Input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  />
                </Field>
                <Field label="Status">
                  <Dropdown
                    value={STATUS_LABEL[editForm.status] || editForm.status}
                    selectedOptions={[editForm.status]}
                    onOptionSelect={(_, data) => setEditForm({ ...editForm, status: data.optionValue })}
                  >
                    <Option value="active">Active</Option>
                    <Option value="completed">Completed</Option>
                    <Option value="cancelled">Cancelled</Option>
                  </Dropdown>
                </Field>
                <Checkbox
                  label="Materials ordered"
                  checked={editForm.materials_ordered}
                  onChange={(_, data) => setEditForm({ ...editForm, materials_ordered: data.checked })}
                />
                <Button appearance="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </form>

              <div>
                <h4 style={{ marginBottom: 12 }}>Assigned subcontractors ({jobAssignments.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {jobAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="status-card"
                      style={{
                        '--status-color': STATUS_HEX[a.status] || '#6B7280',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <strong>{a.subcontractor_name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                          {formatDateRange(a.start_date, a.end_date)}
                        </div>
                      </div>
                      {a.status !== 'pending' && (
                        <Badge color={ASSIGNMENT_STATUS_COLOR[a.status] || 'informative'}>{a.status}</Badge>
                      )}
                    </div>
                  ))}
                  {jobAssignments.length === 0 && <p>No subcontractors assigned to this job yet.</p>}
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: 12 }}>
                  Open to-dos on this job ({jobTodos.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {jobTodos.map((t) => (
                    <div
                      key={t.id}
                      className="status-card"
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
                    >
                      <Checkbox checked={false} onChange={() => toggleTodoCompleted(t)} style={{ marginTop: 2 }} />
                      <div>
                        <strong>{t.title}</strong>
                        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                          {t.assignee_name || 'Unassigned'}
                          {t.due_date && ` · Due ${formatDate(t.due_date)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  {jobTodos.length === 0 && <p>No open to-dos on this job.</p>}
                </div>
              </div>
            </div>
          )}
        </DrawerBody>
      </OverlayDrawer>
    </div>
  );
}
