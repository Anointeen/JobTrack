import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { Application } from '../../types';
import { Badge } from '../common/Badge';
import { daysUntil } from '../../lib/applicationFilters';

interface UpcomingDeadlinesProps {
  /** Already filtered to future deadlines on open applications, soonest first. */
  applications: Application[];
  limit?: number;
}

const urgency = (days: number): { color: string; bg: string; label: string } => {
  if (days === 0) return { color: 'var(--rose-700)', bg: 'var(--rose-50)', label: 'Due today' };
  if (days === 1) return { color: 'var(--rose-700)', bg: 'var(--rose-50)', label: 'Due tomorrow' };
  if (days <= 7) return { color: 'var(--amber-700)', bg: 'var(--amber-50)', label: `${days} days left` };
  return { color: 'var(--text-muted)', bg: 'var(--bg-subtle)', label: `${days} days left` };
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Nearest deadlines still ahead. Expired deadlines and closed applications are
 * excluded upstream, so nothing here is stale. Reminders/notifications are
 * deliberately out of scope for this phase.
 */
export const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ applications, limit = 5 }) => {
  const shown = applications.slice(0, limit);

  return (
    <section className="card" aria-labelledby="upcoming-deadlines-heading">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: shown.length ? '1.25rem' : '0.75rem' }}>
        <div>
          <h3 id="upcoming-deadlines-heading" style={{ fontSize: '1.125rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarClock size={20} color="var(--primary-600)" />
            Upcoming Deadlines
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Application deadlines still ahead of you
          </p>
        </div>

        {applications.length > limit && (
          <Link to="/applications?sort=deadline" className="btn btn-outline btn-sm">
            View all {applications.length} <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {shown.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          No upcoming deadlines. Add a deadline when creating or editing an application and it
          will appear here.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {shown.map(app => {
            const days = daysUntil(app.deadline) ?? 0;
            const tone = urgency(days);
            return (
              <li key={app.id}>
                <Link
                  to={`/applications/${app.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '0.75rem', flexWrap: 'wrap',
                    padding: '0.75rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    textDecoration: 'none'
                  }}
                >
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9375rem' }}>
                      {app.job_title}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                      {app.company_name}
                    </span>
                  </span>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    <Badge status={app.status} size="sm" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatDate(app.deadline)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem', fontWeight: 700,
                        color: tone.color, backgroundColor: tone.bg,
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tone.label}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
