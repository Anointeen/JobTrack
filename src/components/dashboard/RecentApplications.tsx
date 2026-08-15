import React from 'react';
import { Application } from '../../types';
import { Badge } from '../common/Badge';
import { Plus, ArrowRight, MapPin, Calendar, Briefcase, ExternalLink } from 'lucide-react';

interface RecentApplicationsProps {
  applications: Application[];
  onViewAll: () => void;
  onAddApplication: () => void;
  onSelectApplication: (app: Application) => void;
}

export const RecentApplications: React.FC<RecentApplicationsProps> = ({
  applications,
  onViewAll,
  onAddApplication,
  onSelectApplication
}) => {
  const recentApps = applications.slice(0, 5);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', color: 'var(--slate-900)' }}>
            Recent Applications
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginTop: '2px' }}>
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
            backgroundColor: 'var(--slate-50)',
            borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--slate-200)'
          }}
        >
          <div 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-50)', 
              color: 'var(--primary-600)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Briefcase size={28} />
          </div>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
            Your job search starts here.
          </h4>
          <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--slate-200)', color: 'var(--slate-500)', fontSize: '0.78125rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Company & Role</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Location</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Applied Date</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Last Updated</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentApps.map(app => (
                <tr 
                  key={app.id} 
                  style={{ borderBottom: '1px solid var(--slate-100)', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
                  onClick={() => onSelectApplication(app)}
                  className="table-row-hover"
                >
                  <td style={{ padding: '0.875rem 0.5rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{app.job_title}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--primary-600)', fontWeight: 600 }}>{app.company_name}</div>
                  </td>
                  <td style={{ padding: '0.875rem 0.5rem', color: 'var(--slate-600)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="var(--slate-400)" />
                      {app.location || 'Not specified'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 0.5rem', color: 'var(--slate-600)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} color="var(--slate-400)" />
                      {formatDate(app.application_date)}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 0.5rem' }}>
                    <Badge status={app.status} size="sm" />
                  </td>
                  <td style={{ padding: '0.875rem 0.5rem', color: 'var(--slate-500)', fontSize: '0.8125rem' }}>
                    {formatDate(app.updated_at)}
                  </td>
                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'right' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectApplication(app);
                      }}
                      style={{ padding: '4px 8px', fontSize: '0.8125rem' }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
