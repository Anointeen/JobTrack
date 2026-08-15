import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { ApplicationsProvider } from '../../context/ApplicationsContext';
import { ApplicationFormProvider } from '../../context/ApplicationFormContext';
import { OnboardingModal } from '../auth/OnboardingModal';
import { AppLayout } from './AppLayout';
import { Skeleton } from '../common/Skeleton';

export const FullScreenLoader: React.FC = () => (
  <div
    style={{
      display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg-app)', padding: '2rem'
    }}
  >
    <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
      <Skeleton height="40px" width="180px" borderRadius="10px" className="mb-4" />
      <Skeleton height="20px" width="100%" borderRadius="6px" />
    </div>
  </div>
);

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
