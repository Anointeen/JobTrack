import {
  Application,
  ApplicationPriority,
  ApplicationSource,
  ApplicationStatus,
  APPLICATION_PRIORITIES,
  APPLICATION_SOURCES,
  SortOption
} from '../types';

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
  { value: 'priority', label: 'Priority (High first)' },
  { value: 'company', label: 'Company A–Z' }
];

/** Descending importance, so a numeric sort puts High first. */
const PRIORITY_RANK: Record<ApplicationPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2
};

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

/** 'High' -> 'high'. */
export const priorityToSlug = (priority: ApplicationPriority): string => priority.toLowerCase();

/** Parses a ?priority= value. Unknown or missing values fall back to 'All'. */
export const slugToPriority = (slug: string | null): ApplicationPriority | 'All' => {
  if (!slug) return 'All';
  const normalised = slug.trim().toLowerCase();
  if (normalised === 'all') return 'All';
  return APPLICATION_PRIORITIES.find(p => p.toLowerCase() === normalised) ?? 'All';
};

/**
 * Sources keep their display casing and spaces in the URL (?source=LinkedIn,
 * ?source=Company%20Website) so links stay readable. Parsing is
 * case-insensitive and tolerates '+' from form-encoded query strings.
 */
export const sourceToSlug = (source: ApplicationSource): string => source;

export const slugToSource = (slug: string | null): ApplicationSource | 'All' => {
  if (!slug) return 'All';
  const normalised = slug.trim().replace(/\+/g, ' ').toLowerCase();
  if (normalised === 'all') return 'All';
  return APPLICATION_SOURCES.find(s => s.toLowerCase() === normalised) ?? 'All';
};

// --- Tags ------------------------------------------------------------------

/** Trims surrounding whitespace and collapses internal runs to single spaces. */
export const normaliseTag = (raw: string): string => raw.trim().replace(/\s+/g, ' ');

/** Comparison key for tags — case-insensitive, whitespace-normalised. */
export const tagKey = (raw: string): string => normaliseTag(raw).toLowerCase();

/** True when `tag` is already present, compared case-insensitively. */
export const hasTag = (tags: readonly string[], tag: string): boolean => {
  const key = tagKey(tag);
  return tags.some(t => tagKey(t) === key);
};

/**
 * Every distinct tag across the given applications, de-duplicated
 * case-insensitively (first spelling seen wins) and sorted for stable display.
 */
export const collectTags = (apps: Application[]): string[] => {
  const seen = new Map<string, string>();
  for (const app of apps) {
    for (const tag of app.tags ?? []) {
      const key = tagKey(tag);
      if (key && !seen.has(key)) seen.set(key, normaliseTag(tag));
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
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

/**
 * Today's date in the user's own timezone, as 'YYYY-MM-DD'.
 *
 * `new Date().toISOString().split('T')[0]` returns the UTC date, which is
 * tomorrow for anyone west of Greenwich during their evening — so a form
 * defaulting to it would pre-fill a date the user has not reached yet.
 */
export const todayLocalDate = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Parses a value to local midnight of the day it denotes.
 *
 * A date-only 'YYYY-MM-DD' string must be built from its parts rather than
 * passed to `new Date()`: the Date constructor treats date-only ISO strings as
 * UTC midnight, which resolves to the *previous* calendar day in any timezone
 * behind UTC. Comparing that against local midnight made today's deadlines and
 * follow-ups report as overdue for users west of Greenwich.
 *
 * Full timestamps carry their own offset, so they are parsed normally and then
 * floored to local midnight.
 */
export const parseLocalDayMs = (value?: string | null): number | null => {
  if (!value) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    const local = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return Number.isNaN(local.getTime()) ? null : local.getTime();
  }

  const ms = parseDateMs(value);
  if (ms === null) return null;
  const floored = new Date(ms);
  floored.setHours(0, 0, 0, 0);
  return floored.getTime();
};

/** Whole days from today until `date`. Negative means already past. */
export const daysUntil = (value?: string | null): number | null => {
  const ms = parseLocalDayMs(value);
  if (ms === null) return null;
  return Math.round((ms - startOfToday()) / 86_400_000);
};

// --- Follow-up state -------------------------------------------------------

export type FollowUpState = 'none' | 'overdue' | 'today' | 'upcoming';

/**
 * Deterministic classification of an application's follow-up date, relative to
 * local midnight today. 'none' when no date is set — callers use that to hide
 * follow-up UI entirely rather than rendering a placeholder.
 */
export const followUpState = (value?: string | null): FollowUpState => {
  const days = daysUntil(value);
  if (days === null) return 'none';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  return 'upcoming';
};

// --- Filtering & sorting ---------------------------------------------------

export interface ApplicationFilters {
  query: string;
  status: ApplicationStatus | 'All';
  priority: ApplicationPriority | 'All';
  source: ApplicationSource | 'All';
  /** Raw tag text; matched case-insensitively. Empty means "any tag". */
  tag: string;
  sort: SortOption;
}

/** Filter values with nothing applied — the baseline for "no active filters". */
export const EMPTY_FILTERS: ApplicationFilters = {
  query: '',
  status: 'All',
  priority: 'All',
  source: 'All',
  tag: '',
  sort: 'newest'
};

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

    case 'priority':
      // High -> Medium -> Low. Ties fall back to company name so the order is
      // stable. An unrecognised value ranks last rather than producing NaN.
      return sorted.sort((a, b) => {
        const aRank = PRIORITY_RANK[a.priority] ?? Number.MAX_SAFE_INTEGER;
        const bRank = PRIORITY_RANK[b.priority] ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
        return a.company_name.localeCompare(b.company_name);
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

/**
 * All filters combine with AND. Pure and side-effect free: same inputs always
 * produce the same output, which keeps this directly unit-testable.
 */
export const matchesFilters = (app: Application, filters: ApplicationFilters): boolean => {
  if (filters.status !== 'All' && app.status !== filters.status) return false;
  if (filters.priority !== 'All' && app.priority !== filters.priority) return false;
  if (filters.source !== 'All' && app.source !== filters.source) return false;
  if (filters.tag.trim() && !hasTag(app.tags ?? [], filters.tag)) return false;
  return matchesQuery(app, filters.query);
};

export const filterAndSortApplications = (
  apps: Application[],
  filters: ApplicationFilters
): Application[] => sortApplications(apps.filter(app => matchesFilters(app, filters)), filters.sort);

/** True when anything other than sort order is narrowing the list. */
export const hasActiveFilters = (filters: ApplicationFilters): boolean =>
  filters.query.trim() !== '' ||
  filters.status !== 'All' ||
  filters.priority !== 'All' ||
  filters.source !== 'All' ||
  filters.tag.trim() !== '';
