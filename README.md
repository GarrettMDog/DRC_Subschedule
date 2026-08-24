# SubSchedule (placeholder name — rename freely)

A standalone subcontractor scheduling tool for DRC. Separate app, separate repo,
separate deploy from Bedrock — no shared data or code between them.

**Live at:** https://drc-subschedule.vercel.app (frontend, Vercel) · backend on Render.

## Two-tier access

- **Office/PMs** — sign in with Microsoft (Entra ID), own app registration (not Bedrock's).
  Full access: manage subcontractors, jobs, and assignments.
- **Subcontractors** — no Microsoft account. Each sub gets a unique, persistent link
  (`/my-schedule/:token`) shown in the office directory with a one-click Copy button.
  Opening it shows only their own schedule — no password, no login screen. They can
  confirm or decline each assignment.

## Stack

Same tools as Bedrock, so nothing new to learn:
- **Backend**: Node/Express + SQLite (`better-sqlite3`), deployed on Render
- **Frontend**: React (Vite) + Fluent UI, deployed on Vercel
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

## Setting up the Entra ID app registration

This ended up being more involved than a typical "grant User.Read" setup, because the
office side calls **its own backend API**, not Microsoft Graph — that requires the app
to expose its own scope rather than just requesting a Graph permission. Steps, in order:

1. **Register the app** — Entra admin center → App registrations → New registration.
   Name it (e.g. "SubSchedule"), account type: single tenant (this org only). Don't add
   a redirect URI on this screen — that's configured next.

2. **Add a redirect URI** — open the app → **Authentication** → **Add Redirect URI** →
   choose **Single-page application** (not "Web" — MSAL's browser flow requires this
   specific platform type) → enter `http://localhost:5173` for local dev. Add your
   production Vercel URL here too once it's deployed (e.g. `https://drc-subschedule.vercel.app`).

3. **Expose an API** — left sidebar → **Expose an API** → **Add** next to Application ID
   URI → accept the default (`api://<client-id>`) → **Save**. Then **Add a scope**:
   - Scope name: `access_as_user`
   - Who can consent: Admins and users
   - State: Enabled

4. **Grant the app permission to request that scope from itself** — still on this same
   app registration → **API permissions** → **Add a permission** → **My APIs** tab →
   select this same app → select `access_as_user` → **Add permissions** → click
   **Grant admin consent for [org]** and confirm. Without this step, sign-in works but
   every API call comes back `401`.

5. **Grab the IDs** — Overview page → copy **Application (client) ID** and
   **Directory (tenant) ID**. These go in both `.env` files (backend: `ENTRA_TENANT_ID` /
   `ENTRA_CLIENT_ID`; frontend: `VITE_ENTRA_TENANT_ID` / `VITE_ENTRA_CLIENT_ID`).

6. **Frontend requests the custom scope, not `User.Read`** — already set in
   `frontend/src/auth/msalConfig.js`:
   ```js
   scopes: [`api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/access_as_user`]
   ```

### A real quirk worth knowing about

Despite everything above being configured for the v2.0 endpoint, this app registration
issues **v1.0-style tokens** for the custom API scope — confirmed by decoding a real
token, not assumed from docs (which say v2.0 tokens always use the bare client ID as
`aud`; in practice, with a custom `api://` scope, that's not what showed up here):

- `aud` → `api://<client-id>` (the full URI, not just the GUID)
- `iss` → `https://sts.windows.net/<tenant-id>/` (not `login.microsoftonline.com/.../v2.0`)

`backend/middleware/requireOfficeAuth.js` validates against these actual values
(`EXPECTED_AUDIENCE` / `EXPECTED_ISSUER` constants) — already handled, nothing to
configure, just worth understanding if auth ever mysteriously breaks again after
touching the app registration. If token verification ever fails unexpectedly, check
Render's logs — failures are logged with the specific `jsonwebtoken` error message
(audience/issuer/expiry/signature), not just a generic "invalid token."

## Known deployment gotchas (all already fixed, documented so they don't recur)

- **`VITE_` env vars are baked in at build time**, not read at runtime. Changing one in
  Vercel does nothing until you trigger a fresh deploy — and if you suspect a stale
  build, redeploy with the build cache unchecked to be sure.
- **Render's `FRONTEND_ORIGIN` must exactly match the deployed frontend URL** for CORS
  to allow it, and only takes effect after an actual restart/redeploy, not just saving
  the field. The backend normalizes trailing slashes/whitespace automatically now, but
  the domain itself still has to match.
- **Client-side routing needs `frontend/vercel.json`** with a catch-all rewrite to
  `index.html`. Without it, direct links (like a sub's schedule link opened fresh from
  an email) 404, even though in-app navigation works fine — Vercel doesn't know this is
  a single-page app unless told explicitly.

## What's built (v1 scaffold)

- Subcontractor directory (add/edit, auto-generates each sub's schedule link, shown as a
  full copyable URL with a one-click Copy button)
- Job list (add/edit)
- Assign a sub to a job with a date range — soft conflict warning if the sub is already
  booked over an overlapping window (doesn't block the save, just flags it)
- Office dashboard listing all assignments with status
- Public, token-gated schedule page for subs, with Confirm / Decline (+ optional decline reason)
- Real error messages surfaced in the UI on failure (not a silent infinite spinner)

All tested end-to-end live, not just locally: sign-in, CORS, token validation, direct
sub-link routing, and the full assign → confirm/decline → dashboard-update loop.

## Not built yet — see `open-items-tracker.md`

Notification (email/SMS) on new assignment or on confirm/decline (currently: copy the
link from the directory and send it manually), calendar-style visual view (current
dashboard is a flat list), persistent disk on Render (currently ephemeral — data doesn't
survive a restart, which is fine for testing but must be added before any real
subcontractor relies on this), and role restrictions on the office side (any signed-in
company user currently has full access to everything).

## A note on repo visibility

This repo is currently **public** (intentional, for ease of debugging during initial
setup) — no secrets are committed (`.env` is gitignored, only `.env.example` templates
are tracked), but it should be flipped to **private** once active setup wraps up.
