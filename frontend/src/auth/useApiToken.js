import { useMsal } from '@azure/msal-react';
import { loginRequest } from './msalConfig';

/**
 * Returns a getToken() function that pages call right before hitting the
 * API. Falls back to an interactive popup only if the silent refresh fails
 * (e.g. the session genuinely expired).
 */
export function useApiToken() {
  const { instance, accounts } = useMsal();

  async function getToken() {
    const account = accounts[0];
    try {
      const result = await instance.acquireTokenSilent({ ...loginRequest, account });
      return result.accessToken;
    } catch (err) {
      const result = await instance.acquireTokenPopup(loginRequest);
      return result.accessToken;
    }
  }

  return { getToken };
}
