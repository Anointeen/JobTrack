import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Full-viewport placeholder used while the session resolves or a lazy route
 * chunk arrives.
 *
 * Lives in its own module so importing it does not pull in ProtectedLayout —
 * which would drag the entire authenticated shell into the entry chunk and
 * undo the route-level code splitting.
 */
export const FullScreenLoader: React.FC = () => (
  <div
    style={{
      display: 'flex',
      height: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-app)',
      padding: '2rem'
    }}
  >
    <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
      <Skeleton height="40px" width="180px" borderRadius="10px" className="mb-4" />
      <Skeleton height="20px" width="100%" borderRadius="6px" />
    </div>
  </div>
);
