import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { ApplicationsProvider } from '../../context/ApplicationsContext';
import { ApplicationFormProvider } from '../../context/ApplicationFormContext';
import { OnboardingModal } from '../auth/OnboardingModal';
import { AppLayout } from './AppLayout';
import { FullScreenLoader } from '../common/FullScreenLoader';

/**
 * Gate for every authenticated route.
 *
 * Order matters:
 *   1. While the session is resolving, render nothing protected — otherwise a
 *      refresh on /applications would bounce to the landing page before
 *      Supabase has restored the session.
 *   2. No session -> redirect to the landing/login experience, remembering the
 *      intended destination so login can return there.
 *   3. Session but onboarding incomplete -> onboarding, exactly as before.
 *   4. Otherwise render the app chrome with the routed screen inside.
 *
 * The providers sit below the gate so application data is only ever fetched for
 * a fully authenticated, onboarded user.
 */
export const ProtectedLayout: React.FC = () => {
  const { user, loading, needsOnboarding } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (needsOnboarding) {
    return <OnboardingModal isOpen onComplete={() => { /* provider mounts on completion */ }} />;
  }

  return (
    <ToastProvider>
      <ApplicationsProvider>
        <ApplicationFormProvider>
          <AppLayout />
        </ApplicationFormProvider>
      </ApplicationsProvider>
    </ToastProvider>
  );
};
