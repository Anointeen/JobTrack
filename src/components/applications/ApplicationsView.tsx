import React, { useState, useMemo, useCallback } from 'react';
import { Link, Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ApplicationStatus, SortOption } from '../../types';
import { Badge } from '../common/Badge';
import { Skeleton } from '../common/Skeleton';
import { useApplications } from '../../context/ApplicationsContext';
import { useApplicationForm } from '../../context/ApplicationFormContext';
import { useToast } from '../../context/ToastContext';
import {
  ALL_STATUSES,
  SORT_OPTIONS,
  filterAndSortApplications,
  hasActiveFilters as computeHasActiveFilters,
  collectTags,
  slugToStatus,
  slugToSort,
  slugToPriority,
  slugToSource,
  statusToSlug,
  priorityToSlug,
  daysUntil
} from '../../lib/applicationFilters';
import { PriorityChip, FollowUpChip, TagList } from './ApplicationMetadata';
import {
  ApplicationPriority,
  APPLICATION_PRIORITIES,
  APPLICATION_SOURCES
} from '../../types';
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
  AlertTriangle,
  Compass,
  X
} from 'lucide-react';

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Not set';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Not set';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Colour-codes a deadline by urgency using semantic tokens only. */
const deadlineTone = (deadline?: string): { color: string; label: string } => {
  const days = daysUntil(deadline);
  if (days === null) return { color: 'var(--text-subtle)', label: 'Not set' };
  if (days < 0) return { color: 'var(--text-subtle)', label: `${formatDate(deadline)} (passed)` };
  if (days === 0) return { color: 'var(--rose-600)', label: 'Today' };
  if (days <= 7) return { color: 'var(--amber-600)', label: `${formatDate(deadline)} (${days}d)` };
  return { color: 'var(--text-muted)', label: formatDate(deadline) };
};

export const ApplicationsView: React.FC = () => {
  const { applications, loading, error, removeApplication } = useApplications();
  const { openCreateForm, openEditForm } = useApplicationForm();
  const { addToast } = useToast();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- Filter state lives in the URL, so views are shareable and survive a
  // refresh. Only the three meaningful filters are stored; transient UI state
  // (open dialogs, etc.) deliberately stays in component state.
  const query = searchParams.get('q') ?? '';
  const statusFilter = slugToStatus(searchParams.get('status'));
  const priorityFilter = slugToPriority(searchParams.get('priority'));
  const sourceFilter = slugToSource(searchParams.get('source'));
  const tagFilter = searchParams.get('tag') ?? '';
  const sortBy = slugToSort(searchParams.get('sort'));

  /**
   * Writes filter changes to the query string.
   *
   * Discrete choices (status, priority, source, tag, sort) push a history
   * entry, so Back and Forward step through them as the user expects. Free-text
   * search replaces instead — pushing per keystroke would bury the previous
   * page under dozens of entries.
   */
  const updateParams = useCallback(
    (changes: Record<string, string | null>, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      setSearchParams(next, { replace: options?.replace ?? false });
    },
    [searchParams, setSearchParams]
  );

  const filters = useMemo(
    () => ({
      query,
      status: statusFilter,
      priority: priorityFilter,
      source: sourceFilter,
      tag: tagFilter,
      sort: sortBy
    }),
    [query, statusFilter, priorityFilter, sourceFilter, tagFilter, sortBy]
  );

  const hasActiveFilters = computeHasActiveFilters(filters);

  const filteredApplications = useMemo(
    () => filterAndSortApplications(applications, filters),
    [applications, filters]
  );

  /** Tag options come from the user's own applications, not a fixed list. */
  const availableTags = useMemo(() => collectTags(applications), [applications]);

  /**
   * Tag matching is case-insensitive, so ?tag=remote must still select the
   * stored "Remote" option — otherwise the <select> renders blank while the
   * list is genuinely filtered, which reads as a bug.
   */
  const selectedTagOption = useMemo(() => {
    const wanted = tagFilter.trim().toLowerCase();
    if (!wanted) return '';
    return availableTags.find(t => t.toLowerCase() === wanted) ?? tagFilter;
  }, [tagFilter, availableTags]);

  const clearFilters = () =>
    updateParams({ q: null, status: null, priority: null, source: null, tag: null });

  // Preserve the current filters in the detail URL so closing returns here.
  const detailPath = (id: string) => `/applications/${id}${location.search}`;

  const handleDelete = async (id: string) => {
    try {
      await removeApplication(id);
      addToast('info', 'Application Deleted', 'The job application has been removed.');
    } catch (err: any) {
      addToast('error', 'Delete Error', err?.message || 'Could not delete application.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Main CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>
            Job Applications
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Manage, filter, and track all your active and past job submissions.
          </p>
        </div>

        <button onClick={openCreateForm} className="btn btn-primary btn-lg">
          <Plus size={18} />
          <span>Add Application</span>
        </button>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <label htmlFor="app-search" className="sr-only">Search applications</label>
              <input
                id="app-search"
                type="search"
                className="input-control"
                placeholder="Search by company, job title, or location..."
                value={query}
                onChange={e => updateParams({ q: e.target.value }, { replace: true })}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <ArrowUpDown size={16} color="var(--text-subtle)" />
              <label htmlFor="app-sort" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Sort:
              </label>
              <select
                id="app-sort"
                className="input-control"
                value={sortBy}
                onChange={e => updateParams({ sort: e.target.value as SortOption })}
                style={{ minWidth: '160px' }}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Metadata filters — each is URL-backed, so any combination is a
              shareable link. */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '140px', flex: '1 1 140px' }}>
              <label htmlFor="filter-priority" style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Priority
              </label>
              <select
                id="filter-priority"
                className="input-control"
                value={priorityFilter === 'All' ? '' : priorityFilter}
                onChange={e => updateParams({ priority: e.target.value ? priorityToSlug(e.target.value as ApplicationPriority) : null })}
              >
                <option value="">All priorities</option>
                {APPLICATION_PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '160px', flex: '1 1 160px' }}>
              <label htmlFor="filter-source" style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Source
              </label>
              <select
                id="filter-source"
                className="input-control"
                value={sourceFilter === 'All' ? '' : sourceFilter}
                onChange={e => updateParams({ source: e.target.value || null })}
              >
                <option value="">All sources</option>
                {APPLICATION_SOURCES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '160px', flex: '1 1 160px' }}>
              <label htmlFor="filter-tag" style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Tag
              </label>
              <select
                id="filter-tag"
                className="input-control"
                value={selectedTagOption}
                onChange={e => updateParams({ tag: e.target.value || null })}
                disabled={availableTags.length === 0 && !tagFilter}
              >
                <option value="">
                  {availableTags.length === 0 ? 'No tags yet' : 'All tags'}
                </option>
                {/* A tag from the URL that no longer exists stays selectable so
                    the control never silently contradicts the address bar. */}
                {selectedTagOption && !availableTags.includes(selectedTagOption) && (
                  <option value={selectedTagOption}>{selectedTagOption}</option>
                )}
                {availableTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-subtle)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> Filter Status:
            </span>
            {(['All', ...ALL_STATUSES] as Array<ApplicationStatus | 'All'>).map(st => {
              const isActive = statusFilter === st;
              const count = st === 'All'
                ? applications.length
                : applications.filter(a => a.status === st).length;

              return (
                <button
                  key={st}
                  onClick={() => updateParams({ status: st === 'All' ? null : statusToSlug(st) })}
                  aria-pressed={isActive}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--primary-600)' : 'var(--border-color)',
                    backgroundColor: isActive ? 'var(--primary-50)' : 'var(--bg-surface)',
                    color: isActive ? 'var(--primary-text)' : 'var(--text-muted)',
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
                      backgroundColor: isActive ? 'var(--primary-200)' : 'var(--bg-subtle)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ gap: '0.25rem' }}>
                <X size={14} /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Load error */}
      {error && (
        <div
          role="alert"
          className="card"
          style={{ borderColor: 'var(--rose-500)', backgroundColor: 'var(--meta-danger-bg)', color: 'var(--meta-danger-text)' }}
        >
          <strong>We couldn't load your applications.</strong>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Skeleton height="60px" />
          <Skeleton height="60px" />
          <Skeleton height="60px" />
          <Skeleton height="60px" />
        </div>
      ) : applications.length === 0 ? (
        /* Genuinely empty account — not a filtering result. */
        <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-surface)' }}>
          <div
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'var(--primary-50)', color: 'var(--primary-text)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Briefcase size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            Your job search starts here
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 1.25rem auto', lineHeight: 1.6 }}>
            Add your first application to start tracking company details, deadlines, salary
            and every status change in one place.
          </p>
          <ul
            style={{
              listStyle: 'none', padding: 0, margin: '0 auto 1.5rem auto', maxWidth: '420px',
              textAlign: 'left', fontSize: '0.875rem', color: 'var(--text-muted)',
              display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}
          >
            <li>• Record the role, company, location and salary in any currency.</li>
            <li>• Set a deadline so it appears in your dashboard reminders.</li>
            <li>• Update the status as you progress — history is kept automatically.</li>
          </ul>
          <button onClick={openCreateForm} className="btn btn-primary btn-lg">
            <Plus size={18} /> Add Your First Application
          </button>
        </div>
      ) : filteredApplications.length === 0 ? (
        /* Filters excluded everything — never claim the account is empty. */
        <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-surface)' }}>
          <div
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)', color: 'var(--text-subtle)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <Filter size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            No applications match your current filters
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
            You have {applications.length} application{applications.length === 1 ? '' : 's'} in total.
            Try a different status or clear your search to see them.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={clearFilters} className="btn btn-secondary">
              <X size={16} /> Clear Filters
            </button>
            <button onClick={openCreateForm} className="btn btn-primary">
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
                <caption className="sr-only">
                  Your job applications, {filteredApplications.length} shown
                </caption>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-subtle)', fontSize: '0.78125rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th scope="col" style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>Company &amp; Job Title</th>
                    <th scope="col" style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Location</th>
                    <th scope="col" style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Job Type</th>
                    <th scope="col" style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Status</th>
                    <th scope="col" style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Priority</th>
                    <th scope="col" style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Applied</th>
                    <th scope="col" style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>Deadline</th>
                    <th scope="col" style={{ padding: '1rem 1.25rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map(app => {
                    const tone = deadlineTone(app.deadline);
                    return (
                      <tr
                        key={app.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color var(--transition-fast)' }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {/* A real link: keyboard reachable and openable in a new tab. */}
                          <Link
                            to={detailPath(app.id)}
                            style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9375rem', textDecoration: 'none' }}
                          >
                            {app.job_title}
                          </Link>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--primary-text)', fontWeight: 600, marginTop: '2px' }}>
                            {app.company_name}
                          </div>
                          {/* Tags and follow-up sit under the title so the row
                              gains metadata without gaining more columns. */}
                          {(app.tags?.length > 0 || app.follow_up_date) && (
                            <div className="chip-list" style={{ marginTop: '0.375rem' }}>
                              <FollowUpChip followUpDate={app.follow_up_date} compact />
                              <TagList tags={app.tags ?? []} max={3} />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={14} color="var(--text-subtle)" />
                            {app.location || 'Unspecified'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>
                          {app.job_type}
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <Badge status={app.status} size="sm" />
                        </td>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <PriorityChip priority={app.priority} showIcon={false} />
                        </td>
                        <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>
                          {formatDate(app.application_date)}
                        </td>
                        <td style={{ padding: '1rem 0.75rem', color: tone.color, fontWeight: 500 }}>
                          {tone.label}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => navigate(detailPath(app.id))}
                              title="View Details"
                              aria-label={`View details for ${app.job_title} at ${app.company_name}`}
                              style={{ padding: '6px' }}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openEditForm(app)}
                              title="Edit"
                              aria-label={`Edit ${app.job_title} at ${app.company_name}`}
                              style={{ padding: '6px' }}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setDeletingId(app.id)}
                              title="Delete"
                              aria-label={`Delete ${app.job_title} at ${app.company_name}`}
                              style={{ padding: '6px', color: 'var(--rose-600)' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Grid View */}
          <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredApplications.map(app => {
              const tone = deadlineTone(app.deadline);
              return (
                <div key={app.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <Link
                        to={detailPath(app.id)}
                        style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-heading)', textDecoration: 'none' }}
                      >
                        {app.job_title}
                      </Link>
                      <p style={{ fontSize: '0.875rem', color: 'var(--primary-text)', fontWeight: 600, marginTop: '2px' }}>
                        {app.company_name}
                      </p>
                    </div>
                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                      <Badge status={app.status} size="sm" />
                      <PriorityChip priority={app.priority} showIcon={false} />
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="var(--text-subtle)" />
                      <span>{app.location || 'Location unspecified'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="var(--text-subtle)" />
                      <span>Applied: {formatDate(app.application_date)}</span>
                    </div>
                    {app.deadline && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: tone.color }}>
                        <AlertTriangle size={14} />
                        <span>Deadline: {tone.label}</span>
                      </div>
                    )}
                    {app.source && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Compass size={14} color="var(--text-subtle)" />
                        <span>Source: {app.source}</span>
                      </div>
                    )}
                  </div>

                  {(app.follow_up_date || app.tags?.length > 0) && (
                    <div className="chip-list" style={{ marginBottom: '1rem' }}>
                      <FollowUpChip followUpDate={app.follow_up_date} />
                      <TagList tags={app.tags ?? []} />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(detailPath(app.id))}>
                      <Eye size={14} /> View
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEditForm(app)}>
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setDeletingId(app.id)}
                      style={{ color: 'var(--rose-600)' }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', zIndex: 9999
          }}
        >
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--meta-danger-bg)', color: 'var(--rose-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertTriangle size={24} />
            </div>
            <h2 id="confirm-delete-title" style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
              Confirm Delete
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Are you sure you want to delete this job application? Its status history will be
              removed too. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setDeletingId(null)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={() => handleDelete(deletingId)} style={{ flex: 1 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* /applications/:id renders here, as a detail modal over the list. */}
      <Outlet />
    </div>
  );
};
