import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer 
      style={{ 
        padding: '1.5rem', 
        borderTop: '1px solid var(--border-color)', 
        backgroundColor: 'var(--bg-surface)',
        marginTop: 'auto',
        color: 'var(--text-muted)',
        fontSize: '0.8125rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}
    >
      <div>
        © {new Date().getFullYear()} <strong style={{ color: 'var(--text-heading)' }}>JobTrack</strong>. All rights reserved. Precision Career Management.
      </div>
      <div style={{ display: 'flex', gap: '1.25rem' }}>
        <a href="#privacy" onClick={e => e.preventDefault()} style={{ color: 'var(--text-muted)' }}>Privacy Policy</a>
        <a href="#terms" onClick={e => e.preventDefault()} style={{ color: 'var(--text-muted)' }}>Terms of Service</a>
        <a href="#support" onClick={e => e.preventDefault()} style={{ color: 'var(--text-muted)' }}>Help & Support</a>
      </div>
    </footer>
  );
};
