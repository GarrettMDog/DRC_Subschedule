import { useMsal } from '@azure/msal-react';
import { loginRequest } from './msalConfig';

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
      const result = await instance.acquireTokenSilent({ ...loginRequest, account });
      return result.accessToken;
    } catch (err) {
      await instance.acquireTokenRedirect(loginRequest);
      // acquireTokenRedirect navigates away; execution doesn't continue past here.
    }
  }

  return { getToken };
}
