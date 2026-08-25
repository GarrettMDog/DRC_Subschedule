import { useMsal } from '@azure/msal-react';
import { loginRequest } from './msalConfig';

// MSAL's silent renewal can fall back to a hidden iframe, which Microsoft's
// own docs confirm can hang for up to 60 seconds in some browsers (tracking
// prevention / third-party cookie blocking commonly triggers this). Rather
// than let the UI sit frozen that whole time, give up much sooner and fall
// back to an interactive redirect instead.
const SILENT_TOKEN_TIMEOUT_MS = 6000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('silent-token-timeout')), ms))
  ]);
}

/**
 * Returns a getToken() function that pages call right before hitting the
 * API. Falls back to a redirect (not a popup) if the silent refresh fails —
 * this function often runs automatically on page load rather than from a
 * direct click, and browsers routinely block popups in that situation.
 * A redirect can't be blocked the same way; the trade-off is a full page
 * navigation, which is an acceptable rare case (expired session) rather
 * than the common path.
 */
export function useApiToken() {
  const { instance, accounts } = useMsal();

  async function getToken() {
    const account = accounts[0];

    if (!account) {
      // No signed-in account yet — either MSAL is still processing the
      // redirect from login, or the session genuinely isn't there. Surface
      // this as a real error instead of hanging, so the caller can show it.
      throw new Error('Not signed in yet. Try refreshing the page in a moment.');
    }

    try {
      const result = await withTimeout(
        instance.acquireTokenSilent({ ...loginRequest, account }),
        SILENT_TOKEN_TIMEOUT_MS
      );
      return result.accessToken;
    } catch (err) {
      // Covers both a genuine MSAL rejection AND our own timeout above.
      await instance.acquireTokenRedirect(loginRequest);
      // acquireTokenRedirect navigates away; execution doesn't continue past here.
    }
  }

  return { getToken };
}
