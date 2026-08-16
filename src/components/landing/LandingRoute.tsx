import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LandingPage } from './LandingPage';
import { AuthModal } from '../auth/AuthModal';
import { ForgotPasswordModal } from '../auth/ForgotPasswordModal';
import { FullScreenLoader } from '../common/FullScreenLoader';

interface LocationState {
  from?: { pathname: string; search?: string };
}

/**
 * Public route at "/".
 *
 * Signed-in users are sent onward: to the destination they originally asked
 * for if they were bounced here by the protected gate, otherwise the dashboard.
 * That is what makes "log in, land where you meant to go" work.
 */
export const LandingRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  if (loading) return <FullScreenLoader />;

  if (user) {
    const from = (location.state as LocationState | null)?.from;
    const target =
      from?.pathname && from.pathname !== '/'
        ? `${from.pathname}${from.search ?? ''}`
        : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return (
    <>
      <LandingPage
        onOpenSignup={() => {
          setAuthMode('signup');
          setShowAuthModal(true);
        }}
        onOpenLogin={() => {
          setAuthMode('login');
          setShowAuthModal(true);
        }}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
        onOpenForgotPassword={() => setShowForgotPasswordModal(true)}
      />

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onBackToLogin={() => {
          setAuthMode('login');
          setShowAuthModal(true);
        }}
      />
    </>
  );
};
