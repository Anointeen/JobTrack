import React from 'react';
import { ApplicationStatus } from '../../types';
import { Badge } from '../common/Badge';
import { ChevronRight } from 'lucide-react';

interface StatusPipelineProps {
  statusCounts: Record<ApplicationStatus, number>;
  onSelectStatusFilter: (status: ApplicationStatus) => void;
}

export const StatusPipeline: React.FC<StatusPipelineProps> = ({
  statusCounts,
  onSelectStatusFilter
}) => {
  const primaryStatuses: ApplicationStatus[] = ['Saved', 'Applied', 'Assessment', 'Interview', 'Offer'];
  const outcomeStatuses: ApplicationStatus[] = ['Rejected', 'Withdrawn'];

  return (
    <div className="card" style={{ height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', color: 'var(--text-heading)' }}>
            Application Status Pipeline
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Click any status to filter your applications view
          </p>
        </div>
      </div>

      {/* Primary Funnel Statuses */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
          gap: '0.75rem',
          marginBottom: '1rem' 
        }}
      >
        {primaryStatuses.map(st => {
          const count = statusCounts[st] || 0;
          return (
            <button
              key={st}
              onClick={() => onSelectStatusFilter(st)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
              className="card-hover"
            >
              <Badge status={st} size="sm" />
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%', marginTop: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  {count}
                </span>
                <ChevronRight size={16} color="var(--text-subtle)" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Outcome Statuses Bar */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          paddingTop: '0.875rem', 
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          Outcomes:
        </span>
        {outcomeStatuses.map(st => {
          const count = statusCounts[st] || 0;
          return (
            <button
              key={st}
              onClick={() => onSelectStatusFilter(st)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                cursor: 'pointer',
                fontSize: '0.8125rem'
              }}
            >
              <Badge status={st} size="sm" />
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
