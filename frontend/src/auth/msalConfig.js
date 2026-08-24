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
  scopes: [`api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/access_as_user`]
};