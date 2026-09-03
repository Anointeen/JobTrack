import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LandingRoute } from '../components/landing/LandingRoute';
import { FullScreenLoader } from '../components/common/FullScreenLoader';
import { SetNewPasswordModal } from '../components/auth/SetNewPasswordModal';

/**
 * The whole authenticated shell — layout, sidebar, header, data providers and
 * the application form modal — is split out too. An unauthenticated visitor on
 * the landing page never downloads any of it.
 */
const ProtectedLayout = lazy(() =>
  import('../components/layout/ProtectedLayout').then(m => ({ default: m.ProtectedLayout }))
);

/**
 * Protected screens are code-split.
 *
 * The landing page, the auth modals and the password-recovery screen stay in
 * the entry chunk: they are what an unauthenticated visitor needs, and making
 * them wait on a second request would slow the most common first paint. Every
 * screen behind the auth gate is fetched on demand instead.
 */
const DashboardView = lazy(() =>
  import('../components/dashboard/DashboardView').then(m => ({ default: m.DashboardView }))
);
const ApplicationsView = lazy(() =>
  import('../components/applications/ApplicationsView').then(m => ({ default: m.ApplicationsView }))
);
const ApplicationDetailRoute = lazy(() =>
  import('../components/applications/ApplicationDetailRoute').then(m => ({ default: m.ApplicationDetailRoute }))
);
const ProfileView = lazy(() =>
  import('../components/profile/ProfileView').then(m => ({ default: m.ProfileView }))
);
const SettingsView = lazy(() =>
  import('../components/settings/SettingsView').then(m => ({ default: m.SettingsView }))
);
const CalendarView = lazy(() =>
  import('../components/calendar/CalendarView').then(m => ({ default: m.CalendarView }))
);
const DocumentsView = lazy(() =>
  import('../components/placeholder/DocumentsView').then(m => ({ default: m.DocumentsView }))
);
const NotFoundPage = lazy(() =>
  import('../components/common/NotFoundPage').then(m => ({ default: m.NotFoundPage }))
);

export const AppRoutes: React.FC = () => {
  const { isPasswordRecovery } = useAuth();

  // Password recovery outranks routing entirely: the recovery link grants a
  // real session, so without this the user would land on the dashboard instead
  // of being asked to choose a new password — whatever URL they arrived at.
  if (isPasswordRecovery) {
    return <SetNewPasswordModal />;
  }

  return (
    // Outer boundary covers routes rendered outside the app chrome (404).
    // ProtectedLayout adds an inner one so the sidebar and header stay on
    // screen while an authenticated route's chunk loads.
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<LandingRoute />} />

        {/* Everything below requires an authenticated Supabase session. */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardView />} />

          {/* The detail route nests inside the list, so /applications/:id renders
              the list with the detail modal over it — linkable and refresh-safe,
              and closed naturally by the Back button. */}
          <Route path="/applications" element={<ApplicationsView />}>
            <Route path=":id" element={<ApplicationDetailRoute />} />
          </Route>

          <Route path="/profile" element={<ProfileView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/documents" element={<DocumentsView />} />
        </Route>

        {/* Convenience alias so /home behaves sensibly. */}
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
