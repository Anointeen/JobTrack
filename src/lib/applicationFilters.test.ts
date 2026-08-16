import { describe, it, expect } from 'vitest';
import { Application } from '../types';
import {
  ALL_STATUSES,
  EMPTY_FILTERS,
  ApplicationFilters,
  collectTags,
  daysUntil,
  filterAndSortApplications,
  followUpState,
  hasActiveFilters,
  hasTag,
  matchesFilters,
  matchesQuery,
  normaliseTag,
  parseDateMs,
  parseLocalDayMs,
  priorityToSlug,
  slugToPriority,
  slugToSort,
  slugToSource,
  slugToStatus,
  sortApplications,
  statusToSlug,
  tagKey
} from './applicationFilters';

// ---------------------------------------------------------------------------
// Helpers
//
// Dates are built from LOCAL calendar parts. Using toISOString() would emit a
// UTC-shifted day and make the "today"-relative assertions fail in any timezone
// offset from UTC — the suite must pass identically everywhere.
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date, `offsetDays` from today, as 'YYYY-MM-DD'. */
const localDate = (offsetDays: number): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

let seq = 0;
const app = (over: Partial<Application> = {}): Application => ({
  id: over.id ?? `app-${++seq}`,
  user_id: 'user-1',
  company_name: 'Acme',
  job_title: 'Engineer',
  location: 'Remote',
  job_type: 'Full-time',
  status: 'Applied',
  application_date: '2026-01-01',
  priority: 'Medium',
  tags: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over
});

const withFilters = (over: Partial<ApplicationFilters> = {}): ApplicationFilters => ({
  ...EMPTY_FILTERS,
  ...over
});

const ids = (apps: Application[]) => apps.map(a => a.id);

// ---------------------------------------------------------------------------

describe('URL slug mapping', () => {
  it('round-trips every status', () => {
    for (const status of ALL_STATUSES) {
      expect(slugToStatus(statusToSlug(status))).toBe(status);
    }
  });

  it('parses status case-insensitively and falls back to All', () => {
    expect(slugToStatus('INTERVIEW')).toBe('Interview');
    expect(slugToStatus('  offer  ')).toBe('Offer');
    expect(slugToStatus('all')).toBe('All');
    expect(slugToStatus(null)).toBe('All');
    expect(slugToStatus('not-a-status')).toBe('All');
  });

  it('parses priority case-insensitively and falls back to All', () => {
    expect(slugToPriority('high')).toBe('High');
    expect(slugToPriority('HIGH')).toBe('High');
    expect(priorityToSlug('Medium')).toBe('medium');
    expect(slugToPriority(null)).toBe('All');
    expect(slugToPriority('urgent')).toBe('All');
  });

  it('parses source, tolerating case and form-encoded spaces', () => {
    expect(slugToSource('LinkedIn')).toBe('LinkedIn');
    expect(slugToSource('company website')).toBe('Company Website');
    expect(slugToSource('Company+Website')).toBe('Company Website');
    expect(slugToSource(null)).toBe('All');
    expect(slugToSource('carrier pigeon')).toBe('All');
  });

  it('parses sort and falls back to newest', () => {
    expect(slugToSort('priority')).toBe('priority');
    expect(slugToSort('deadline')).toBe('deadline');
    expect(slugToSort(null)).toBe('newest');
    expect(slugToSort('nonsense')).toBe('newest');
  });
});

describe('date parsing', () => {
  it('returns null rather than NaN for missing or invalid values', () => {
    expect(parseDateMs(undefined)).toBeNull();
    expect(parseDateMs(null)).toBeNull();
    expect(parseDateMs('')).toBeNull();
    expect(parseDateMs('not-a-date')).toBeNull();
    expect(parseLocalDayMs('garbage')).toBeNull();
  });

  it('treats a date-only string as local midnight, not UTC midnight', () => {
    const ms = parseLocalDayMs('2026-03-15');
    expect(ms).not.toBeNull();
    const d = new Date(ms as number);
    // Read back with LOCAL getters: the calendar day must survive any offset.
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it('computes whole-day deltas around today', () => {
    expect(daysUntil(localDate(0))).toBe(0);
    expect(daysUntil(localDate(1))).toBe(1);
    expect(daysUntil(localDate(-1))).toBe(-1);
    expect(daysUntil(localDate(30))).toBe(30);
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil('nonsense')).toBeNull();
  });
});

describe('follow-up state', () => {
  it('classifies deterministically', () => {
    expect(followUpState(null)).toBe('none');
    expect(followUpState(undefined)).toBe('none');
    expect(followUpState('')).toBe('none');
    expect(followUpState('not-a-date')).toBe('none');
    expect(followUpState(localDate(-5))).toBe('overdue');
    expect(followUpState(localDate(-1))).toBe('overdue');
    expect(followUpState(localDate(0))).toBe('today');
    expect(followUpState(localDate(1))).toBe('upcoming');
    expect(followUpState(localDate(365))).toBe('upcoming');
  });
});

describe('tag helpers', () => {
  it('normalises whitespace', () => {
    expect(normaliseTag('  Dream   Job  ')).toBe('Dream Job');
    expect(normaliseTag('Remote')).toBe('Remote');
    expect(normaliseTag('   ')).toBe('');
  });

  it('builds a case-insensitive comparison key', () => {
    expect(tagKey('  ReMoTe ')).toBe('remote');
    expect(tagKey('Dream  Job')).toBe(tagKey('dream job'));
  });

  it('matches tags case-insensitively', () => {
    expect(hasTag(['Remote'], 'remote')).toBe(true);
    expect(hasTag(['Remote'], 'REMOTE')).toBe(true);
    expect(hasTag(['Dream Job'], '  dream   job  ')).toBe(true);
    expect(hasTag(['Remote'], 'Onsite')).toBe(false);
    expect(hasTag([], 'Remote')).toBe(false);
  });

  it('collects distinct tags, de-duplicating case-insensitively', () => {
    const collected = collectTags([
      app({ tags: ['Remote', 'Dream Job'] }),
      app({ tags: ['remote', 'Referral'] }),
      app({ tags: [] })
    ]);
    // First spelling seen wins, and the result is sorted for stable display.
    expect(collected).toEqual(['Dream Job', 'Referral', 'Remote']);
  });

  it('returns no tags for an empty dataset', () => {
    expect(collectTags([])).toEqual([]);
  });
});

describe('text search', () => {
  const target = app({ company_name: 'Stripe', job_title: 'Frontend Engineer', location: 'Berlin' });

  it('matches company, title and location case-insensitively', () => {
    expect(matchesQuery(target, 'stripe')).toBe(true);
    expect(matchesQuery(target, 'FRONTEND')).toBe(true);
    expect(matchesQuery(target, 'berlin')).toBe(true);
    expect(matchesQuery(target, 'ineer')).toBe(true);
  });

  it('treats blank queries as "match everything"', () => {
    expect(matchesQuery(target, '')).toBe(true);
    expect(matchesQuery(target, '    ')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesQuery(target, 'plumber')).toBe(false);
  });

  it('tolerates a missing location', () => {
    expect(matchesQuery(app({ location: undefined }), 'anything')).toBe(false);
  });
});

describe('empty datasets', () => {
  it('returns an empty array for every filter combination', () => {
    expect(filterAndSortApplications([], EMPTY_FILTERS)).toEqual([]);
    expect(filterAndSortApplications([], withFilters({ status: 'Interview' }))).toEqual([]);
    expect(filterAndSortApplications([], withFilters({ priority: 'High' }))).toEqual([]);
    expect(filterAndSortApplications([], withFilters({ tag: 'Remote' }))).toEqual([]);
    expect(sortApplications([], 'priority')).toEqual([]);
  });
});

describe('individual filters', () => {
  const pool = [
    app({ id: 'a', status: 'Interview', priority: 'High', source: 'LinkedIn', tags: ['Remote'], company_name: 'Stripe' }),
    app({ id: 'b', status: 'Interview', priority: 'Low', source: 'Indeed', tags: ['Onsite'], company_name: 'Airbnb' }),
    app({ id: 'c', status: 'Applied', priority: 'High', source: 'LinkedIn', tags: ['remote', 'Referral'], company_name: 'Vercel' }),
    app({ id: 'd', status: 'Rejected', priority: 'Medium', source: null, tags: [], company_name: 'Datadog' })
  ];

  it('returns everything when no filter is applied', () => {
    expect(filterAndSortApplications(pool, EMPTY_FILTERS)).toHaveLength(4);
  });

  it('filters by status', () => {
    expect(ids(filterAndSortApplications(pool, withFilters({ status: 'Interview' }))).sort())
      .toEqual(['a', 'b']);
  });

  it('filters by priority', () => {
    expect(ids(filterAndSortApplications(pool, withFilters({ priority: 'High' }))).sort())
      .toEqual(['a', 'c']);
    expect(filterAndSortApplications(pool, withFilters({ priority: 'Low' }))).toHaveLength(1);
  });

  it('filters by source, and a null source never matches a chosen source', () => {
    expect(ids(filterAndSortApplications(pool, withFilters({ source: 'LinkedIn' }))).sort())
      .toEqual(['a', 'c']);
    expect(ids(filterAndSortApplications(pool, withFilters({ source: 'Referral' })))).toEqual([]);
  });

  it('filters by tag case-insensitively', () => {
    expect(ids(filterAndSortApplications(pool, withFilters({ tag: 'Remote' }))).sort())
      .toEqual(['a', 'c']);
    expect(ids(filterAndSortApplications(pool, withFilters({ tag: 'REMOTE' }))).sort())
      .toEqual(['a', 'c']);
    expect(ids(filterAndSortApplications(pool, withFilters({ tag: '  remote  ' }))).sort())
      .toEqual(['a', 'c']);
  });

  it('treats a blank tag filter as "any tag"', () => {
    expect(filterAndSortApplications(pool, withFilters({ tag: '   ' }))).toHaveLength(4);
  });

  it('filters by free text', () => {
    expect(ids(filterAndSortApplications(pool, withFilters({ query: 'vercel' })))).toEqual(['c']);
  });
});

describe('combined filters', () => {
  const pool = [
    app({ id: 'a', status: 'Interview', priority: 'High', source: 'LinkedIn', tags: ['Remote'], company_name: 'Stripe' }),
    app({ id: 'b', status: 'Interview', priority: 'Low', source: 'Indeed', tags: ['Remote'], company_name: 'Airbnb' }),
    app({ id: 'c', status: 'Applied', priority: 'High', source: 'LinkedIn', tags: ['Referral'], company_name: 'Vercel' })
  ];

  it('combines with AND', () => {
    expect(ids(filterAndSortApplications(pool, withFilters({ status: 'Interview', priority: 'High' }))))
      .toEqual(['a']);
    expect(ids(filterAndSortApplications(pool, withFilters({ source: 'LinkedIn', tag: 'remote' }))))
      .toEqual(['a']);
    expect(ids(filterAndSortApplications(pool, withFilters({ query: 'stripe', priority: 'High', status: 'Interview' }))))
      .toEqual(['a']);
  });

  it('returns nothing for a contradictory combination', () => {
    expect(filterAndSortApplications(pool, withFilters({ status: 'Interview', source: 'LinkedIn', priority: 'Low' })))
      .toHaveLength(0);
  });

  it('exposes the same decision through matchesFilters', () => {
    const filters = withFilters({ status: 'Interview', priority: 'High' });
    expect(matchesFilters(pool[0], filters)).toBe(true);
    expect(matchesFilters(pool[1], filters)).toBe(false);
  });
});

describe('hasActiveFilters', () => {
  it('is false when nothing narrows the list', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters(withFilters({ query: '   ' }))).toBe(false);
  });

  it('ignores sort order, which reorders rather than narrows', () => {
    expect(hasActiveFilters(withFilters({ sort: 'priority' }))).toBe(false);
  });

  it('is true for each narrowing filter', () => {
    expect(hasActiveFilters(withFilters({ query: 'x' }))).toBe(true);
    expect(hasActiveFilters(withFilters({ status: 'Offer' }))).toBe(true);
    expect(hasActiveFilters(withFilters({ priority: 'High' }))).toBe(true);
    expect(hasActiveFilters(withFilters({ source: 'Indeed' }))).toBe(true);
    expect(hasActiveFilters(withFilters({ tag: 'Remote' }))).toBe(true);
  });
});

describe('sorting', () => {
  it('orders by priority High > Medium > Low, tie-breaking on company', () => {
    const result = sortApplications([
      app({ id: 'low', priority: 'Low', company_name: 'Zeta' }),
      app({ id: 'high-b', priority: 'High', company_name: 'Beta' }),
      app({ id: 'med', priority: 'Medium', company_name: 'Alpha' }),
      app({ id: 'high-a', priority: 'High', company_name: 'Alpha' })
    ], 'priority');
    expect(ids(result)).toEqual(['high-a', 'high-b', 'med', 'low']);
  });

  it('sorts an unrecognised priority last instead of producing NaN', () => {
    const result = sortApplications([
      app({ id: 'bogus', priority: 'Urgent' as Application['priority'] }),
      app({ id: 'high', priority: 'High' })
    ], 'priority');
    expect(ids(result)).toEqual(['high', 'bogus']);
  });

  it('sorts by application date, newest and oldest', () => {
    const pool = [
      app({ id: 'mid', application_date: '2026-05-01' }),
      app({ id: 'new', application_date: '2026-09-01' }),
      app({ id: 'old', application_date: '2026-01-01' })
    ];
    expect(ids(sortApplications(pool, 'newest'))).toEqual(['new', 'mid', 'old']);
    expect(ids(sortApplications(pool, 'oldest'))).toEqual(['old', 'mid', 'new']);
  });

  it('sorts by most recently updated', () => {
    const pool = [
      app({ id: 'stale', updated_at: '2026-01-01T00:00:00Z' }),
      app({ id: 'fresh', updated_at: '2026-06-01T00:00:00Z' })
    ];
    expect(ids(sortApplications(pool, 'recently_updated'))).toEqual(['fresh', 'stale']);
  });

  it('sorts by company name', () => {
    const pool = [
      app({ id: 'z', company_name: 'Zebra' }),
      app({ id: 'a', company_name: 'Apple' })
    ];
    expect(ids(sortApplications(pool, 'company'))).toEqual(['a', 'z']);
  });

  it('places missing deadlines last, soonest first', () => {
    const pool = [
      app({ id: 'none', deadline: undefined, company_name: 'Mmm' }),
      app({ id: 'far', deadline: '2026-12-01' }),
      app({ id: 'soon', deadline: '2026-02-01' })
    ];
    expect(ids(sortApplications(pool, 'deadline'))).toEqual(['soon', 'far', 'none']);
  });

  it('treats an invalid deadline as missing rather than corrupting the order', () => {
    const pool = [
      app({ id: 'invalid', deadline: 'not-a-date', company_name: 'Bbb' }),
      app({ id: 'valid', deadline: '2026-02-01', company_name: 'Aaa' }),
      app({ id: 'missing', deadline: undefined, company_name: 'Aaa' })
    ];
    const result = ids(sortApplications(pool, 'deadline'));
    expect(result[0]).toBe('valid');
    // The two undated rows follow, ordered by company name — never NaN-shuffled.
    expect(result.slice(1).sort()).toEqual(['invalid', 'missing']);
  });

  it('falls back to newest for an unknown sort key', () => {
    const pool = [
      app({ id: 'old', application_date: '2026-01-01' }),
      app({ id: 'new', application_date: '2026-09-01' })
    ];
    expect(ids(sortApplications(pool, 'bogus' as never))).toEqual(['new', 'old']);
  });

  it('does not mutate its input', () => {
    const pool = [app({ id: '1', priority: 'Low' }), app({ id: '2', priority: 'High' })];
    const before = ids(pool);
    sortApplications(pool, 'priority');
    expect(ids(pool)).toEqual(before);
  });
});
