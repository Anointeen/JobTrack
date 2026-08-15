import React from 'react';
import { ApplicationStatusHistory } from '../../types';
import { Badge } from '../common/Badge';
import { Clock, ArrowRight } from 'lucide-react';

interface StatusHistoryTimelineProps {
  history: ApplicationStatusHistory[];
}

export const StatusHistoryTimeline: React.FC<StatusHistoryTimelineProps> = ({ history }) => {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (!history || history.length === 0) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', fontStyle: 'italic' }}>
        No status history recorded yet.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1.25rem' }}>
      {/* Timeline vertical line */}
      <div 
        style={{ 
          position: 'absolute', 
          left: '7px', 
          top: '6px', 
          bottom: '6px', 
          width: '2px', 
          backgroundColor: 'var(--slate-200)' 
        }} 
      />

      {history.map((item, index) => (
        <div key={item.id || index} style={{ position: 'relative' }}>
          {/* Node dot */}
          <div 
            style={{ 
              position: 'absolute', 
              left: '-1.25rem', 
              top: '4px', 
              width: '14px', 
              height: '14px', 
              borderRadius: '50%', 
              backgroundColor: index === 0 ? 'var(--primary-600)' : 'var(--border-color)',
              border: '2px solid var(--bg-surface)',
              boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.2)'
            }} 
          />

          <div style={{ background: 'var(--slate-50)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {item.previous_status && (
                  <>
                    <Badge status={item.previous_status} size="sm" />
                    <ArrowRight size={14} color="var(--slate-400)" />
                  </>
                )}
                <Badge status={item.new_status} size="sm" />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {formatDate(item.created_at)}
              </span>
            </div>

            {item.note && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--slate-700)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                {item.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
