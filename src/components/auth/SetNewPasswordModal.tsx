import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { Lock, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Final step of the Supabase password-recovery flow.
 *
 * Reached when the user opens the recovery link from their email. Supabase
 * exchanges the link for a short-lived session and emits PASSWORD_RECOVERY;
 * AuthContext flips `isPasswordRecovery` and App renders this instead of the
 * dashboard, so a recovery session can never be mistaken for a normal login.
 *
 * The new password goes straight to supabase.auth.updateUser. It is never
 * logged, stored in localStorage, or sent anywhere else, and no service-role
 * credential is involved.
 */
export const SetNewPasswordModal: React.FC = () => {
  const { updatePassword, completePasswordRecovery, cancelPasswordRecovery, logOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('The two passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await updatePassword(password);
      setPassword('');
      setConfirmPassword('');
      setSucceeded(true);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'We could not update your password. The recovery link may have expired — request a new one.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Success: sign the recovery session out so the new password is used to log in.
  const handleFinish = async () => {
    completePasswordRecovery();
    await logOut();
  };

  if (succeeded) {
    return (
      <Modal isOpen onClose={handleFinish} title="Password Updated" maxWidth="440px">
        <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem 0' }}>
          <div
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'var(--emerald-50)', color: 'var(--emerald-600)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <CheckCircle size={32} />
          </div>
          <h4 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
            Your password has been changed
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            You can now log in to JobTrack with your new password.
          </p>
          <button className="btn btn-primary btn-lg" onClick={handleFinish} style={{ width: '100%' }}>
            Continue to Log In
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      // Non-dismissible: a stray Escape or backdrop click would drop the
      // recovery session and force the user to request a fresh email. Leaving
      // is done deliberately via the Cancel button below.
      onClose={() => {}}
      title="Set a New Password"
      maxWidth="440px"
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '48px', height: '48px', borderRadius: '12px',
            backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.75rem'
          }}
        >
          <ShieldCheck size={24} />
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Choose a new password for your account. This link can only be used once.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--rose-50)', border: '1px solid var(--rose-200)',
            color: 'var(--rose-700)', fontSize: '0.84375rem',
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="reset-new-password">
            New Password <span className="required">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              id="reset-new-password"
              type="password"
              className="input-control"
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              style={{ paddingLeft: '2.375rem' }}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reset-confirm-new-password">
            Confirm New Password <span className="required">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              id="reset-confirm-new-password"
              type="password"
              className="input-control"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
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
          {submitting ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>

      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => { void cancelPasswordRecovery(); }}
          disabled={submitting}
        >
          Cancel and return to sign in
        </button>
      </div>
    </Modal>
  );
};
