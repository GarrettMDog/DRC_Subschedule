import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { FluentProvider } from '@fluentui/react-components';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './auth/msalConfig';
import { subscheduleTheme, subscheduleDarkTheme } from './theme';
import './styles.css';
import App from './App';

const msalInstance = new PublicClientApplication(msalConfig);

// Follows the OS/browser dark-mode preference, live — not just read once at
// load. If someone flips their system theme while the app is already open,
// this picks it up immediately rather than needing a page refresh.
function useSystemColorScheme() {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => setIsDark(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return isDark;
}

function ThemedApp() {
  const isDark = useSystemColorScheme();

  return (
    <FluentProvider theme={isDark ? subscheduleDarkTheme : subscheduleTheme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </FluentProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <ThemedApp />
    </MsalProvider>
  </React.StrictMode>
);
