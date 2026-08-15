import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LandingRoute } from '../components/landing/LandingRoute';
import { ProtectedLayout } from '../components/layout/ProtectedLayout';
import { DashboardView } from '../components/dashboard/DashboardView';
import { ApplicationsView } from '../components/applications/ApplicationsView';
import { ApplicationDetailRoute } from '../components/applications/ApplicationDetailRoute';
import { ProfileView } from '../components/profile/ProfileView';
import { SettingsView } from '../components/settings/SettingsView';
import { CalendarView } from '../components/placeholder/CalendarView';
import { DocumentsView } from '../components/placeholder/DocumentsView';
import { NotFoundPage } from '../components/common/NotFoundPage';
import { SetNewPasswordModal } from '../components/auth/SetNewPasswordModal';

export const AppRoutes: React.FC = () => {
  const { isPasswordRecovery } = useAuth();

  // Password recovery outranks routing entirely: the recovery link grants a
  // real session, so without this the user would land on the dashboard instead
  // of being asked to choose a new password — whatever URL they arrived at.
  if (isPasswordRecovery) {
    return <SetNewPasswordModal />;
  }

  return (
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
  );
};
