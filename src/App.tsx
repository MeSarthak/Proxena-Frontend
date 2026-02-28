import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RedirectIfAuthed } from './components/layout/Guards';
import { AppLayout } from './components/layout/AppLayout';

import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/LoginPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import DashboardPage    from './pages/DashboardPage';
import ExercisesPage    from './pages/ExercisesPage';
import SessionPage      from './pages/SessionPage';
import SessionSummaryPage from './pages/SessionSummaryPage';
import AnalyticsPage    from './pages/AnalyticsPage';
import SubscriptionPage from './pages/SubscriptionPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page — public, always accessible */}
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

        {/* Full-screen session routes (no sidebar) */}
        <Route
          path="/session/:sessionPublicId"
          element={
            <RequireAuth>
              <SessionPage />
            </RequireAuth>
          }
        />
        <Route
          path="/sessions/:publicId"
          element={
            <RequireAuth>
              <SessionSummaryPage />
            </RequireAuth>
          }
        />

        {/* App shell with sidebar */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/exercises"    element={<ExercisesPage />} />
          <Route path="/analytics"    element={<AnalyticsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
