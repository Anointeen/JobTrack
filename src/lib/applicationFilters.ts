import { Application, ApplicationStatus, SortOption } from '../types';

export const ALL_STATUSES: ApplicationStatus[] = [
  'Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'
];

/** Statuses that represent a live, in-progress opportunity. */
export const ACTIVE_STATUSES: ApplicationStatus[] = ['Applied', 'Assessment', 'Interview'];

/**
 * Statuses that mean the employer responded in some way. A rejection is still a
 * response, so it counts here; 'Saved' and 'Withdrawn' never do.
 */
export const RESPONDED_STATUSES: ApplicationStatus[] = [
  'Assessment', 'Interview', 'Offer', 'Rejected'
];

/** 'Saved' is a bookmark, not a submission — excluded from rate denominators. */
export const SUBMITTED_STATUSES: ApplicationStatus[] = [
  'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest applied' },
  { value: 'oldest', label: 'Oldest applied' },
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'deadline', label: 'Deadline soonest' },
  { value: 'company', label: 'Company A–Z' }
];

// --- URL <-> value mapping -------------------------------------------------

/** 'Interview' -> 'interview'. Every status is a single word. */
export const statusToSlug = (status: ApplicationStatus): string => status.toLowerCase();

/** Parses a ?status= value. Unknown or missing values fall back to 'All'. */
export const slugToStatus = (slug: string | null): ApplicationStatus | 'All' => {
  if (!slug) return 'All';
  const normalised = slug.trim().toLowerCase();
  if (normalised === 'all') return 'All';
  return ALL_STATUSES.find(s => s.toLowerCase() === normalised) ?? 'All';
};

/** Parses a ?sort= value, falling back to the default ordering. */
export const slugToSort = (slug: string | null): SortOption => {
  if (!slug) return 'newest';
  const match = SORT_OPTIONS.find(o => o.value === slug.trim().toLowerCase());
  return match ? match.value : 'newest';
};

// --- Dates -----------------------------------------------------------------

/**
 * Parses an ISO date string to epoch ms, or null when absent/unparseable.
 * Returning null rather than NaN keeps comparators total and prevents the
 * NaN-poisoned sort ordering that Date parsing failures otherwise cause.
 */
export const parseDateMs = (value?: string | null): number | null => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

/** Midnight today, local time — the reference point for deadline urgency. */
export const startOfToday = (): number => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Whole days from today until `date`. Negative means already past. */
export const daysUntil = (value?: string | null): number | null => {
  const ms = parseDateMs(value);
  if (ms === null) return null;
  const target = new Date(ms);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday()) / 86_400_000);
};

// --- Filtering & sorting ---------------------------------------------------

export interface ApplicationFilters {
  query: string;
  status: ApplicationStatus | 'All';
  sort: SortOption;
}

/** Matches company, job title and location — all case-insensitive. */
export const matchesQuery = (app: Application, rawQuery: string): boolean => {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  return (
    app.company_name.toLowerCase().includes(q) ||
    app.job_title.toLowerCase().includes(q) ||
    (app.location || '').toLowerCase().includes(q)
  );
};

export const sortApplications = (apps: Application[], sort: SortOption): Application[] => {
  const sorted = [...apps];

  switch (sort) {
    case 'oldest':
      return sorted.sort(
        (a, b) =>
          (parseDateMs(a.application_date) ?? parseDateMs(a.created_at) ?? 0) -
          (parseDateMs(b.application_date) ?? parseDateMs(b.created_at) ?? 0)
      );

    case 'recently_updated':
      return sorted.sort(
        (a, b) => (parseDateMs(b.updated_at) ?? 0) - (parseDateMs(a.updated_at) ?? 0)
      );

    case 'deadline':
      // Soonest first. Applications with no deadline sort last rather than
      // producing NaN comparisons, and ties fall back to company name so the
      // order is stable and predictable.
      return sorted.sort((a, b) => {
        const aMs = parseDateMs(a.deadline);
        const bMs = parseDateMs(b.deadline);
        if (aMs === null && bMs === null) return a.company_name.localeCompare(b.company_name);
        if (aMs === null) return 1;
        if (bMs === null) return -1;
        return aMs - bMs;
      });

    case 'company':
      return sorted.sort((a, b) => a.company_name.localeCompare(b.company_name));

    case 'newest':
    default:
      return sorted.sort(
        (a, b) =>
          (parseDateMs(b.application_date) ?? parseDateMs(b.created_at) ?? 0) -
          (parseDateMs(a.application_date) ?? parseDateMs(a.created_at) ?? 0)
      );
  }
};

export const filterAndSortApplications = (
  apps: Application[],
  filters: ApplicationFilters
): Application[] => {
  const filtered = apps.filter(app => {
    if (filters.status !== 'All' && app.status !== filters.status) return false;
    return matchesQuery(app, filters.query);
  });
  return sortApplications(filtered, filters.sort);
};
