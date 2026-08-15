import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';

export const CalendarView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>
          Interview & Deadline Calendar
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Schedule interviews, track technical assessments, and never miss an application deadline.
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
            backgroundColor: 'var(--amber-50)', 
            color: 'var(--amber-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Calendar size={32} />
        </div>

        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '4px 12px', 
            borderRadius: 'var(--radius-full)', 
            backgroundColor: 'var(--amber-100)', 
            color: 'var(--amber-700)',
            fontSize: '0.78125rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}
        >
          <Sparkles size={14} />
          <span>Feature Coming Soon in Next Release</span>
        </div>

        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
          Smart Calendar Integration
        </h3>

        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: 1.6 }}>
          We are currently building seamless Google Calendar and Outlook syncing so your interview appointments, coding challenges, and recruiter follow-ups show up automatically.
        </p>
      </div>
    </div>
  );
};
