import { describe, it, expect } from 'vitest';
import { Application, ApplicationStatusHistory } from '../types';
import { computeDashboardMetrics, computeAverageDaysToInterview } from './dashboardMetrics';

// ---------------------------------------------------------------------------
// Helpers — see applicationFilters.test.ts for why dates are built from local
// calendar parts rather than toISOString().
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date, `offsetDays` from today, as 'YYYY-MM-DD'. */
const localDate = (offsetDays: number): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Local timestamp at midday, `offsetDays` from today. */
const localTimestamp = (offsetDays: number): string => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

let seq = 0;
const app = (over: Partial<Application> = {}): Application => ({
  id: over.id ?? `app-${++seq}`,
  user_id: 'user-1',
  company_name: 'Acme',
  job_title: 'Engineer',
  job_type: 'Full-time',
  status: 'Applied',
  application_date: localDate(-10),
  priority: 'Medium',
  tags: [],
  created_at: localTimestamp(-10),
  updated_at: localTimestamp(-10),
  ...over
});

const history = (over: Partial<ApplicationStatusHistory> = {}): ApplicationStatusHistory => ({
  id: `hist-${++seq}`,
  application_id: 'app-1',
  user_id: 'user-1',
  previous_status: 'Applied',
  new_status: 'Interview',
  created_at: localTimestamp(-1),
  ...over
});

// ---------------------------------------------------------------------------

describe('computeDashboardMetrics — zero applications', () => {
  const m = computeDashboardMetrics([]);

  it('reports zero counts', () => {
    expect(m.total).toBe(0);
    expect(m.active).toBe(0);
    expect(m.interviews).toBe(0);
    expect(m.offers).toBe(0);
    expect(m.rejected).toBe(0);
    expect(m.submitted).toBe(0);
    expect(m.responded).toBe(0);
    expect(m.lastSevenDays).toBe(0);
    expect(m.lastThirtyDays).toBe(0);
  });

  it('returns null rates rather than a misleading zero', () => {
    // null lets the UI say "not enough data yet"; 0% would read as a real
    // result the user had earned.
    expect(m.responseRate).toBeNull();
    expect(m.interviewRate).toBeNull();
    expect(m.offerRate).toBeNull();
  });

  it('returns empty collections', () => {
    expect(m.upcomingDeadlines).toEqual([]);
    expect(Object.values(m.statusCounts).every(v => v === 0)).toBe(true);
  });
});

describe('computeDashboardMetrics — status counts', () => {
  const m = computeDashboardMetrics([
    app({ status: 'Saved' }),
    app({ status: 'Applied' }),
    app({ status: 'Assessment' }),
    app({ status: 'Interview' }),
    app({ status: 'Offer' }),
    app({ status: 'Rejected' }),
    app({ status: 'Withdrawn' })
  ]);

  it('counts every status exactly once', () => {
    expect(m.total).toBe(7);
    expect(m.statusCounts).toEqual({
      Saved: 1, Applied: 1, Assessment: 1, Interview: 1, Offer: 1, Rejected: 1, Withdrawn: 1
    });
  });

  it('counts only in-progress statuses as active', () => {
    // Applied + Assessment + Interview.
    expect(m.active).toBe(3);
  });

  it('excludes Saved from the submitted denominator', () => {
    // Everything except Saved.
    expect(m.submitted).toBe(6);
  });
});

describe('computeDashboardMetrics — rates', () => {
  it('returns null when nothing has been submitted', () => {
    // Saved is a bookmark, not a submission, so the denominator is zero.
    const m = computeDashboardMetrics([app({ status: 'Saved' }), app({ status: 'Saved' })]);
    expect(m.submitted).toBe(0);
    expect(m.responseRate).toBeNull();
    expect(m.interviewRate).toBeNull();
    expect(m.offerRate).toBeNull();
  });

  it('counts a rejection as a response', () => {
    const m = computeDashboardMetrics([
      app({ status: 'Applied' }),
      app({ status: 'Rejected' })
    ]);
    expect(m.submitted).toBe(2);
    expect(m.responded).toBe(1);
    expect(m.responseRate).toBe(50);
  });

  it('computes response, interview and offer rates', () => {
    const m = computeDashboardMetrics([
      app({ status: 'Applied' }),
      app({ status: 'Applied' }),
      app({ status: 'Assessment' }),
      app({ status: 'Interview' }),
      app({ status: 'Offer' })
    ]);
    expect(m.submitted).toBe(5);
    expect(m.responded).toBe(3);          // Assessment + Interview + Offer
    expect(m.responseRate).toBe(60);
    expect(m.interviewRate).toBe(20);     // 1 of 5
    expect(m.offerRate).toBe(20);
  });

  it('rounds rates to one decimal place', () => {
    const m = computeDashboardMetrics([
      app({ status: 'Interview' }),
      app({ status: 'Applied' }),
      app({ status: 'Applied' })
    ]);
    // 1/3 = 33.333... -> 33.3
    expect(m.interviewRate).toBe(33.3);
  });

  it('reports 100% when every submission responded', () => {
    const m = computeDashboardMetrics([app({ status: 'Offer' }), app({ status: 'Rejected' })]);
    expect(m.responseRate).toBe(100);
  });
});

describe('computeDashboardMetrics — date windows', () => {
  it('counts applications inside the 7 and 30 day windows', () => {
    const m = computeDashboardMetrics([
      app({ application_date: localDate(0) }),
      app({ application_date: localDate(-3) }),
      app({ application_date: localDate(-6) }),
      app({ application_date: localDate(-20) }),
      app({ application_date: localDate(-100) })
    ]);
    expect(m.lastSevenDays).toBe(3);
    expect(m.lastThirtyDays).toBe(4);
  });

  it('includes the exact window boundary', () => {
    const m = computeDashboardMetrics([app({ application_date: localDate(-7) })]);
    expect(m.lastSevenDays).toBe(1);
  });

  it('excludes an application just outside the window', () => {
    const m = computeDashboardMetrics([app({ application_date: localDate(-8) })]);
    expect(m.lastSevenDays).toBe(0);
    expect(m.lastThirtyDays).toBe(1);
  });

  it('falls back to created_at when application_date is unusable', () => {
    const m = computeDashboardMetrics([
      app({ application_date: '' as unknown as string, created_at: localTimestamp(-2) })
    ]);
    expect(m.lastSevenDays).toBe(1);
  });

  it('ignores an application with no usable date at all', () => {
    const m = computeDashboardMetrics([
      app({ application_date: 'garbage', created_at: 'also-garbage' })
    ]);
    expect(m.lastSevenDays).toBe(0);
    expect(m.lastThirtyDays).toBe(0);
    expect(m.total).toBe(1); // still counted in the total
  });
});

describe('computeDashboardMetrics — upcoming deadlines', () => {
  it('excludes past deadlines and includes today', () => {
    const m = computeDashboardMetrics([
      app({ id: 'past', deadline: localDate(-1) }),
      app({ id: 'today', deadline: localDate(0) }),
      app({ id: 'future', deadline: localDate(5) })
    ]);
    expect(m.upcomingDeadlines.map(a => a.id)).toEqual(['today', 'future']);
  });

  it('excludes applications that are already closed', () => {
    const m = computeDashboardMetrics([
      app({ id: 'rejected', deadline: localDate(3), status: 'Rejected' }),
      app({ id: 'withdrawn', deadline: localDate(3), status: 'Withdrawn' }),
      app({ id: 'live', deadline: localDate(3), status: 'Interview' })
    ]);
    expect(m.upcomingDeadlines.map(a => a.id)).toEqual(['live']);
  });

  it('excludes applications with no deadline', () => {
    const m = computeDashboardMetrics([app({ deadline: undefined }), app({ deadline: null as never })]);
    expect(m.upcomingDeadlines).toEqual([]);
  });

  it('ignores an invalid deadline instead of surfacing it', () => {
    const m = computeDashboardMetrics([app({ deadline: 'not-a-date' })]);
    expect(m.upcomingDeadlines).toEqual([]);
  });

  it('orders soonest first', () => {
    const m = computeDashboardMetrics([
      app({ id: 'later', deadline: localDate(10) }),
      app({ id: 'sooner', deadline: localDate(2) }),
      app({ id: 'middle', deadline: localDate(5) })
    ]);
    expect(m.upcomingDeadlines.map(a => a.id)).toEqual(['sooner', 'middle', 'later']);
  });
});

describe('computeAverageDaysToInterview', () => {
  it('returns null with no applications or history', () => {
    expect(computeAverageDaysToInterview([], [])).toEqual({ averageDays: null, sampleSize: 0 });
  });

  it('returns null when nothing has reached interview', () => {
    const apps = [app({ id: 'a1' })];
    const logs = [history({ application_id: 'a1', new_status: 'Assessment' })];
    expect(computeAverageDaysToInterview(apps, logs)).toEqual({ averageDays: null, sampleSize: 0 });
  });

  it('measures days from application date to the interview entry', () => {
    const apps = [app({ id: 'a1', application_date: localDate(-10) })];
    const logs = [history({ application_id: 'a1', created_at: localTimestamp(-4) })];
    const result = computeAverageDaysToInterview(apps, logs);
    expect(result.sampleSize).toBe(1);
    // 10 days ago -> 4 days ago is 6 days (timestamp is midday, so 6.5 -> 6.5).
    expect(result.averageDays).toBeGreaterThanOrEqual(6);
    expect(result.averageDays).toBeLessThanOrEqual(7);
  });

  it('uses the earliest interview entry when an application re-interviews', () => {
    const apps = [app({ id: 'a1', application_date: localDate(-20) })];
    const logs = [
      history({ id: 'h-late', application_id: 'a1', created_at: localTimestamp(-2) }),
      history({ id: 'h-early', application_id: 'a1', created_at: localTimestamp(-15) })
    ];
    const result = computeAverageDaysToInterview(apps, logs);
    expect(result.sampleSize).toBe(1);
    // Earliest entry: 20 -> 15 days ago, about 5 days.
    expect(result.averageDays).toBeGreaterThanOrEqual(5);
    expect(result.averageDays).toBeLessThanOrEqual(6);
  });

  it('averages across several applications', () => {
    const apps = [
      app({ id: 'a1', application_date: localDate(-10) }),
      app({ id: 'a2', application_date: localDate(-20) })
    ];
    const logs = [
      history({ application_id: 'a1', created_at: localTimestamp(-8) }),   // ~2 days
      history({ application_id: 'a2', created_at: localTimestamp(-12) })   // ~8 days
    ];
    const result = computeAverageDaysToInterview(apps, logs);
    expect(result.sampleSize).toBe(2);
    expect(result.averageDays).toBeGreaterThanOrEqual(5);
    expect(result.averageDays).toBeLessThanOrEqual(6);
  });

  it('ignores history rows for applications that no longer exist', () => {
    const logs = [history({ application_id: 'deleted-app' })];
    expect(computeAverageDaysToInterview([app({ id: 'a1' })], logs))
      .toEqual({ averageDays: null, sampleSize: 0 });
  });

  it('ignores non-interview transitions', () => {
    const apps = [app({ id: 'a1', application_date: localDate(-10) })];
    const logs = [
      history({ application_id: 'a1', new_status: 'Offer', created_at: localTimestamp(-2) }),
      history({ application_id: 'a1', new_status: 'Rejected', created_at: localTimestamp(-1) })
    ];
    expect(computeAverageDaysToInterview(apps, logs).sampleSize).toBe(0);
  });

  it('discards an interview logged before the application date', () => {
    // Backdated or clock-skewed rows would otherwise produce a negative mean.
    const apps = [app({ id: 'a1', application_date: localDate(-5) })];
    const logs = [history({ application_id: 'a1', created_at: localTimestamp(-30) })];
    expect(computeAverageDaysToInterview(apps, logs)).toEqual({ averageDays: null, sampleSize: 0 });
  });

  it('ignores an unparseable history timestamp', () => {
    const apps = [app({ id: 'a1' })];
    const logs = [history({ application_id: 'a1', created_at: 'not-a-timestamp' })];
    expect(computeAverageDaysToInterview(apps, logs).sampleSize).toBe(0);
  });

  it('ignores an application with an unparseable application date', () => {
    const apps = [app({ id: 'a1', application_date: 'garbage', created_at: 'garbage' })];
    const logs = [history({ application_id: 'a1' })];
    expect(computeAverageDaysToInterview(apps, logs).sampleSize).toBe(0);
  });
});
