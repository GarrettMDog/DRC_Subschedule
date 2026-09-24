import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Field,
  Input,
  Textarea,
  Dropdown,
  Option,
  Combobox,
  Badge,
  Checkbox,
  MessageBar,
  MessageBarBody,
  OverlayDrawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle
} from '@fluentui/react-components';
import {
  ChevronRight20Regular,
  Dismiss24Regular,
  Search20Regular,
  Filter20Regular,
  Add20Regular
} from '@fluentui/react-icons';
import { api } from '../api/client';
import { useApiToken } from '../auth/useApiToken';
import { useConfirmDialog } from '../components/useConfirmDialog';
import AddressAutocomplete from '../components/AddressAutocomplete';
import LeafIcon from '../components/LeafIcon';
import { formatDateRange, formatDate, formatDateHeader, formatTime, toYMD } from '../dateUtils';
import {
  STATUS_HEX,
  materialsOrderedColor,
  formatJobType,
  parseJobTypes,
  formatMaterials,
  parseMaterials,
  materialsOrderStatus
} from '../theme';

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
const EMPTY_ASSIGN_FORM = { subcontractor_id: '', date: '' };
const JOB_TYPE_OPTIONS = ['Box', 'Prep', 'Pour', 'Replace', 'Form Wall', 'Dig Ftg', 'Service'];
const MATERIAL_OPTIONS = ['Concrete', 'Pump', 'Line Pump', 'Gravel', 'Dumptruck', 'Supplies', 'Dump Trailer', 'Georgia Buggy'];

const ASSIGNMENT_STATUS_COLOR = {
  pending: 'warning',
  confirmed: 'success',
  declined: 'danger',
  cancelled: 'subtle'
};

export default function JobList() {
  const { getToken } = useApiToken();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const toolbarRef = useRef(null);

  // Which date header is currently stuck/pinned at the top while scrolling,
  // so it can be shown a bit larger — the one you're actually looking at
  // right now, versus ones you've scrolled past or haven't reached yet.
  // CSS alone has no way to know when a sticky element is "currently
  // stuck," so this is tracked via scroll position instead.
  const [activeStickyDate, setActiveStickyDate] = useState(null);
  const dateHeaderRefs = useRef({});
  const [jobs, setJobs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [todos, setTodos] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Surfaced when creating a job and assigning a sub to it in one step
  // produces a scheduling conflict. Shown at the page level (not inside the
  // drawer) since the drawer closes right after — this needs to stay
  // visible past that close, not disappear along with it.
  const [createAssignWarning, setCreateAssignWarning] = useState(null);

  // 'create' shows the add form (small drawer). A job object shows its
  // full-screen edit view. null closes the drawer entirely.
  const [drawerContent, setDrawerContent] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Assigning a subcontractor to this job — moved here from the Dashboard,
  // so it lives right alongside everything else about the job.
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN_FORM);
  const [assignConflictWarning, setAssignConflictWarning] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Editing an existing assignment's dates — this had nowhere to live after
  // the Dashboard's detail panel was removed. Brought back here since
  // assignment management now lives entirely on the job itself.
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentEditForm, setAssignmentEditForm] = useState({ subcontractor_id: '', date: '' });
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentEditWarning, setAssignmentEditWarning] = useState(null);

  // Search — still useful for narrowing which jobs show up at all, applied
  // before the date/subcontractor grouping below.
  const [searchText, setSearchText] = useState('');

  // Which of the two compact panels (search input, subcontractor filter) is
  // currently revealed, if any — collapsing one to save space doesn't clear
  // its underlying value, so a search or filter stays applied even while
  // hidden; the button itself gets a filled/primary look as the visual cue
  // that something's still active behind it.
  const [activePanel, setActivePanel] = useState(null);

  // How many weeks (starting with the current one) are currently shown —
  // the Jobs tab defaults to just the current week, with a button to
  // reveal more one week at a time, up to the existing 4-week/28-day
  // planning horizon used elsewhere in this app (e.g. the subcontractor
  // profile's "Next 4 weeks" section).
  const [visibleWeeks, setVisibleWeeks] = useState(1);
  const MAX_VISIBLE_WEEKS = 4;

  // Subcontractor filter + date/subcontractor grouping — matches exactly
  // how the Dashboard's list view used to organize things, moved here since
  // that view no longer exists (Dashboard is calendar-only now).
  const [subFilterId, setSubFilterId] = useState(null); // null = show everyone
  const [subFilterText, setSubFilterText] = useState('');

  async function load() {
    try {
      setError(null);
      const token = await getToken();
      const [jobsData, assignmentsData, todosData, subsData] = await Promise.all([
        api.getJobs(token),
        api.getAssignments(token),
        api.getTodos(token),
        api.getSubcontractors(token)
      ]);
      setJobs(jobsData);
      setAssignments(assignmentsData);
      setTodos(todosData);
      setSubcontractors(subsData);
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

  // The toolbar row (title + search/filter/add buttons) is sticky too now,
  // stacking right below the app's own sticky header. Its height isn't
  // fixed either — the buttons can wrap on a narrow screen — so this
  // measures the real rendered height the same way OfficeLayout does for
  // its own header, rather than guessing a pixel offset that could be
  // wrong on some screen size.
  // Depends on `loading`, not just mount-once: on first render the page
  // shows "Loading…" instead of the real toolbar, so toolbarRef.current
  // is still null the first time this runs — it only becomes available
  // once loading flips to false and the actual toolbar div exists.
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const updateHeight = () => {
      document.documentElement.style.setProperty('--jobs-toolbar-height', `${el.offsetHeight}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  // Figures out which date header is currently pinned by checking each
  // one's actual on-screen position — a stuck sticky element's top edge
  // sits exactly at its `top` offset, so whichever header currently sits
  // there (the last one in date order that's reached that position) is
  // the one being looked at right now. Reads the offset and the current
  // set of rendered headers fresh on every call, rather than caching
  // either — so this doesn't need to be recreated as jobs load or the
  // date range changes; it just reflects whatever's on screen right now.
  useEffect(() => {
    let ticking = false;

    function updateActiveDate() {
      const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
      const toolbarHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--jobs-toolbar-height')) || 0;
      const offset = headerHeight + toolbarHeight;

      const entries = Object.entries(dateHeaderRefs.current)
        .filter(([, el]) => el)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

      let active = null;
      for (const [date, el] of entries) {
        if (el.getBoundingClientRect().top <= offset + 1) {
          active = date;
        } else {
          break;
        }
      }
      setActiveStickyDate(active);
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateActiveDate);
        ticking = true;
      }
    }

    updateActiveDate();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    setCreateAssignWarning(null);

    if (form.subcontractor_id && !form.date) {
      setError('Pick a date for the assignment, or clear the subcontractor if you don\'t want to assign one yet.');
      return;
    }
    if (!form.subcontractor_id && form.date) {
      setError('Pick a subcontractor for that date, or clear the date if you don\'t want to assign one yet.');
      return;
    }

    try {
      const token = await getToken();
      const newJob = await api.addJob(token, form);

      // Optional — only if a subcontractor was actually picked. Same soft
      // conflict handling as the standalone assign form: saved either way,
      // just flagged if it overlaps something else that sub is already on.
      if (form.subcontractor_id) {
        const { conflicts } = await api.addAssignment(token, {
          subcontractor_id: form.subcontractor_id,
          job_id: newJob.id,
          start_date: form.date,
          end_date: form.date
        });
        if (conflicts.length > 0) {
          setCreateAssignWarning(
            `Job created, but heads up: this sub already has ${conflicts.length} overlapping assignment(s) in that window. Saved anyway.`
          );
        }
      }

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
      address: job.address || '',
      time: job.time || '',
      job_type: parseJobTypes(job.job_type),
      yardage: job.yardage || '',
      materials: parseMaterials(job.materials),
      ordered_materials: parseMaterials(job.ordered_materials),
      notes: job.notes || ''
    });
    setAssignForm(EMPTY_ASSIGN_FORM);
    setAssignConflictWarning(null);
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

  async function handleDeleteJob(job) {
    const confirmed = await confirm(
      `Delete "${job.address}"? This also removes any subcontractor assignment on it. This can't be undone.`
    );
    if (!confirmed) return;
    setError(null);
    try {
      const token = await getToken();
      await api.deleteJob(token, job.id);
      setDrawerContent(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not delete that job.');
    }
  }

  // Pre-fills the create form with this job's type/time/yardage/materials
  // needed — but not its address (almost certainly different for the new
  // job), not its ordered-materials progress (a new job starts unordered),
  // and not its assignment (starts unassigned, same as any new job).
  // A genuinely complete clone now — address and every current active
  // assignment (subcontractor + date) carry over, not just the job's own
  // fields. Cancelled/declined assignments don't get cloned — those
  // represent something that didn't happen, not something to repeat.
  async function handleDuplicateJob(job) {
    const confirmed = await confirm(
      `Duplicate "${job.address}"? This creates a new job with the same type, time, yardage, materials, and notes — plus a copy of every subcontractor currently assigned to it, on the same dates. You'll be able to review and edit the new job right after.`,
      { confirmLabel: 'Duplicate' }
    );
    if (!confirmed) return;
    setError(null);
    try {
      const token = await getToken();
      const newJob = await api.addJob(token, {
        address: job.address,
        job_type: parseJobTypes(job.job_type),
        time: job.time || '',
        yardage: job.yardage || '',
        materials: parseMaterials(job.materials),
        ordered_materials: parseMaterials(job.ordered_materials),
        notes: job.notes || ''
      });

      const sourceAssignments = assignments.filter(
        (a) => a.job_id === job.id && a.status !== 'cancelled' && a.status !== 'declined'
      );
      for (const a of sourceAssignments) {
        await api.addAssignment(token, {
          subcontractor_id: a.subcontractor_id,
          job_id: newJob.id,
          start_date: a.start_date,
          end_date: a.end_date
        });
      }

      await load();
      openJobDetail(newJob);
    } catch (err) {
      setError(err.message || 'Could not duplicate that job.');
    }
  }

  async function handleAssignSub(e) {
    e.preventDefault();
    setError(null);
    setAssignConflictWarning(null);
    setAssigning(true);
    try {
      const token = await getToken();
      const { conflicts } = await api.addAssignment(token, {
        subcontractor_id: assignForm.subcontractor_id,
        job_id: drawerContent.id,
        start_date: assignForm.date,
        end_date: assignForm.date
      });
      if (conflicts.length > 0) {
        setAssignConflictWarning(
          `Heads up: this sub already has ${conflicts.length} overlapping assignment(s) in that window. Saved anyway — review below.`
        );
      }
      setAssignForm(EMPTY_ASSIGN_FORM);
      await load();
    } catch (err) {
      setError(err.message || 'Could not assign that subcontractor.');
    } finally {
      setAssigning(false);
    }
  }

  function openEditAssignment(assignment) {
    setAssignmentEditWarning(null);
    setAssignmentEditForm({ subcontractor_id: assignment.subcontractor_id, date: assignment.start_date });
    setEditingAssignment(assignment);
  }

  async function handleSaveAssignmentEdit(e) {
    e.preventDefault();
    setError(null);
    setAssignmentEditWarning(null);
    setSavingAssignment(true);
    try {
      const token = await getToken();
      const { conflicts } = await api.updateAssignment(token, editingAssignment.id, {
        subcontractor_id: assignmentEditForm.subcontractor_id,
        start_date: assignmentEditForm.date,
        end_date: assignmentEditForm.date
      });
      if (conflicts.length > 0) {
        setAssignmentEditWarning(
          `Heads up: this sub already has ${conflicts.length} overlapping assignment(s) in that window. Saved anyway.`
        );
      } else {
        setEditingAssignment(null);
      }
      await load();
    } catch (err) {
      setError(err.message || 'Could not save changes to that assignment.');
    } finally {
      setSavingAssignment(false);
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

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((j) => (j.address || '').toLowerCase().includes(q));
    }

    return [...result].sort((a, b) => (a.address || '').localeCompare(b.address || ''));
  }, [jobs, searchText]);

  if (loading) return <p>Loading…</p>;

  const isCreating = drawerContent === 'create';
  const editingJob = drawerContent && drawerContent !== 'create' ? drawerContent : null;
  const jobAssignments = editingJob ? assignments.filter((a) => a.job_id === editingJob.id) : [];
  // Driven only by job_id and the to-do's own completed flag — never by the
  // job's status, so a to-do on a "Completed" job still shows until it's
  // checked off itself.
  const jobTodos = editingJob ? todos.filter((t) => t.job_id === editingJob.id && !t.completed) : [];

  function renderJobRow(j, subName) {
    // "(45 yards @ 10:00 AM, Concrete + Pump)" — yardage and time combined
    // with @ when both are set; falls back to whichever one is actually
    // present (no dangling @ with nothing on one side of it) if only one
    // is set, and drops this part of the parenthetical entirely if neither is.
    const yardageTimeParts = [];
    if (j.yardage) yardageTimeParts.push(`${j.yardage} yards`);
    if (j.time) yardageTimeParts.push(formatTime(j.time));
    const yardageTimeText = yardageTimeParts.join(' @ ');

    const parenParts = [];
    if (yardageTimeText) parenParts.push(yardageTimeText);
    if (j.materials) parenParts.push(formatMaterials(j.materials));
    const parenText = parenParts.length > 0 ? ` (${parenParts.join(', ')})` : '';

    const orderStatus = materialsOrderStatus(j);
    const orderStatusText = { none: 'Materials pending', partial: 'Some materials ordered', full: 'Materials ordered' }[
      orderStatus
    ];

    return (
      <div
        key={subName ? `${j.id}-${subName}` : j.id}
        className="list-row"
        style={{ '--status-color': materialsOrderedColor(orderStatus) }}
        onClick={() => openJobDetail(j)}
      >
        {j.notes && (
          <LeafIcon
            size={13}
            title="Has notes"
            style={{ position: 'absolute', top: 10, right: 14, color: 'var(--colorNeutralForeground3)' }}
          />
        )}
        <div>
          <strong>
            {j.job_type ? `${formatJobType(j.job_type)} — ` : ''}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              {j.address}
            </a>
            {parenText}
          </strong>
          <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
            {[subName, j.materials ? orderStatusText : null].filter(Boolean).join(' • ')}
          </div>
        </div>
        <ChevronRight20Regular />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {confirmDialog}
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      {createAssignWarning && (
        <MessageBar intent="warning">
          <MessageBarBody>{createAssignWarning}</MessageBarBody>
        </MessageBar>
      )}

      <div
        ref={toolbarRef}
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          position: 'sticky',
          top: 'var(--header-height, 0px)',
          zIndex: 6,
          background: 'var(--colorNeutralBackground1)',
          padding: '6px 0'
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            appearance={activePanel === 'search' || searchText ? 'primary' : 'subtle'}
            icon={<Search20Regular />}
            aria-label="Search"
            onClick={() => setActivePanel(activePanel === 'search' ? null : 'search')}
          />
          <Button
            appearance={activePanel === 'filter' || subFilterId !== null ? 'primary' : 'subtle'}
            icon={<Filter20Regular />}
            aria-label="Filter"
            onClick={() => setActivePanel(activePanel === 'filter' ? null : 'filter')}
          />
          <Button
            appearance="primary"
            icon={<Add20Regular />}
            aria-label="Add job"
            onClick={() => setDrawerContent('create')}
          />
        </div>
      </div>

      {activePanel === 'search' && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Search" style={{ minWidth: 200, flex: 1 }}>
            <Input
              placeholder="Job address…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoFocus
            />
          </Field>
        </div>
      )}

      {activePanel === 'filter' && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Subcontractor" style={{ minWidth: 200 }}>
            {(() => {
              // If the text still exactly matches whatever's currently
              // selected, the person hasn't typed anything new since
              // picking it — clicking in to switch subs shouldn't just
              // show that same one (which is what a plain substring match
              // against its own name would do, hiding everyone else).
              // Show every other sub instead, so switching is one click.
              // The moment they actually type something different, fall
              // back to the normal search-as-you-type behavior.
              const currentSub = subcontractors.find((s) => s.id === subFilterId);
              const untouchedSinceSelection = currentSub && subFilterText === currentSub.company_name;

              const filterOptions = untouchedSinceSelection
                ? subcontractors.filter((s) => s.id !== subFilterId)
                : subcontractors.filter((s) => s.company_name.toLowerCase().includes(subFilterText.toLowerCase()));

              return (
                <Combobox
                  placeholder="Filter by subcontractor…"
                  value={subFilterText}
                  onInput={(e) => setSubFilterText(e.target.value)}
                  onOptionSelect={(_, data) => {
                    setSubFilterId(data.optionValue === 'all' ? null : Number(data.optionValue));
                    setSubFilterText(data.optionValue === 'all' ? '' : data.optionText);
                  }}
                >
                  <Option value="all">All subcontractors</Option>
                  {filterOptions.map((s) => (
                    <Option key={s.id} value={String(s.id)} text={s.company_name}>
                      {s.company_name}
                    </Option>
                  ))}
                </Combobox>
              );
            })()}
          </Field>
        </div>
      )}

      <div>
        {(() => {
          // Each visible job's active assignments — now that multiple subs
          // can work the same job (one for prep, another for the pour, or
          // the same sub back on a separate non-consecutive date), a job
          // can have more than one.
          const jobsWithAssignments = visibleJobs.map((j) => ({
            job: j,
            activeAssignments: assignments.filter(
              (a) => a.job_id === j.id && a.status !== 'cancelled' && a.status !== 'declined'
            )
          }));

          // Filtering by a specific subcontractor hides everything else,
          // unassigned jobs included — but now checks whether ANY of a
          // job's assignments match, not just a single one.
          const filtered =
            subFilterId === null
              ? jobsWithAssignments
              : jobsWithAssignments.filter((x) =>
                  x.activeAssignments.some((a) => a.subcontractor_id === subFilterId)
                );

          const unassigned = filtered.filter((x) => x.activeAssignments.length === 0).map((x) => x.job);

          // Today and future only — a fully concluded assignment drops off,
          // same rule this used to have on the Dashboard's old list view.
          const todayYMD = toYMD(new Date());

          // Master group: date only now — subcontractor no longer creates
          // its own sub-grouping, since who's assigned now shows directly
          // on each job's own tile instead. A job with multiple assignments
          // still correctly appears once per assignment — e.g. once under
          // Wednesday for Sub A and once under Monday for Sub B, since
          // those are genuinely different working days for this job.
          const dateGroups = {};

          // Pre-seed the next 28 days (today through today+27) so the
          // office can see open/unbooked days at a glance, not just days
          // that already have something on them. Skipped while actively
          // searching — someone typing an address is looking for a
          // specific match, not browsing a calendar, so a focused "no
          // matches" message serves them better than 28 empty blocks.
          if (!searchText.trim()) {
            for (let i = 0; i < 28; i++) {
              const d = new Date();
              d.setDate(d.getDate() + i);
              dateGroups[toYMD(d)] = [];
            }
          }

          for (const { job, activeAssignments } of filtered) {
            for (const a of activeAssignments) {
              if (a.end_date < todayYMD) continue;
              if (subFilterId !== null && a.subcontractor_id !== subFilterId) continue;
              const date = a.start_date;
              if (!dateGroups[date]) dateGroups[date] = [];
              dateGroups[date].push({ job, subName: a.subcontractor_name });
            }
          }
          const dateKeys = Object.keys(dateGroups).sort();

          // Within a day, order by subcontractor first — alphabetically —
          // so jobs for the same sub still land next to each other even
          // without a visual grouping header anymore. Within a given
          // subcontractor, a job with no time set comes first (unscheduled
          // work shows before the day's scheduled jobs), then remaining
          // jobs go earliest-time-first. Deliberately the opposite of the
          // no-time-goes-last convention used elsewhere in the app — this
          // sort specifically was asked to put unscheduled jobs first.
          for (const date of dateKeys) {
            dateGroups[date].sort((a, b) => {
              const subCompare = (a.subName || '').localeCompare(b.subName || '');
              if (subCompare !== 0) return subCompare;
              if (!a.job.time && !b.job.time) return 0;
              if (!a.job.time) return -1;
              if (!b.job.time) return 1;
              return a.job.time.localeCompare(b.job.time);
            });
          }

          const allDatesEmpty = dateKeys.every((d) => dateGroups[d].length === 0);
          if (unassigned.length === 0 && allDatesEmpty) {
            if (jobs.length === 0) return <p>No jobs yet. Click "Add job" to create one.</p>;
            return <p>No jobs match your search/filter.</p>;
          }

          // Hide an empty Saturday/Sunday entirely rather than even showing
          // the compact "no jobs" row — a weekend only earns a spot in the
          // list once something's actually scheduled on it.
          const visibleDateKeys = dateKeys.filter((dateKey) => {
            const dayOfWeek = new Date(`${dateKey}T00:00:00`).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return !isWeekend || dateGroups[dateKey].length > 0;
          });

          // The cutoff date for however many weeks are currently revealed.
          // Each week runs through Friday, rolling forward to the next
          // Friday if today happens to fall on a weekend, and stretching
          // to include Saturday if that Saturday specifically has an
          // active job on it. Computed iteratively rather than as a fixed
          // "+7 days" offset, since each successive week needs to check
          // its own Saturday independently.
          let weekCutoff = new Date();
          for (let w = 0; w < visibleWeeks; w++) {
            const dayOfWeek = weekCutoff.getDay();
            const daysUntilFriday = ((5 - dayOfWeek) % 7 + 7) % 7;
            weekCutoff.setDate(weekCutoff.getDate() + daysUntilFriday);
            const saturday = new Date(weekCutoff);
            saturday.setDate(saturday.getDate() + 1);
            const saturdayYMD = toYMD(saturday);
            if (dateGroups[saturdayYMD] && dateGroups[saturdayYMD].length > 0) {
              weekCutoff = saturday;
            }
            if (w < visibleWeeks - 1) {
              weekCutoff.setDate(weekCutoff.getDate() + 1);
            }
          }
          const weekCutoffYMD = toYMD(weekCutoff);
          const withinRevealedWeeks = visibleDateKeys.filter((dateKey) => dateKey <= weekCutoffYMD);
          const hasMoreWeeks = visibleWeeks < MAX_VISIBLE_WEEKS && visibleDateKeys.some((d) => d > weekCutoffYMD);

          return (
            <>
              {unassigned.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 10px' }}>Unassigned ({unassigned.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {unassigned.map((j) => renderJobRow(j))}
                  </div>
                </div>
              )}
              {withinRevealedWeeks.map((dateKey, index) => {
                const hasJobs = dateGroups[dateKey].length > 0;
                // A divider between each week — right before a Monday, as
                // long as it isn't the very first thing in the list (no
                // point opening the page with a lone divider above day one).
                const isMonday = new Date(`${dateKey}T00:00:00`).getDay() === 1;
                const showWeekDivider = isMonday && index > 0;

                if (!hasJobs) {
                  // Compact, single-line, non-sticky row — an empty day has
                  // nothing underneath it to scroll through, so there's no
                  // reason to give it the same sticky header treatment and
                  // full spacing as a day with real content. This is what
                  // was actually eating most of the screen on a light week:
                  // a handful of empty days before/after the ones that
                  // matter, each taking up as much room as a real one.
                  return (
                    <div key={dateKey}>
                      {showWeekDivider && (
                        <div style={{ borderTop: '2px solid var(--colorNeutralStroke1)', margin: '8px 0' }} />
                      )}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '4px 0',
                          fontSize: 12,
                          color: 'var(--colorNeutralForeground3)'
                        }}
                      >
                        <span>{formatDateHeader(dateKey)}</span>
                        <span>No jobs scheduled</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={dateKey}>
                    {showWeekDivider && (
                      <div style={{ borderTop: '2px solid var(--colorNeutralStroke1)', margin: '8px 0 16px' }} />
                    )}
                    <div style={{ marginBottom: 20 }}>
                      <h4
                        ref={(el) => {
                          dateHeaderRefs.current[dateKey] = el;
                        }}
                        style={{
                          margin: 0,
                          padding: '10px 0',
                          position: 'sticky',
                          top: 'calc(var(--header-height, 0px) + var(--jobs-toolbar-height, 0px))',
                          zIndex: 5,
                          background: 'var(--colorNeutralBackground1)',
                          fontSize: activeStickyDate === dateKey ? '1.25em' : undefined,
                          transition: 'font-size 0.15s ease'
                        }}
                      >
                        {formatDateHeader(dateKey)}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                        {dateGroups[dateKey].map(({ job, subName }) => renderJobRow(job, subName))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {hasMoreWeeks && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                  <Button appearance="secondary" onClick={() => setVisibleWeeks((w) => w + 1)}>
                    Show next week
                  </Button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Full-screen create view — same field set as editing an existing
          job, minus the "Assigned subcontractors" and "Open to-dos"
          sections, since those inherently need a job that already exists. */}
      <OverlayDrawer
        open={isCreating}
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
            Add a job
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <form onSubmit={handleAdd} style={{ display: 'grid', gap: 12 }}>
              <Field label="Address" required>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(newValue) => setForm({ ...form, address: newValue })}
                />
              </Field>

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
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
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
                          materials: data.checked
                            ? [...form.materials, m]
                            : form.materials.filter((x) => x !== m),
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

              <Button appearance="primary" type="submit">
                Add job
              </Button>
            </form>
          </div>
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
            {editingJob && (editingJob.job_type ? `${formatJobType(editingJob.job_type)} — ` : '') + (editingJob?.address || '')}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {editingJob && editForm && (
            <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {editingJob.created_by && (
                <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground3)' }}>
                  Created by {editingJob.created_by}
                </div>
              )}

              <div>
                <h4 style={{ marginBottom: 12 }}>Assigned subcontractors ({jobAssignments.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {jobAssignments.map((a) => (
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
                        <Button size="small" appearance="secondary" onClick={() => openEditAssignment(a)}>
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
                  {jobAssignments.length === 0 && <p>No subcontractors assigned to this job yet.</p>}
                </div>

                <div style={{ marginTop: 16 }}>
                  <h4 style={{ marginBottom: 12 }}>Assign a subcontractor</h4>
                  {assignConflictWarning && (
                    <MessageBar intent="warning" style={{ marginBottom: 12 }}>
                      <MessageBarBody>{assignConflictWarning}</MessageBarBody>
                    </MessageBar>
                  )}
                  <form onSubmit={handleAssignSub} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
                    <Field label="Subcontractor" required>
                      <Dropdown
                        placeholder="Select a subcontractor"
                        value={
                          subcontractors.find((s) => s.id === assignForm.subcontractor_id)?.company_name || ''
                        }
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
              </div>

              <form onSubmit={handleSaveEdit} style={{ display: 'grid', gap: 12 }}>
                <Field label="Address" required>
                  <AddressAutocomplete
                    value={editForm.address}
                    onChange={(newValue) => setEditForm({ ...editForm, address: newValue })}
                  />
                </Field>
                <Field label="Job type" required>
                  <Dropdown
                    placeholder="Select one or more"
                    multiselect
                    value={editForm.job_type.join(', ')}
                    selectedOptions={editForm.job_type}
                    onOptionSelect={(_, data) => setEditForm({ ...editForm, job_type: data.selectedOptions })}
                  >
                    {JOB_TYPE_OPTIONS.map((t) => (
                      <Option key={t} value={t}>
                        {t}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Time">
                  <Input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  />
                </Field>
                <Field label="Yardage">
                  <Input
                    type="number"
                    step="0.5"
                    value={editForm.yardage}
                    onChange={(e) => setEditForm({ ...editForm, yardage: e.target.value })}
                  />
                </Field>
                <Field label="Notes">
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    resize="vertical"
                  />
                </Field>
                <Field label="Materials">
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {MATERIAL_OPTIONS.map((m) => (
                      <Checkbox
                        key={m}
                        label={m}
                        checked={editForm.materials.includes(m)}
                        onChange={(_, data) =>
                          setEditForm({
                            ...editForm,
                            materials: data.checked
                              ? [...editForm.materials, m]
                              : editForm.materials.filter((x) => x !== m),
                            // Unchecking a material also clears its ordered
                            // status — no point keeping a stale "ordered"
                            // flag for something the job no longer needs.
                            ordered_materials: data.checked
                              ? editForm.ordered_materials
                              : editForm.ordered_materials.filter((x) => x !== m)
                          })
                        }
                      />
                    ))}
                  </div>
                </Field>
                {editForm.materials.length > 0 && (
                  <Field label="Materials ordered">
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {editForm.materials.map((m) => (
                        <Checkbox
                          key={m}
                          label={m}
                          checked={editForm.ordered_materials.includes(m)}
                          onChange={(_, data) =>
                            setEditForm({
                              ...editForm,
                              ordered_materials: data.checked
                                ? [...editForm.ordered_materials, m]
                                : editForm.ordered_materials.filter((x) => x !== m)
                            })
                          }
                        />
                      ))}
                    </div>
                  </Field>
                )}
                <Button appearance="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </form>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button appearance="secondary" onClick={() => handleDuplicateJob(editingJob)}>
                  Duplicate this job
                </Button>
                <Button appearance="secondary" onClick={() => handleDeleteJob(editingJob)}>
                  Delete this job
                </Button>
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

      {/* Edit an existing assignment — who's assigned, or when */}
      <OverlayDrawer
        open={editingAssignment !== null}
        onOpenChange={(_, { open }) => !open && setEditingAssignment(null)}
        position="start"
        size="small"
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={() => setEditingAssignment(null)} />
            }
          >
            Edit assignment
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {assignmentEditWarning && (
            <MessageBar intent="warning" style={{ marginBottom: 12 }}>
              <MessageBarBody>{assignmentEditWarning}</MessageBarBody>
            </MessageBar>
          )}
          <form onSubmit={handleSaveAssignmentEdit} style={{ display: 'grid', gap: 12 }}>
            <Field label="Subcontractor">
              <Dropdown
                placeholder="Select a subcontractor"
                value={
                  subcontractors.find((s) => s.id === assignmentEditForm.subcontractor_id)?.company_name || ''
                }
                onOptionSelect={(_, data) =>
                  setAssignmentEditForm({ ...assignmentEditForm, subcontractor_id: Number(data.optionValue) })
                }
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
                value={assignmentEditForm.date}
                onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, date: e.target.value })}
              />
            </Field>
            <Button appearance="primary" type="submit" disabled={savingAssignment}>
              {savingAssignment ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </DrawerBody>
      </OverlayDrawer>
    </div>
  );
}
