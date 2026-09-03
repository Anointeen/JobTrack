import { Application, CalendarEvent, CalendarEventType, NotificationPreferences } from '../types';
import { daysUntil } from './applicationFilters';
import { EVENT_TYPE_LABEL, localDayKey } from './calendar';

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

export type NotificationKind = 'deadline' | 'interview' | 'follow_up' | 'calendar_event';

/** Drives ordering and the colour tokens the panel uses. */
export type NotificationUrgency = 'overdue' | 'today' | 'soon';

export interface AppNotification {
  /** Stable across renders: derived from the application and the kind. */
  id: string;
  kind: NotificationKind;
  urgency: NotificationUrgency;
  /** Absent for a standalone calendar event. */
  applicationId?: string;
  /** Set for a calendar-event reminder. */
  eventId?: string;
  /** Where selecting the notification should take the user. */
  href: string;
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

/** "in 45 minutes", "in 2 hours", "in 3 days", "now". */
const countdownLabel = (minutes: number): string => {
  if (minutes <= 1) return 'now';
  if (minutes < 60) return `in ${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
};

const URGENCY_RANK: Record<NotificationUrgency, number> = {
  overdue: 0,
  today: 1,
  soon: 2
};

/**
 * Which preference switch governs a calendar event.
 *
 * The three existing switches already describe the three kinds of thing a job
 * search reminds you about, so event types map onto them rather than a fourth
 * switch being bolted on: an interview stage is an interview, a deadline is a
 * deadline, and a follow-up is a follow-up. 'other' follows deadline_reminders
 * because a dated commitment is what it most resembles.
 */
const EVENT_TYPE_PREFERENCE: Record<
  CalendarEventType,
  'deadline_reminders' | 'interview_reminders' | 'follow_up_reminders'
> = {
  phone_screen: 'interview_reminders',
  technical_interview: 'interview_reminders',
  onsite: 'interview_reminders',
  application_deadline: 'deadline_reminders',
  offer_deadline: 'deadline_reminders',
  follow_up: 'follow_up_reminders',
  other: 'deadline_reminders'
};

/**
 * When an event's reminder starts showing, as epoch ms, or null when the event
 * has no reminder set.
 *
 * `reminder_minutes_before` of `null` means the user turned the reminder off,
 * which is deliberately different from `0` ("remind me as it starts"). A falsy
 * check would collapse the two and silently resurrect a disabled reminder.
 */
export const reminderStartsAt = (event: CalendarEvent): number | null => {
  const minutes = event.reminder_minutes_before;
  if (minutes === null || minutes === undefined) return null;
  const eventMs = Date.parse(event.event_date);
  if (Number.isNaN(eventMs)) return null;
  return eventMs - minutes * 60_000;
};

/**
 * True when an event's reminder should currently be showing: the lead time has
 * elapsed and the event has not yet started.
 *
 * It stops at the start rather than lingering afterwards, because an event
 * already under way is no longer something the user needs warning about, and a
 * reminder that outlives its event is exactly the kind of stale signal the
 * unconditional unread dot used to be.
 */
export const isReminderDue = (event: CalendarEvent, now: number = Date.now()): boolean => {
  const startsAt = reminderStartsAt(event);
  if (startsAt === null) return false;
  const eventMs = Date.parse(event.event_date);
  return now >= startsAt && now <= eventMs;
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
  >,
  /** Calendar events, for reminders. Defaults to none so existing callers work. */
  events: CalendarEvent[] = [],
  now: number = Date.now()
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
          href: `/applications/${app.id}`,
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
        href: `/applications/${app.id}`,
        title: `Follow up ${whenLabel(followUpDays)}`,
        detail: app.follow_up_note?.trim() || detail,
        date: app.follow_up_date as string,
        days: followUpDays
      });
    }
  }

  // Calendar-event reminders. These are time-of-day precise rather than
  // day-granular: an event's reminder appears once its lead time has elapsed,
  // which is what reminder_minutes_before means.
  for (const event of events) {
    if (!isReminderDue(event, now)) continue;
    if (!prefs[EVENT_TYPE_PREFERENCE[event.event_type] ?? 'deadline_reminders']) continue;

    const eventMs = Date.parse(event.event_date);
    const minutesAway = Math.max(0, Math.round((eventMs - now) / 60_000));
    const days = daysUntil(localDayKey(event.event_date));

    items.push({
      id: `calendar_event:${event.id}`,
      kind: 'calendar_event',
      // A reminder only ever shows between its lead time and the event, so it
      // is never overdue; "today" and "soon" are the only reachable states.
      urgency: days === 0 ? 'today' : 'soon',
      applicationId: event.application_id ?? undefined,
      eventId: event.id,
      href: '/calendar',
      title: `${EVENT_TYPE_LABEL[event.event_type]} ${countdownLabel(minutesAway)}`,
      detail: event.title,
      date: localDayKey(event.event_date),
      days: days ?? 0
    });
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
