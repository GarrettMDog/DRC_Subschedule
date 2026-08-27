import { Routes, Route } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { Button, Spinner } from '@fluentui/react-components';
import { loginRequest } from './auth/msalConfig';
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
      <h2>SubSchedule</h2>
      <Button appearance="primary" onClick={() => instance.loginRedirect(loginRequest)}>
        Sign in with Microsoft
      </Button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public: subcontractors open this from an emailed/texted link, no login */}
      <Route path="/my-schedule/:linkToken" element={<SubSchedule />} />

      {/* Office/PM side: everything else requires Teams SSO */}
      <Route
        path="/*"
        element={
          <>
            <AuthenticatedTemplate>
              <OfficeLayout>
                <Routes>
                  <Route path="/" element={<OfficeDashboard />} />
                  <Route path="/subcontractors" element={<SubcontractorDirectory />} />
                  <Route path="/jobs" element={<JobList />} />
                  <Route path="/services" element={<Services />} />
                </Routes>
              </OfficeLayout>
            </AuthenticatedTemplate>
            <UnauthenticatedTemplate>
              <SignInGate />
            </UnauthenticatedTemplate>
          </>
        }
      />
    </Routes>
  );
}
