import { useState } from 'react';
import {
  Button,
  Field,
  Input,
  Dropdown,
  Option,
  Badge,
  Checkbox,
  OverlayDrawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle
} from '@fluentui/react-components';
import { Add20Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { api } from '../../api/client';
import { useApiToken } from '../../auth/useApiToken';
import { formatDateRange, formatDate } from '../../dateUtils';
import { STATUS_HEX, formatJobType, parseJobTypes, parseMaterials } from '../../theme';
import JobFormFields from './JobFormFields';
import { ASSIGNMENT_STATUS_COLOR } from './jobConstants';

const EMPTY_ASSIGN_FORM = { subcontractor_id: '', date: '' };

function toEditForm(job) {
  return {
    address: job.address || '',
    time: job.time || '',
    job_type: parseJobTypes(job.job_type),
    yardage: job.yardage || '',
    materials: parseMaterials(job.materials),
    ordered_materials: parseMaterials(job.ordered_materials),
    notes: job.notes || ''
  };
}

// Full-screen edit view: editable job details, plus everyone assigned to it.
// `job` is null while closed. All form state lives here so typing doesn't
// re-render the job list behind the drawer.
//
// onChanged(keys) asks the page to refetch just those resources
// ('jobs' | 'assignments' | 'todos' | 'subcontractors').
export default function EditJobDrawer({
  job,
  assignments,
  todos,
  subcontractors,
  onClose,
  onChanged,
  onEditAssignment,
  onDuplicate,
  onDelete,
  setError
}) {
  const { getToken } = useApiToken();
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Assigning a subcontractor to this job. Collapsed by default once a job
  // already has a subcontractor assigned — reset each time a different job
  // is opened, since whether it starts open depends on that job's own
  // assignment count, checked at render time.
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN_FORM);
  const [assignFormOpen, setAssignFormOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Re-seed everything whenever a job is opened. Done during render (not in
  // an effect) so the first paint already has the right values.
  const [seededFor, setSeededFor] = useState(null);
  if (!job && seededFor) setSeededFor(null);
  if (job && job !== seededFor) {
    setSeededFor(job);
    setEditForm(toEditForm(job));
    setAssignForm(EMPTY_ASSIGN_FORM);
    setAssignFormOpen(false);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      await api.updateJob(token, job.id, editForm);
      await onChanged(['jobs', 'assignments']);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save changes to that job.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignSub(e) {
    e.preventDefault();
    setError(null);
    setAssigning(true);
    try {
      const token = await getToken();
      await api.addAssignment(token, {
        subcontractor_id: assignForm.subcontractor_id,
        job_id: job.id,
        start_date: assignForm.date,
        end_date: assignForm.date
      });
      setAssignForm(EMPTY_ASSIGN_FORM);
      setAssignFormOpen(false);
      await onChanged(['assignments']);
    } catch (err) {
      setError(err.message || 'Could not assign that subcontractor.');
    } finally {
      setAssigning(false);
    }
  }

  // Quick-toggle from within the job view, same pattern as materials-ordered
  // — auto-saves immediately, no separate Save button for just this.
  async function toggleTodoCompleted(todo) {
    setError(null);
    try {
      const token = await getToken();
      await api.updateTodo(token, todo.id, { ...todo, completed: !todo.completed });
      await onChanged(['todos']);
    } catch (err) {
      setError(err.message || 'Could not update that to-do.');
    }
  }

  return (
    <OverlayDrawer
      open={job !== null}
      onOpenChange={(_, { open }) => !open && onClose()}
      position="start"
      size="full"
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} />}
        >
          {job && (job.job_type ? `${formatJobType(job.job_type)} — ` : '') + (job?.address || '')}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {job && editForm && (
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {job.created_by && (
              <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                Created by {job.created_by}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>Assigned subcontractors ({assignments.length})</h4>
                {assignments.length > 0 && (
                  <Button
                    size="small"
                    appearance={assignFormOpen ? 'primary' : 'subtle'}
                    icon={<Add20Regular />}
                    aria-label="Add another subcontractor"
                    onClick={() => setAssignFormOpen((open) => !open)}
                  />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="status-card"
                    style={{ '--status-color': STATUS_HEX[a.status] || '#6B7280' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <strong>{a.subcontractor_name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)', marginTop: 2 }}>
                          {formatDateRange(a.start_date, a.end_date)}
                        </div>
                      </div>
                      <Button size="small" appearance="secondary" onClick={() => onEditAssignment(a)}>
                        Edit assignment
                      </Button>
                    </div>
                    {a.status !== 'pending' && (
                      <Badge color={ASSIGNMENT_STATUS_COLOR[a.status] || 'informative'} style={{ marginTop: 6 }}>
                        {a.status}
                      </Badge>
                    )}
                  </div>
                ))}
                {assignments.length === 0 && <p>No subcontractors assigned to this job yet.</p>}
              </div>

              {(assignments.length === 0 || assignFormOpen) && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ marginBottom: 12 }}>Assign a subcontractor</h4>
                  <form onSubmit={handleAssignSub} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
                    <Field label="Subcontractor" required>
                      <Dropdown
                        placeholder="Select a subcontractor"
                        value={subcontractors.find((s) => s.id === assignForm.subcontractor_id)?.company_name || ''}
                        onOptionSelect={(_, data) =>
                          setAssignForm({ ...assignForm, subcontractor_id: Number(data.optionValue) })
                        }
                      >
                        {subcontractors.map((s) => (
                          <Option key={s.id} value={String(s.id)}>
                            {s.company_name}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                    <Field label="Date" required>
                      <Input
                        type="date"
                        value={assignForm.date}
                        onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
                      />
                    </Field>
                    <Button appearance="primary" type="submit" disabled={assigning}>
                      {assigning ? 'Assigning…' : 'Assign'}
                    </Button>
                  </form>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'grid', gap: 12 }}>
              <JobFormFields form={editForm} setForm={setEditForm} />
              <Button appearance="primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </form>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button appearance="secondary" onClick={() => onDuplicate(job)}>
                Duplicate this job
              </Button>
              <Button appearance="secondary" onClick={() => onDelete(job)}>
                Delete this job
              </Button>
            </div>

            <div>
              <h4 style={{ marginBottom: 12 }}>Open to-dos on this job ({todos.length})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todos.map((t) => (
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
                {todos.length === 0 && <p>No open to-dos on this job.</p>}
              </div>
            </div>
          </div>
        )}
      </DrawerBody>
    </OverlayDrawer>
  );
}
