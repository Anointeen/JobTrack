import { Application, ApplicationStatus, ApplicationStatusHistory } from '../types';
import {
  ACTIVE_STATUSES,
  RESPONDED_STATUSES,
  SUBMITTED_STATUSES,
  parseDateMs,
  startOfToday,
  daysUntil
} from './applicationFilters';

const DAY_MS = 86_400_000;

export interface DashboardMetrics {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  rejected: number;
  /** Applications actually sent — excludes 'Saved' bookmarks. */
  submitted: number;
  /** Submitted applications that drew any employer response. */
  responded: number;
  lastSevenDays: number;
  lastThirtyDays: number;
  /** null when there is nothing submitted yet, so the UI can say so honestly. */
  responseRate: number | null;
  interviewRate: number | null;
  offerRate: number | null;
  statusCounts: Record<ApplicationStatus, number>;
  upcomingDeadlines: Application[];
}

const emptyStatusCounts = (): Record<ApplicationStatus, number> => ({
  Saved: 0, Applied: 0, Assessment: 0, Interview: 0, Offer: 0, Rejected: 0, Withdrawn: 0
});

/** Percentage rounded to one decimal, or null when the denominator is zero. */
const rate = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;

export const computeDashboardMetrics = (applications: Application[]): DashboardMetrics => {
  const statusCounts = emptyStatusCounts();
  for (const app of applications) {
    if (statusCounts[app.status] !== undefined) statusCounts[app.status] += 1;
  }

  const today = startOfToday();
  const countSince = (days: number) =>
    applications.filter(a => {
      const ms = parseDateMs(a.application_date) ?? parseDateMs(a.created_at);
      return ms !== null && ms >= today - days * DAY_MS;
    }).length;

  const submitted = applications.filter(a => SUBMITTED_STATUSES.includes(a.status)).length;
  const responded = applications.filter(a => RESPONDED_STATUSES.includes(a.status)).length;
  const interviews = statusCounts.Interview;
  const offers = statusCounts.Offer;

  // Only deadlines that are still ahead, and only for opportunities still in
  // play — a passed date or a closed application is not "upcoming".
  const upcomingDeadlines = applications
    .filter(a => {
      if (a.status === 'Rejected' || a.status === 'Withdrawn') return false;
      const days = daysUntil(a.deadline);
      return days !== null && days >= 0;
    })
    .sort((a, b) => (parseDateMs(a.deadline) ?? 0) - (parseDateMs(b.deadline) ?? 0));

  return {
    total: applications.length,
    active: applications.filter(a => ACTIVE_STATUSES.includes(a.status)).length,
    interviews,
    offers,
    rejected: statusCounts.Rejected,
    submitted,
    responded,
    lastSevenDays: countSince(7),
    lastThirtyDays: countSince(30),
    responseRate: rate(responded, submitted),
    interviewRate: rate(interviews, submitted),
    offerRate: rate(offers, submitted),
    statusCounts,
    upcomingDeadlines
  };
};

/**
 * Mean days between applying and first reaching Interview.
 *
 * Uses the immutable status-history log: for each application, the earliest
 * entry whose new_status is 'Interview'. Returns null when no application has
 * reached interview yet, so the dashboard can show an insufficient-data state
 * rather than a misleading zero.
 */
export const computeAverageDaysToInterview = (
  applications: Application[],
  history: ApplicationStatusHistory[]
): { averageDays: number | null; sampleSize: number } => {
  const appliedAtById = new Map<string, number>();
  for (const app of applications) {
    const ms = parseDateMs(app.application_date) ?? parseDateMs(app.created_at);
    if (ms !== null) appliedAtById.set(app.id, ms);
  }

  const firstInterviewByApp = new Map<string, number>();
  for (const entry of history) {
    if (entry.new_status !== 'Interview') continue;
    const ms = parseDateMs(entry.created_at);
    if (ms === null) continue;
    const existing = firstInterviewByApp.get(entry.application_id);
    if (existing === undefined || ms < existing) {
      firstInterviewByApp.set(entry.application_id, ms);
    }
  }

  const durations: number[] = [];
  for (const [appId, interviewMs] of firstInterviewByApp) {
    const appliedMs = appliedAtById.get(appId);
    if (appliedMs === undefined) continue;
    const days = (interviewMs - appliedMs) / DAY_MS;
    // Guard against clock skew or a same-day backdated entry.
    if (Number.isFinite(days) && days >= 0) durations.push(days);
  }

  if (durations.length === 0) return { averageDays: null, sampleSize: 0 };

  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  return { averageDays: Math.round(mean * 10) / 10, sampleSize: durations.length };
};
