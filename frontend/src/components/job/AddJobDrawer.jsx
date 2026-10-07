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
import JobFormFields from './JobFormFields';

// No more separate "Job name" concept — address is the sole identifier now.
const EMPTY_FORM = {
  address: '',
  job_type: [],
  time: '',
  yardage: '',
  materials: [],
  ordered_materials: [],
  notes: '',
  subcontractor_id: '',
  date: ''
};

// Full-screen create view — same field set as editing an existing job,
// minus the "Assigned subcontractors" and "Open to-dos" sections, since
// those inherently need a job that already exists. Form state lives here
// (and survives closing the drawer unsubmitted), so typing doesn't
// re-render the job list behind it.
export default function AddJobDrawer({ open, onClose, subcontractors, onCreated, setError }) {
  const { getToken } = useApiToken();
  const [form, setForm] = useState(EMPTY_FORM);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);

    if (form.subcontractor_id && !form.date) {
      setError("Pick a date for the assignment, or clear the subcontractor if you don't want to assign one yet.");
      return;
    }
    if (!form.subcontractor_id && form.date) {
      setError("Pick a subcontractor for that date, or clear the date if you don't want to assign one yet.");
      return;
    }

    try {
      const token = await getToken();
      const newJob = await api.addJob(token, form);

      // Optional — only if a subcontractor was actually picked.
      if (form.subcontractor_id) {
        await api.addAssignment(token, {
          subcontractor_id: form.subcontractor_id,
          job_id: newJob.id,
          start_date: form.date,
          end_date: form.date
        });
      }

      setForm(EMPTY_FORM);
      onClose();
      await onCreated();
    } catch (err) {
      setError(err.message || 'Could not add that job.');
    }
  }

  return (
    <OverlayDrawer open={open} onOpenChange={(_, { open }) => !open && onClose()} position="start" size="full">
      <DrawerHeader>
        <DrawerHeaderTitle
          action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} />}
        >
          Add a job
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <form onSubmit={handleAdd} style={{ display: 'grid', gap: 12 }}>
            <JobFormFields
              form={form}
              setForm={setForm}
              afterAddress={
                <>
                  <h4 style={{ marginTop: 12, marginBottom: 0 }}>Assign a subcontractor (optional)</h4>
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
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </Field>
                </>
              }
            />
            <Button appearance="primary" type="submit">
              Add job
            </Button>
          </form>
        </div>
      </DrawerBody>
    </OverlayDrawer>
  );
}
