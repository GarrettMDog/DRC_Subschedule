require('dotenv').config();
const express = require('express');
const cors = require('cors');

const requireOfficeAuth = require('./middleware/requireOfficeAuth');
const subcontractorsRouter = require('./routes/subcontractors');
const jobsRouter = require('./routes/jobs');
const assignmentsRouter = require('./routes/assignments');
const myScheduleRouter = require('./routes/mySchedule');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- Office/PM routes: require Entra ID (Teams SSO) auth ---
app.use('/api/subcontractors', requireOfficeAuth, subcontractorsRouter);
app.use('/api/jobs', requireOfficeAuth, jobsRouter);
app.use('/api/assignments', requireOfficeAuth, assignmentsRouter);

// --- Sub-facing routes: passwordless, gated by their unique link token ---
app.use('/api/my-schedule/:token', myScheduleRouter);

app.listen(PORT, () => {
  console.log(`SubSchedule backend listening on port ${PORT}`);
});
