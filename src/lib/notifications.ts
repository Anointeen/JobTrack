import { Application, NotificationPreferences } from '../types';
import { daysUntil } from './applicationFilters';

/**
 * Notifications, derived from data JobTrack already holds.
 *
 * There is no notifications table and this file does not need one. Every
 * reminder JobTrack can usefully give is already implied by an application's
 * own `deadline`, `follow_up_date` and `status`, so notifications are computed
 * from the applications already loaded in ApplicationsContext and filtered by
 * the switches in the existing `notification_preferences` table. Nothing is
 * written, nothing is polled, and no second source of truth is created.
 *
 * What this deliberately does *not* do is model read/unread state. Marking an
 * item read is a per-user, per-item fact with nowhere to live in the current
 * schema, and inventing a table for it was out of scope. The badge therefore
 * reports what currently needs attention rather than what has not been seen —
 * an honest signal that also cannot go stale.
 */

/** How far ahead, and how far back, a dated item is worth mentioning. */
export const NOTIFICATION_WINDOW_DAYS = 7;

export type NotificationKind = 'deadline' | 'interview' | 'follow_up';

/** Drives ordering and the colour tokens the panel uses. */
export type NotificationUrgency = 'overdue' | 'today' | 'soon';

export interface AppNotification {
  /** Stable across renders: derived from the application and the kind. */
  id: string;
  kind: NotificationKind;
  urgency: NotificationUrgency;
  applicationId: string;
  /** Short lead line, e.g. "Deadline today". */
  title: string;
  /** The application it concerns, e.g. "Senior Engineer at Stripe". */
  detail: string;
  /** ISO YYYY-MM-DD. */
  date: string;
  /** Negative when the date has passed. */
  days: number;
}

/**
 * An application nobody is waiting on. A rejected or withdrawn application can
 * still hold a deadline, and reminding someone about it would be noise at best.
 */
const isClosed = (app: Application) =>
  app.status === 'Rejected' || app.status === 'Withdrawn';

const urgencyOf = (days: number): NotificationUrgency =>
  days < 0 ? 'overdue' : days === 0 ? 'today' : 'soon';

const whenLabel = (days: number): string => {
  if (days < 0) return days === -1 ? 'yesterday' : `${Math.abs(days)} days ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
};

const URGENCY_RANK: Record<NotificationUrgency, number> = {
  overdue: 0,
  today: 1,
  soon: 2
};

/**
 * Builds the current notification list.
 *
 * The window is symmetric: something due in the next week is worth flagging,
 * and something that slipped in the last week is worth rescuing, but a deadline
 * missed two months ago is history and would otherwise sit in the panel forever.
 *
 * `interview_reminders` gates the deadline of an application that has reached
 * the Interview stage, and `deadline_reminders` gates every other deadline.
 * Splitting it that way gives all three existing preference switches something
 * real to control without inventing an interview-date column that the schema
 * does not have, and without any application producing two copies of the same
 * date.
 */
export const buildNotifications = (
  applications: Application[],
  prefs: Pick<
    NotificationPreferences,
    'deadline_reminders' | 'interview_reminders' | 'follow_up_reminders'
  >
): AppNotification[] => {
  const items: AppNotification[] = [];
  const inWindow = (days: number | null): days is number =>
    days !== null && days >= -NOTIFICATION_WINDOW_DAYS && days <= NOTIFICATION_WINDOW_DAYS;

  for (const app of applications) {
    if (isClosed(app)) continue;

    const detail = `${app.job_title} at ${app.company_name}`;

    const deadlineDays = daysUntil(app.deadline);
    if (inWindow(deadlineDays)) {
      const atInterview = app.status === 'Interview';
      const enabled = atInterview ? prefs.interview_reminders : prefs.deadline_reminders;
      if (enabled) {
        items.push({
          id: `${atInterview ? 'interview' : 'deadline'}:${app.id}`,
          kind: atInterview ? 'interview' : 'deadline',
          urgency: urgencyOf(deadlineDays),
          applicationId: app.id,
          title: atInterview
            ? `Interview stage — due ${whenLabel(deadlineDays)}`
            : `Deadline ${whenLabel(deadlineDays)}`,
          detail,
          date: app.deadline as string,
          days: deadlineDays
        });
      }
    }

    const followUpDays = daysUntil(app.follow_up_date);
    if (prefs.follow_up_reminders && inWindow(followUpDays)) {
      items.push({
        id: `follow_up:${app.id}`,
        kind: 'follow_up',
        urgency: urgencyOf(followUpDays),
        applicationId: app.id,
        title: `Follow up ${whenLabel(followUpDays)}`,
        detail: app.follow_up_note?.trim() || detail,
        date: app.follow_up_date as string,
        days: followUpDays
      });
    }
  }

  // Most pressing first: overdue, then today, then by how soon. Ties break on
  // the application name so the order is stable between renders.
  return items.sort((a, b) =>
    URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
    a.days - b.days ||
    a.detail.localeCompare(b.detail)
  );
};

/** True when every reminder switch is off, which is a different empty state. */
export const allRemindersDisabled = (
  prefs: Pick<
    NotificationPreferences,
    'deadline_reminders' | 'interview_reminders' | 'follow_up_reminders'
  >
): boolean =>
  !prefs.deadline_reminders && !prefs.interview_reminders && !prefs.follow_up_reminders;
