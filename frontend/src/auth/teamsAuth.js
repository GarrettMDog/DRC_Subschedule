import { app, authentication } from '@microsoft/teams-js';

// Same idea as the MSAL silent-token timeout — app.initialize() only
// resolves when actually running inside a Teams-compatible host (Teams,
// Outlook, or the Microsoft 365 app). In a normal browser tab it just
// hangs, since there's no host to answer it. Give up quickly and fall back
// to the regular browser sign-in flow rather than block page load.
const TEAMS_INIT_TIMEOUT_MS = 2000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('teams-init-timeout')), ms))
  ]);
}

/**
 * Resolves true only when genuinely running inside Teams (or another host
 * that embeds this app the same way, like Outlook). Everywhere else —
 * including a completely normal browser tab hitting the same URL — this
 * resolves false quickly, and the app falls back to the existing MSAL
 * redirect flow, untouched.
 */
export async function isRunningInTeams() {
  try {
    await withTimeout(app.initialize(), TEAMS_INIT_TIMEOUT_MS);
    console.log('Teams context detected — using silent Teams sign-in.');
    return true;
  } catch (err) {
    console.log('Not running inside Teams (or detection timed out) — using regular browser sign-in.', err.message);
    return false;
  }
}

/**
 * Gets a fresh Entra access token directly from the Teams host — no
 * redirect, no popup, no separate sign-in screen. Teams already knows who's
 * signed in; this just asks it to vouch for that identity to our own API.
 * Per Microsoft's own guidance, this is meant to be called fresh each time
 * it's needed, not cached client-side — Teams itself handles caching and
 * silent renewal internally.
 */
export async function getTeamsToken() {
  return authentication.getAuthToken();
}
