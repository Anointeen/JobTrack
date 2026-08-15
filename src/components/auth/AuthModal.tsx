import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle } from 'lucide-react';

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
        await signUp(email, password, fullName);
      } else {
        await logIn(email, password);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrorMsg('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
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
          <Briefcase size={24} color="var(--primary-600)" />
        </div>
        <h3 style={{ fontSize: '1.25rem' }}>
          {mode === 'signup' ? 'Start Tracking Your Career' : 'Log In to JobTrack'}
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
            backgroundColor: 'var(--rose-50)', 
            border: '1px solid var(--rose-200)',
            color: 'var(--rose-700)',
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
            <label className="form-label">
              Full Name <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon 
                size={18} 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} 
              />
              <input
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
          <label className="form-label">
            Email Address <span className="required">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Mail 
              size={18} 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} 
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

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">
              Password <span className="required">*</span>
            </label>
            {mode === 'login' && onOpenForgotPassword && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: 0, fontSize: '0.8125rem', color: 'var(--primary-600)' }}
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
              {mode === 'signup' ? 'Create Account & Start' : 'Log In to Dashboard'}
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
              style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer' }}
            >
              Log In
            </button>
          </p>
        ) : (
          <p>
            Don't have an account yet?{' '}
            <button 
              type="button" 
              onClick={() => switchMode('signup')}
              style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign Up
            </button>
          </p>
        )}
      </div>
    </Modal>
  );
};
