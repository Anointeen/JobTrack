import React from 'react';
import { Link } from 'react-router-dom';
import { Application } from '../../types';
import { Badge } from '../common/Badge';
import { daysUntil } from '../../lib/applicationFilters';
import { Plus, ArrowRight, MapPin, Calendar, Briefcase } from 'lucide-react';

interface RecentApplicationsProps {
  applications: Application[];
  onViewAll: () => void;
  onAddApplication: () => void;
}

export const RecentApplications: React.FC<RecentApplicationsProps> = ({
  applications,
  onViewAll,
  onAddApplication
}) => {
  // Most recently updated first, so the section reflects current activity.
  const recentApps = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const deadlineLabel = (deadline?: string) => {
    const days = daysUntil(deadline);
    if (days === null) return { text: '—', color: 'var(--text-subtle)' };
    if (days < 0) return { text: `${formatDate(deadline)} (passed)`, color: 'var(--text-subtle)' };
    if (days === 0) return { text: 'Due today', color: 'var(--rose-600)' };
    if (days <= 7) return { text: `${formatDate(deadline)} (${days}d)`, color: 'var(--amber-600)' };
    return { text: formatDate(deadline), color: 'var(--text-muted)' };
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', color: 'var(--text-heading)' }}>
            Recent Applications
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Latest application updates and tracking status
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={onAddApplication}
            className="btn btn-outline btn-sm"
          >
            <Plus size={16} />
            <span>Add Application</span>
          </button>

          {applications.length > 0 && (
            <button
              onClick={onViewAll}
              className="btn btn-primary btn-sm"
            >
              <span>View All ({applications.length})</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {recentApps.length === 0 ? (
        /* Empty State */
        <div 
          style={{ 
            padding: '3rem 1.5rem', 
            textAlign: 'center', 
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--border-color)'
          }}
        >
          <div 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-50)', 
              color: 'var(--primary-text)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Briefcase size={28} />
          </div>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            Your job search starts here.
          </h4>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
            Add your first job application and start tracking your progress.
          </p>
          <button
            onClick={onAddApplication}
            className="btn btn-primary btn-lg"
          >
            <Plus size={18} />
            <span>Add Your First Application</span>
          </button>
        </div>
      ) : (
        /* Recent Applications Table / List */
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-subtle)', fontSize: '0.78125rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th scope="col" style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Company &amp; Role</th>
                <th scope="col" style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Location</th>
                <th scope="col" style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Applied</th>
                <th scope="col" style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Status</th>
                <th scope="col" style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Deadline</th>
                <th scope="col" style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentApps.map(app => {
                const dl = deadlineLabel(app.deadline);
                return (
                  <tr
                    key={app.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color var(--transition-fast)' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <Link
                        to={`/applications/${app.id}`}
                        style={{ fontWeight: 700, color: 'var(--text-heading)', textDecoration: 'none' }}
                      >
                        {app.job_title}
                      </Link>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--primary-text)', fontWeight: 600 }}>{app.company_name}</div>
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="var(--text-subtle)" />
                        {app.location || 'Not specified'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} color="var(--text-subtle)" />
                        {formatDate(app.application_date)}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem' }}>
                      <Badge status={app.status} size="sm" />
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem', color: dl.color, fontSize: '0.8125rem', fontWeight: 500 }}>
                      {dl.text}
                    </td>
                    <td style={{ padding: '0.875rem 0.5rem', textAlign: 'right' }}>
                      <Link
                        to={`/applications/${app.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.8125rem' }}
                        aria-label={`View details for ${app.job_title} at ${app.company_name}`}
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
