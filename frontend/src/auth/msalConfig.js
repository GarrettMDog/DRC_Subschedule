// Same Entra ID app-registration pattern as Bedrock, but its own registration
// (separate app, separate client ID) since this is a standalone tool.
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID}`,
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'localStorage'
  }
};

export const loginRequest = {
  // Requests a token whose audience is THIS app (via its own exposed API
  // scope), not Microsoft Graph. The backend validates audience === its own
  // Client ID, so a Graph-scoped token (e.g. 'User.Read') would always be
  // rejected as invalid — it was never meant for this API in the first place.
  // The Application ID URI includes the hosting domain (not just the bare
  // client ID) specifically so Teams SSO can validate the tab's origin
  // against it — a bare api://<client-id> URI works for this browser flow
  // alone, but Teams itself requires the domain-based form.
  scopes: [
    `api://${import.meta.env.VITE_ENTRA_APP_URI_DOMAIN}/${import.meta.env.VITE_ENTRA_CLIENT_ID}/access_as_user`
  ]
};