import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, MailCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onOpenForgotPassword?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signup',
  onOpenForgotPassword
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /**
   * Set when sign-up succeeded but the project requires email confirmation.
   * This is a success state and is rendered as one — it used to be thrown as an
   * Error and shown in the red banner below.
   */
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const { signUp, logIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password || (mode === 'signup' && !fullName)) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'signup') {
        const outcome = await signUp(email, password, fullName);
        if (outcome.status === 'confirmation_required') {
          // Success, but there is no session yet. Stay open and show the
          // confirmation state rather than closing into a signed-out app.
          setConfirmationSentTo(outcome.email);
          return;
        }
      } else {
        await logIn(email, password);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred during authentication. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Sign in and sign up are distinct experiences reached from one component, so
   * switching must behave like arriving at a new screen: the stale error from
   * the previous screen is cleared, the password is discarded rather than
   * carried across, and focus moves to that screen's first field. Without the
   * focus move, a keyboard user activates "Sign up" and their focus stays on a
   * link that no longer exists.
   */
  const switchMode = (newMode: 'login' | 'signup') => {
    if (newMode !== mode) setPassword('');
    setMode(newMode);
    setErrorMsg('');
    setConfirmationSentTo(null);
    setPendingFocus(true);
  };

  const [pendingFocus, setPendingFocus] = useState(false);
  const fullNameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!pendingFocus) return;
    // Each screen leads with a different field: sign up starts at Full Name,
    // sign in at Email. Two refs rather than one conditional ref, so a single
    // commit cannot attach and detach the same ref in an unhelpful order.
    const target = mode === 'signup' ? fullNameRef.current : emailRef.current;
    target?.focus();
    setPendingFocus(false);
  }, [pendingFocus, mode]);

  /**
   * The modal stays mounted while closed, so `initialMode` — which only seeds
   * useState once — would be ignored on every reopen: choosing "Sign in" and
   * later "Get started" would reopen on whichever screen was last shown. Each
   * opening is a fresh arrival at the screen the caller asked for.
   */
  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setErrorMsg('');
    setConfirmationSentTo(null);
  }, [isOpen, initialMode]);

  const handleClose = () => {
    setConfirmationSentTo(null);
    setErrorMsg('');
    onClose();
  };

  // --- Success state: confirmation email sent -------------------------------
  if (confirmationSentTo) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Confirm your email" maxWidth="460px">
        <div role="status" style={{ textAlign: 'center', padding: '0.5rem 0 1rem 0' }}>
          <div
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <MailCheck size={30} aria-hidden="true" />
          </div>

          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
            Account created
          </h3>

          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
            We've sent a confirmation link to{' '}
            <strong style={{ color: 'var(--text-heading)', overflowWrap: 'anywhere' }}>
              {confirmationSentTo}
            </strong>.
          </p>

          <ol
            style={{
              textAlign: 'left', margin: '0 auto 1.5rem auto', maxWidth: '340px',
              paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)',
              display: 'flex', flexDirection: 'column', gap: '0.375rem', lineHeight: 1.5
            }}
          >
            <li>Open the email and select the confirmation link.</li>
            <li>Come back here and log in.</li>
            <li>No email after a few minutes? Check your spam folder.</li>
          </ol>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => switchMode('login')}
            style={{ width: '100%' }}
          >
            Continue to log in
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'signup' ? 'Create your account' : 'Sign in'}
      maxWidth="460px"
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div 
          style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            backgroundColor: 'var(--primary-50)', 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem'
          }}
        >
          <Briefcase size={24} color="var(--primary-text)" />
        </div>
        <h3 style={{ fontSize: '1.25rem' }}>
          {mode === 'signup' ? 'Start tracking your career' : 'Welcome back'}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          {mode === 'signup' 
            ? 'Organize applications, prepare interviews, and boost your job search.' 
            : 'Access your job tracking dashboard and performance stats.'}
        </p>
      </div>

      {errorMsg && (
        <div 
          style={{ 
            padding: '0.75rem 1rem', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--meta-danger-bg)', 
            border: '1px solid var(--rose-200)',
            color: 'var(--meta-danger-text)',
            fontSize: '0.84375rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div className="form-group">
            <label className="form-label" htmlFor="auth-full-name">
              Full Name <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon 
                size={18} 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} 
              />
              <input
                id="auth-full-name"
                ref={fullNameRef}
                type="text"
                className="input-control"
                placeholder="e.g. Alex Morgan"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
                required={mode === 'signup'}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="auth-email-address">
            Email Address <span className="required">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Mail 
              size={18} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} 
            />
            <input
              id="auth-email-address"
              ref={emailRef}
              type="email"
              className="input-control"
              placeholder="alex@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ paddingLeft: '2.375rem' }}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="auth-password">
              Password <span className="required">*</span>
            </label>
            {mode === 'login' && onOpenForgotPassword && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, fontSize: '0.8125rem', color: 'var(--primary-text)' }}
                onClick={() => {
                  onClose();
                  onOpenForgotPassword();
                }}
              >
                Forgot Password?
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <Lock 
              size={18} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} 
            />
            <input
              id="auth-password"
              type="password"
              className="input-control"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingLeft: '2.375rem' }}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={submitting}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {submitting ? (
            'Processing...'
          ) : (
            <>
              {mode === 'signup' ? 'Create account' : 'Sign in'}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div 
        style={{ 
          marginTop: '1.5rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid var(--border-color)', 
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-muted)'
        }}
      >
        {mode === 'signup' ? (
          <p>
            Already have an account?{' '}
            <button 
              type="button" 
              onClick={() => switchMode('login')}
              style={{ background: 'none', border: 'none', color: 'var(--primary-text)', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign in
            </button>
          </p>
        ) : (
          <p>
            Don't have an account yet?{' '}
            <button 
              type="button" 
              onClick={() => switchMode('signup')}
              style={{ background: 'none', border: 'none', color: 'var(--primary-text)', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign up
            </button>
          </p>
        )}
      </div>
    </Modal>
  );
};
