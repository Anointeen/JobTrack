import React, { useState, useMemo } from 'react';
import { Application, ApplicationStatus, SortOption } from '../../types';
import { Badge } from '../common/Badge';
import { Skeleton } from '../common/Skeleton';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye,
  Edit3,
  Trash2,
  MapPin,
  Calendar,
  Briefcase,
  AlertTriangle
} from 'lucide-react';

interface ApplicationsViewProps {
  applications: Application[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: ApplicationStatus | 'All';
  onStatusFilterChange: (status: ApplicationStatus | 'All') => void;
  onOpenAddApplication: () => void;
  onSelectApplication: (app: Application) => void;
  onEditApplication: (app: Application) => void;
  onDeleteApplication: (id: string) => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  loading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenAddApplication,
  onSelectApplication,
  onEditApplication,
  onDeleteApplication
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const statusList: Array<ApplicationStatus | 'All'> = [
    'All', 'Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'
  ];

  // Dynamic search, filter, and sort logic
  const filteredApplications = useMemo(() => {
    return applications
      .filter(app => {
        // Status filter check
        if (statusFilter !== 'All' && app.status !== statusFilter) {
          return false;
        }

        // Search query check
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCompany = app.company_name.toLowerCase().includes(q);
          const matchTitle = app.job_title.toLowerCase().includes(q);
          const matchLocation = (app.location || '').toLowerCase().includes(q);
          if (!matchCompany && !matchTitle && !matchLocation) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.application_date || b.created_at).getTime() - new Date(a.application_date || a.created_at).getTime();
          case 'oldest':
            return new Date(a.application_date || a.created_at).getTime() - new Date(b.application_date || b.created_at).getTime();
          case 'recently_updated':
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          case 'company':
            return a.company_name.localeCompare(b.company_name);
          default:
            return 0;
        }
      });
  }, [applications, searchQuery, statusFilter, sortBy]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Main CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Job Applications
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)', marginTop: '2px' }}>
            Manage, filter, and track all your active and past job submissions.
          </p>
        </div>

        <button
          onClick={onOpenAddApplication}
          className="btn btn-primary btn-lg"
        >
          <Plus size={18} />
          <span>Add Application</span>
        </button>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="text"
                className="input-control"
                placeholder="Search by company, job title, or location..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowUpDown size={16} color="var(--slate-500)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-600)' }}>Sort:</span>
              <select
                className="input-control"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                style={{ minWidth: '160px' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="recently_updated">Recently Updated</option>
                <option value="company">Company Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid var(--slate-100)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--slate-500)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> Filter Status:
            </span>
            {statusList.map(st => {
              const isActive = statusFilter === st;
              const count = st === 'All' 
                ? applications.length 
                : applications.filter(a => a.status === st).length;

              return (
                <button
                  key={st}
                  onClick={() => onStatusFilterChange(st)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--primary-600)' : 'var(--border-color)',
                    backgroundColor: isActive ? 'var(--primary-50)' : 'var(--bg-surface)',
                    color: isActive ? 'var(--primary-700)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <span>{st}</span>
                  <span 
                    style={{ 
                      fontSize: '0.6875rem', 
                      backgroundColor: isActive ? 'var(--primary-200)' : 'var(--slate-100)', 
                      padding: '1px 5px', 
                      borderRadius: 'var(--radius-full)' 
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content View: Table for Desktop / Cards for Mobile */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Skeleton height="60px" />
          <Skeleton height="60px" />
          <Skeleton height="60px" />
          <Skeleton height="60px" />
        </div>
      ) : filteredApplications.length === 0 ? (
        /* Zero Filtered Results State */
        <div 
          className="card" 
          style={{ padding: '3.5rem 1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-surface)' }}
        >
          <div 
            style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--slate-100)', 
              color: 'var(--slate-500)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Briefcase size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
            No applications match your filter.
          </h3>
          <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
            Try clearing your search query or switching your status filter option.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('All');
              }}
              className="btn btn-secondary"
            >
              Reset Filters
            </button>
            <button
              onClick={onOpenAddApplication}
              className="btn btn-primary"
            >
              <Plus size={16} /> Add Application
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="desktop-only card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)', color: 'var(--slate-500)', fontSize: '0.78125rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Company & Job Title</th>
                    <th style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Location</th>
                    <th style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Job Type</th>
                    <th style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Application Date</th>
                    <th style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Deadline</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map(app => (
                    <tr 
                      key={app.id}
                      style={{ borderBottom: '1px solid var(--slate-100)', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
                      onClick={() => onSelectApplication(app)}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.9375rem' }}>{app.job_title}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--primary-600)', fontWeight: 600, marginTop: '2px' }}>{app.company_name}</div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--slate-600)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} color="var(--slate-400)" />
                          {app.location || 'Unspecified'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--slate-700)', fontWeight: 500 }}>
                        {app.job_type}
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <Badge status={app.status} size="sm" />
                      </td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--slate-600)' }}>
                        {formatDate(app.application_date)}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', color: 'var(--slate-500)' }}>
                        {formatDate(app.deadline)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }} onClick={e => e.stopPropagation()}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => onSelectApplication(app)}
                            title="View Details"
                            style={{ padding: '6px' }}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => onEditApplication(app)}
                            title="Edit"
                            style={{ padding: '6px' }}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeletingId(app.id)}
                            title="Delete"
                            style={{ padding: '6px', color: 'var(--rose-600)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Grid View */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredApplications.map(app => (
              <div 
                key={app.id} 
                className="card card-hover" 
                style={{ padding: '1.25rem', cursor: 'pointer' }}
                onClick={() => onSelectApplication(app)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--slate-900)' }}>{app.job_title}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--primary-600)', fontWeight: 600, marginTop: '2px' }}>{app.company_name}</p>
                  </div>
                  <Badge status={app.status} size="sm" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="var(--slate-400)" />
                    <span>{app.location || 'Location unspecified'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="var(--slate-400)" />
                    <span>Applied: {formatDate(app.application_date)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--slate-100)' }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-secondary btn-sm" onClick={() => onSelectApplication(app)}>
                    <Eye size={14} /> View Details
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => onEditApplication(app)}>
                    <Edit3 size={14} /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Overlay */}
      {deletingId && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.65)', 
            backdropFilter: 'blur(3px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999
          }}
        >
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertTriangle size={24} />
            </div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>Confirm Delete</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Are you sure you want to delete this job application?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setDeletingId(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => {
                  onDeleteApplication(deletingId);
                  setDeletingId(null);
                }}
                style={{ flex: 1 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
