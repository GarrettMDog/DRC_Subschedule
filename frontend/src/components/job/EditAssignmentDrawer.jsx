import { useState } from 'react';
import {
  Button,
  Field,
  Input,
  Dropdown,
  Option,
  OverlayDrawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { api } from '../../api/client';
import { useApiToken } from '../../auth/useApiToken';

// Edit an existing assignment — who's assigned, or when. `assignment` is
// null while closed.
export default function EditAssignmentDrawer({ assignment, onClose, subcontractors, onSaved, setError }) {
  const { getToken } = useApiToken();
  const [form, setForm] = useState({ subcontractor_id: '', date: '' });
  const [saving, setSaving] = useState(false);

  // Re-seed the form whenever a different assignment is opened. Done during
  // render (not in an effect) so the first paint already has the right values.
  const [seededFor, setSeededFor] = useState(null);
  if (!assignment && seededFor) setSeededFor(null);
  if (assignment && assignment !== seededFor) {
    setSeededFor(assignment);
    setForm({ subcontractor_id: assignment.subcontractor_id, date: assignment.start_date });
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      await api.updateAssignment(token, assignment.id, {
        subcontractor_id: form.subcontractor_id,
        start_date: form.date,
        end_date: form.date
      });
      onClose();
      await onSaved();
    } catch (err) {
      setError(err.message || 'Could not save changes to that assignment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <OverlayDrawer
      open={assignment !== null}
      onOpenChange={(_, { open }) => !open && onClose()}
      position="start"
      size="small"
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} />}
        >
          Edit assignment
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <form onSubmit={handleSave} style={{ display: 'grid', gap: 12 }}>
          <Field label="Subcontractor">
            <Dropdown
              placeholder="Select a subcontractor"
              value={subcontractors.find((s) => s.id === form.subcontractor_id)?.company_name || ''}
              onOptionSelect={(_, data) => setForm({ ...form, subcontractor_id: Number(data.optionValue) })}
            >
              {subcontractors.map((s) => (
                <Option key={s.id} value={String(s.id)}>
                  {s.company_name}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Button appearance="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </DrawerBody>
    </OverlayDrawer>
  );
}
