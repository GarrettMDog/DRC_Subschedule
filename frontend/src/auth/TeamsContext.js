import { createContext, useContext } from 'react';

// Whether this session is running inside Teams (or another host that embeds
// the app the same way). Set once at startup in main.jsx, before anything
// else renders. Defaults to false so any component reading this outside the
// provider — which shouldn't happen, but just in case — falls back to the
// regular browser/MSAL behavior rather than silently misbehaving.
export const TeamsContext = createContext({ isTeams: false });

export function useIsTeams() {
  return useContext(TeamsContext).isTeams;
}
