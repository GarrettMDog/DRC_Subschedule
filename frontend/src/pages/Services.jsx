import { useEffect, useState } from 'react';
import {
  Button,
  Field,
  Input,
  Textarea,
  Dropdown,
  Option,
  Checkbox,
  MessageBar,
  MessageBarBody,
  OverlayDrawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle
} from '@fluentui/react-components';
import { Dismiss24Regular, Delete20Regular } from '@fluentui/react-icons';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import { formatDate } from '../dateUtils';

const EMPTY_TODO_FORM = { title: '', description: '', assignee_id: '', job_id: '', due_date: '' };
const EMPTY_ASSIGNEE_FORM = { name: '', email: '', phone: '' };

export default function Services() {
  const { getToken } = useApiToken();
  const [todos, setTodos] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hideCompleted, setHideCompleted] = useState(true);

  // To-do drawer: 'create' shows the add form, a todo object edits that
  // todo, null closes it.
  const [todoDrawer, setTodoDrawer] = useState(null);
  const [todoForm, setTodoForm] = useState(EMPTY_TODO_FORM);
  const [savingTodo, setSavingTodo] = useState(false);

  // Assignee directory drawer — same pattern, smaller scope.
  const [assigneeDrawer, setAssigneeDrawer] = useState(null);
  const [assigneeForm, setAssigneeForm] = useState(EMPTY_ASSIGNEE_FORM);
  const [savingAssignee, setSavingAssignee] = useState(false);

  async function load() {
    try {
      setError(null);
      const token = await getToken();
      const [todosData, assigneesData, jobsData] = await Promise.all([
        api.getTodos(token),
        api.getServiceAssignees(token),
        api.getJobs(token)
      ]);
      setTodos(todosData);
      setAssignees(assigneesData);
      setJobs(jobsData);
    } catch (err) {
      setError(err.message || 'Something went wrong loading Services.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- To-dos ---

  function openTodoCreate() {
    setTodoForm(EMPTY_TODO_FORM);
    setTodoDrawer('create');
  }

  function openTodoEdit(todo) {
    setTodoForm({
      title: todo.title,
      description: todo.description || '',
      assignee_id: todo.assignee_id ? String(todo.assignee_id) : '',
      job_id: todo.job_id ? String(todo.job_id) : '',
      due_date: todo.due_date || ''
    });
    setTodoDrawer(todo);
  }

  async function handleSaveTodo(e) {
    e.preventDefault();
    setError(null);
    setSavingTodo(true);
    try {
      const token = await getToken();
      const payload = {
        title: todoForm.title,
        description: todoForm.description || null,
        assignee_id: todoForm.assignee_id ? Number(todoForm.assignee_id) : null,
        job_id: todoForm.job_id ? Number(todoForm.job_id) : null,
        due_date: todoForm.due_date || null
      };

      if (todoDrawer === 'create') {
        await api.addTodo(token, payload);
      } else {
        await api.updateTodo(token, todoDrawer.id, payload);
      }

      setTodoDrawer(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save that to-do.');
    } finally {
      setSavingTodo(false);
    }
  }

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

  async function handleDeleteTodo(todo) {
    if (!window.confirm(`Delete "${todo.title}"? This can't be undone.`)) return;
    setError(null);
    try {
      const token = await getToken();
      await api.deleteTodo(token, todo.id);
      setTodoDrawer(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not delete that to-do.');
    }
  }

  // --- Assignee directory ---

  function openAssigneeCreate() {
    setAssigneeForm(EMPTY_ASSIGNEE_FORM);
    setAssigneeDrawer('create');
  }

  function openAssigneeEdit(assignee) {
    setAssigneeForm({
      name: assignee.name,
      email: assignee.email || '',
      phone: assignee.phone || ''
    });
    setAssigneeDrawer(assignee);
  }

  async function handleSaveAssignee(e) {
    e.preventDefault();
    setError(null);
    setSavingAssignee(true);
    try {
      const token = await getToken();
      if (assigneeDrawer === 'create') {
        await api.addServiceAssignee(token, assigneeForm);
      } else {
        await api.updateServiceAssignee(token, assigneeDrawer.id, assigneeForm);
      }
      setAssigneeDrawer(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save that assignee.');
    } finally {
      setSavingAssignee(false);
    }
  }

  async function handleDeleteAssignee(assignee) {
    if (
      !window.confirm(
        `Remove ${assignee.name} from the directory? Any to-dos assigned to them will become unassigned, not deleted.`
      )
    )
      return;
    setError(null);
    try {
      const token = await getToken();
      await api.deleteServiceAssignee(token, assignee.id);
      setAssigneeDrawer(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not remove that assignee.');
    }
  }

  if (loading) return <p>Loading…</p>;

  const isCreatingTodo = todoDrawer === 'create';
  const editingTodo = todoDrawer && todoDrawer !== 'create' ? todoDrawer : null;
  const isCreatingAssignee = assigneeDrawer === 'create';
  const editingAssignee = assigneeDrawer && assigneeDrawer !== 'create' ? assigneeDrawer : null;

  const visibleTodos = hideCompleted ? todos.filter((t) => !t.completed) : todos;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {/* --- To-dos --- */}
      <section>
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
          <h3 style={{ margin: 0 }}>Services</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Checkbox
              label="Hide completed"
              checked={hideCompleted}
              onChange={(_, data) => setHideCompleted(data.checked)}
            />
            <Button appearance="primary" onClick={openTodoCreate}>
              + Add to-do
            </Button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleTodos.map((t) => (
            <div
              key={t.id}
              className="status-card"
              style={{
                '--status-color': t.completed ? '#6B7280' : '#B7791F',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}
            >
              <Checkbox checked={!!t.completed} onChange={() => toggleTodoCompleted(t)} style={{ marginTop: 2 }} />
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openTodoEdit(t)}>
                <div style={{ textDecoration: t.completed ? 'line-through' : 'none' }}>
                  <strong>{t.title}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)', marginTop: 2 }}>
                  {t.assignee_name || 'Unassigned'}
                  {t.job_name && ` · ${t.job_name}`}
                  {t.due_date && ` · Due ${formatDate(t.due_date)}`}
                </div>
              </div>
              <Button
                size="small"
                appearance="subtle"
                icon={<Delete20Regular />}
                onClick={() => handleDeleteTodo(t)}
              />
            </div>
          ))}
          {visibleTodos.length === 0 && todos.length === 0 && (
            <p>No to-dos yet. Click "Add to-do" to create one.</p>
          )}
          {visibleTodos.length === 0 && todos.length > 0 && <p>Nothing outstanding — nice work.</p>}
        </div>
      </section>

      {/* --- Assignee directory --- */}
      <section>
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
          <h4 style={{ margin: 0 }}>Assignee directory</h4>
          <Button size="small" appearance="secondary" onClick={openAssigneeCreate}>
            + Add assignee
          </Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {assignees.map((a) => (
            <div
              key={a.id}
              className="status-card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
            >
              <div>
                <strong>{a.name}</strong>
                <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                  {a.email} {a.email && a.phone && '·'} {a.phone}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="small" appearance="secondary" onClick={() => openAssigneeEdit(a)}>
                  Edit
                </Button>
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Delete20Regular />}
                  onClick={() => handleDeleteAssignee(a)}
                />
              </div>
            </div>
          ))}
          {assignees.length === 0 && <p>No one in the directory yet. Click "Add assignee" to create one.</p>}
        </div>
      </section>

      {/* --- To-do create/edit drawer --- */}
      <OverlayDrawer
        open={todoDrawer !== null}
        onOpenChange={(_, { open }) => !open && setTodoDrawer(null)}
        position="start"
        size="small"
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={() => setTodoDrawer(null)} />}
          >
            {isCreatingTodo ? 'Add a to-do' : 'Edit to-do'}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <form onSubmit={handleSaveTodo} style={{ display: 'grid', gap: 12 }}>
            <Field label="Title" required>
              <Input value={todoForm.title} onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })} />
            </Field>
            <Field label="Description">
              <Textarea
                value={todoForm.description}
                onChange={(e) => setTodoForm({ ...todoForm, description: e.target.value })}
              />
            </Field>
            <Field label="Assign to">
              <Dropdown
                placeholder="Unassigned"
                value={assignees.find((a) => String(a.id) === todoForm.assignee_id)?.name || 'Unassigned'}
                selectedOptions={[todoForm.assignee_id]}
                onOptionSelect={(_, data) => setTodoForm({ ...todoForm, assignee_id: data.optionValue })}
              >
                <Option value="">Unassigned</Option>
                {assignees.map((a) => (
                  <Option key={a.id} value={String(a.id)}>
                    {a.name}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Job (optional)">
              <Dropdown
                placeholder="No job"
                value={jobs.find((j) => String(j.id) === todoForm.job_id)?.name || 'No job'}
                selectedOptions={[todoForm.job_id]}
                onOptionSelect={(_, data) => setTodoForm({ ...todoForm, job_id: data.optionValue })}
              >
                <Option value="">No job</Option>
                {jobs.map((j) => (
                  <Option key={j.id} value={String(j.id)}>
                    {j.name}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={todoForm.due_date}
                onChange={(e) => setTodoForm({ ...todoForm, due_date: e.target.value })}
              />
            </Field>
            <Button appearance="primary" type="submit" disabled={savingTodo}>
              {savingTodo ? 'Saving…' : isCreatingTodo ? 'Add to-do' : 'Save changes'}
            </Button>
            {editingTodo && (
              <Button appearance="subtle" onClick={() => handleDeleteTodo(editingTodo)}>
                Delete this to-do
              </Button>
            )}
          </form>
        </DrawerBody>
      </OverlayDrawer>

      {/* --- Assignee create/edit drawer --- */}
      <OverlayDrawer
        open={assigneeDrawer !== null}
        onOpenChange={(_, { open }) => !open && setAssigneeDrawer(null)}
        position="start"
        size="small"
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={() => setAssigneeDrawer(null)} />
            }
          >
            {isCreatingAssignee ? 'Add an assignee' : 'Edit assignee'}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <form onSubmit={handleSaveAssignee} style={{ display: 'grid', gap: 12 }}>
            <Field label="Name" required>
              <Input
                value={assigneeForm.name}
                onChange={(e) => setAssigneeForm({ ...assigneeForm, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                value={assigneeForm.email}
                onChange={(e) => setAssigneeForm({ ...assigneeForm, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={assigneeForm.phone}
                onChange={(e) => setAssigneeForm({ ...assigneeForm, phone: e.target.value })}
              />
            </Field>
            <Button appearance="primary" type="submit" disabled={savingAssignee}>
              {savingAssignee ? 'Saving…' : isCreatingAssignee ? 'Add assignee' : 'Save changes'}
            </Button>
            {editingAssignee && (
              <Button appearance="subtle" onClick={() => handleDeleteAssignee(editingAssignee)}>
                Remove from directory
              </Button>
            )}
          </form>
        </DrawerBody>
      </OverlayDrawer>
    </div>
  );
}
