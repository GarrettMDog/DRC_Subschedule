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
  scopes: ['User.Read']
};
