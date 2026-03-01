import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RedirectIfAuthed, RequireProfile } from './components/layout/Guards';
import { AppLayout } from './components/layout/AppLayout';

import LandingPage        from './pages/LandingPage';
import LoginPage          from './pages/LoginPage';
import ProfileSetupPage   from './pages/ProfileSetupPage';
import DashboardPage      from './pages/DashboardPage';
import ExercisesPage      from './pages/ExercisesPage';
import SessionPage        from './pages/SessionPage';
import SessionSummaryPage from './pages/SessionSummaryPage';
import AnalyticsPage      from './pages/AnalyticsPage';
import SubscriptionPage   from './pages/SubscriptionPage';
import SettingsPage       from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page — public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth pages */}
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/setup"
          element={
            <RequireAuth>
              <ProfileSetupPage />
            </RequireAuth>
          }
        />

        {/* Full-screen session routes (no sidebar) — require auth + profile */}
        <Route
          path="/session/:sessionPublicId"
          element={
            <RequireAuth>
              <RequireProfile>
                <SessionPage />
              </RequireProfile>
            </RequireAuth>
          }
        />
        <Route
          path="/sessions/:publicId"
          element={
            <RequireAuth>
              <RequireProfile>
                <SessionSummaryPage />
              </RequireProfile>
            </RequireAuth>
          }
        />

        {/* App shell with sidebar — require auth + profile */}
        <Route
          element={
            <RequireAuth>
              <RequireProfile>
                <AppLayout />
              </RequireProfile>
            </RequireAuth>
          }
        >
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/exercises"    element={<ExercisesPage />} />
          <Route path="/analytics"    element={<AnalyticsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/settings"     element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
