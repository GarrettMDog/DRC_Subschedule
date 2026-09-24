import { Routes, Route } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { Button, Spinner } from '@fluentui/react-components';
import { loginRequest } from './auth/msalConfig';
import { useIsTeams } from './auth/TeamsContext';
import OfficeLayout from './components/OfficeLayout';
import OfficeDashboard from './pages/OfficeDashboard';
import SubcontractorDirectory from './pages/SubcontractorDirectory';
import JobList from './pages/JobList';
import Services from './pages/Services';
import SubSchedule from './pages/SubSchedule';

function SignInGate() {
  const { instance } = useMsal();
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', gap: 16 }}>
      <h2>CrOps</h2>
      <Button appearance="primary" onClick={() => instance.loginRedirect(loginRequest)}>
        Sign in with Microsoft
      </Button>
    </div>
  );
}

export default function App() {
  const isTeams = useIsTeams();

  const officeRoutes = (
    <OfficeLayout>
      <Routes>
        <Route path="/" element={<JobList />} />
        <Route path="/calendar" element={<OfficeDashboard />} />
        <Route path="/subcontractors" element={<SubcontractorDirectory />} />
        <Route path="/services" element={<Services />} />
      </Routes>
    </OfficeLayout>
  );

  return (
    <Routes>
      {/* Public: subcontractors open this from an emailed/texted link, no login */}
      <Route path="/my-schedule/:linkToken" element={<SubSchedule />} />

      {/* Office/PM side. Inside Teams, the host itself already establishes
          who's signed in — getTeamsToken() (used by useApiToken) handles
          that silently, so there's no separate sign-in screen to show here.
          In a regular browser tab, this is the exact same MSAL redirect
          flow as before, untouched. */}
      <Route
        path="/*"
        element={
          isTeams ? (
            officeRoutes
          ) : (
            <>
              <AuthenticatedTemplate>{officeRoutes}</AuthenticatedTemplate>
              <UnauthenticatedTemplate>
                <SignInGate />
              </UnauthenticatedTemplate>
            </>
          )
        }
      />
    </Routes>
  );
}
