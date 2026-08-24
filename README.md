# SubSchedule (placeholder name — rename freely)

A standalone subcontractor scheduling tool for [subsidiary]. Separate app, separate repo,
separate deploy from Bedrock — no shared data or code between them.

## Two-tier access

- **Office/PMs** — sign in with Teams SSO (Entra ID), same pattern as Bedrock but its own
  app registration. Full access: manage subcontractors, jobs, and assignments.
- **Subcontractors** — no Microsoft account. Each sub gets a unique, persistent link
  (`/my-schedule/:token`) sent by email. Opening it shows only their own schedule — no
  password, no login screen. They can confirm or decline each assignment.

## Stack

Same tools as Bedrock, so nothing new to learn:
- **Backend**: Node/Express + SQLite (`better-sqlite3`), deploy on Render with a persistent disk
- **Frontend**: React (Vite) + Fluent UI, deploy on Vercel
- **Auth**: MSAL (`@azure/msal-browser`, `@azure/msal-react`) for the office side

## Local setup

### Backend
```
cd backend
npm install
cp .env.example .env   # fill in ENTRA_TENANT_ID / ENTRA_CLIENT_ID
npm run dev
```
Runs on `http://localhost:4000`. The SQLite file and schema are created automatically on
first run — no migration step.

### Frontend
```
cd frontend
npm install
cp .env.example .env   # fill in VITE_ENTRA_CLIENT_ID / VITE_ENTRA_TENANT_ID
npm run dev
```
Runs on `http://localhost:5173`.

## What's built (v1 scaffold)

- Subcontractor directory (add/edit, auto-generates each sub's schedule link)
- Job list (add/edit)
- Assign a sub to a job with a date range — soft conflict warning if the sub is already
  booked over an overlapping window (doesn't block the save, just flags it)
- Office dashboard listing all assignments with status
- Public, token-gated schedule page for subs, with Confirm / Decline (+ optional decline reason)

All of the above has been tested end-to-end (server boots, auth gates correctly, conflict
detection returns overlapping assignments, confirm/decline both work, bad token → 404).

## Not built yet — see `open-items-tracker.md`

Notification (email/SMS) on new assignment or on confirm/decline, calendar-style visual view
(current dashboard is a flat list), and the Entra app registration itself (needs a tenant ID
and client ID from Azure — same process as Bedrock's).

## Setting up the Entra ID app registration

Same steps as Bedrock's Teams SSO setup: register a new app in Azure Entra ID (separate
registration — don't reuse Bedrock's client ID), add a redirect URI for your Vercel URL,
grant `User.Read`, and drop the tenant/client IDs into both `.env` files.
