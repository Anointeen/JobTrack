import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onBackToLogin
}) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setErrorMsg('');
    try {
      setSubmitting(true);
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset instructions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Your Password"
      maxWidth="440px"
    >
      {!submitted ? (
        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
            Enter your account email address below and we'll send you instructions to reset your password.
          </p>

          {errorMsg && (
            <p className="form-error" style={{ marginBottom: '1rem' }}>{errorMsg}</p>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={18} 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} 
              />
              <input
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

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            {submitting ? 'Sending Link...' : 'Send Reset Link'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--emerald-50)', 
              color: 'var(--emerald-600)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <CheckCircle size={32} />
          </div>
          <h4 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Check Your Email</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.5rem' }}>
            We've sent password reset instructions to <strong>{email}</strong>.
          </p>
        </div>
      )}

      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-200)', textAlign: 'center' }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            onClose();
            onBackToLogin();
          }}
          style={{ gap: '0.375rem' }}
        >
          <ArrowLeft size={16} /> Back to Log In
        </button>
      </div>
    </Modal>
  );
};
