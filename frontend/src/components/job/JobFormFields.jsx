import { Field, Input, Textarea, Dropdown, Option, Checkbox } from '@fluentui/react-components';
import AddressAutocomplete from '../AddressAutocomplete';
import { JOB_TYPE_OPTIONS, MATERIAL_OPTIONS } from './jobConstants';

// The job fields shared by the Add and Edit drawers. `afterAddress` lets the
// Add drawer slot its optional "assign a subcontractor" section between the
// address and the rest, matching the original field order.
export default function JobFormFields({ form, setForm, afterAddress = null }) {
  return (
    <>
      <Field label="Address" required>
        <AddressAutocomplete
          value={form.address}
          onChange={(newValue) => setForm({ ...form, address: newValue })}
        />
      </Field>

      {afterAddress}

      <Field label="Job type" required>
        <Dropdown
          placeholder="Select one or more"
          multiselect
          value={form.job_type.join(', ')}
          selectedOptions={form.job_type}
          onOptionSelect={(_, data) => setForm({ ...form, job_type: data.selectedOptions })}
        >
          {JOB_TYPE_OPTIONS.map((t) => (
            <Option key={t} value={t}>
              {t}
            </Option>
          ))}
        </Dropdown>
      </Field>
      <Field label="Time">
        <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
      </Field>
      <Field label="Yardage">
        <Input
          type="number"
          step="0.5"
          value={form.yardage}
          onChange={(e) => setForm({ ...form, yardage: e.target.value })}
        />
      </Field>
      <Field label="Notes">
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          resize="vertical"
        />
      </Field>
      <Field label="Materials">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {MATERIAL_OPTIONS.map((m) => (
            <Checkbox
              key={m}
              label={m}
              checked={form.materials.includes(m)}
              onChange={(_, data) =>
                setForm({
                  ...form,
                  materials: data.checked ? [...form.materials, m] : form.materials.filter((x) => x !== m),
                  // Unchecking a material also clears its ordered status —
                  // no point keeping a stale "ordered" flag for something
                  // the job no longer needs.
                  ordered_materials: data.checked
                    ? form.ordered_materials
                    : form.ordered_materials.filter((x) => x !== m)
                })
              }
            />
          ))}
        </div>
      </Field>
      {form.materials.length > 0 && (
        <Field label="Materials ordered">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {form.materials.map((m) => (
              <Checkbox
                key={m}
                label={m}
                checked={form.ordered_materials.includes(m)}
                onChange={(_, data) =>
                  setForm({
                    ...form,
                    ordered_materials: data.checked
                      ? [...form.ordered_materials, m]
                      : form.ordered_materials.filter((x) => x !== m)
                  })
                }
              />
            ))}
          </div>
        </Field>
      )}
    </>
  );
}
