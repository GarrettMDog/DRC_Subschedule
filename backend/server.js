require('dotenv').config();
const express = require('express');
const cors = require('cors');

const requireOfficeAuth = require('./middleware/requireOfficeAuth');
const subcontractorsRouter = require('./routes/subcontractors');
const jobsRouter = require('./routes/jobs');
const assignmentsRouter = require('./routes/assignments');
const myScheduleRouter = require('./routes/mySchedule');
const serviceAssigneesRouter = require('./routes/serviceAssignees');
const todosRouter = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 4000;

// Normalized so a trailing slash or stray whitespace from copy-pasting the
// Vercel URL into Render's env var field doesn't silently break the exact
// string match CORS does under the hood.
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .trim()
  .replace(/\/$/, '');

app.use(
  cors({
    origin: FRONTEND_ORIGIN
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- Office/PM routes: require Entra ID (Teams SSO) auth ---
app.use('/api/subcontractors', requireOfficeAuth, subcontractorsRouter);
app.use('/api/jobs', requireOfficeAuth, jobsRouter);
app.use('/api/assignments', requireOfficeAuth, assignmentsRouter);
app.use('/api/service-assignees', requireOfficeAuth, serviceAssigneesRouter);
app.use('/api/todos', requireOfficeAuth, todosRouter);

// --- Sub-facing routes: passwordless, gated by their unique link token ---
app.use('/api/my-schedule/:token', myScheduleRouter);

app.listen(PORT, () => {
  console.log(`SubSchedule backend listening on port ${PORT}`);
  console.log(`CORS allowing origin: ${FRONTEND_ORIGIN}`);
});
