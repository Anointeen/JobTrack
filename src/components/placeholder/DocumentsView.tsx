import React from 'react';
import { FileText, Sparkles } from 'lucide-react';

export const DocumentsView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
          Resumes & Cover Letters Hub
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)', marginTop: '2px' }}>
          Organize versions of your CV, portfolio links, and tailored cover letters in one central vault.
        </p>
      </div>

      <div 
        className="card" 
        style={{ 
          padding: '4rem 2rem', 
          textAlign: 'center', 
          background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-subtle) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div 
          style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '20px', 
            backgroundColor: 'var(--purple-50)', 
            color: 'var(--purple-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <FileText size={32} />
        </div>

        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '4px 12px', 
            borderRadius: 'var(--radius-full)', 
            backgroundColor: 'var(--purple-100)', 
            color: 'var(--purple-700)',
            fontSize: '0.78125rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}
        >
          <Sparkles size={14} />
          <span>Feature Coming Soon in Next Release</span>
        </div>

        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
          Career Document Vault & Resume Tailoring
        </h3>

        <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)', maxWidth: '520px', lineHeight: 1.6 }}>
          Attach custom resume versions to specific applications, store cover letter templates, and manage all your application materials cleanly in one spot.
        </p>
      </div>
    </div>
  );
};
