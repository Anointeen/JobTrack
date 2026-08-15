import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Catch-all for unrecognised URLs. Rendered outside the authenticated layout so
 * it works whether or not someone is signed in, and it never reveals whether a
 * given path would have existed for another account.
 */
export const NotFoundPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center'
      }}
    >
      <div style={{ maxWidth: '460px', width: '100%' }}>
        <div
          style={{
            width: '64px', height: '64px', borderRadius: '18px',
            backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.25rem'
          }}
        >
          <Compass size={32} />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
          Page not found
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          The page you're looking for doesn't exist or may have moved.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={user ? '/dashboard' : '/'} className="btn btn-primary btn-lg">
            {user ? 'Back to Dashboard' : 'Back to Home'}
          </Link>
          {user && (
            <Link to="/applications" className="btn btn-secondary btn-lg">
              View Applications
            </Link>
          )}
        </div>
      </div>
    </main>
  );
};
