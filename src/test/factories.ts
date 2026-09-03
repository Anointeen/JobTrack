import {
  Application,
  ApplicationStatusHistory,
  CalendarEvent,
  NotificationPreferences,
  UserProfile,
  UserSession
} from '../types';

/**
 * Deterministic fixtures shared by the integration suites.
 *
 * Dates are built from local calendar parts rather than toISOString(), so
 * "today"-relative assertions behave identically in every timezone.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date, `offsetDays` from today, as 'YYYY-MM-DD'. */
export const localDate = (offsetDays = 0): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

let seq = 0;
export const resetFactorySequence = () => { seq = 0; };

export const makeUser = (over: Partial<UserSession> = {}): UserSession => ({
  id: 'user-1',
  email: 'tester@example.test',
  email_verified: true,
  ...over
});

export const makeProfile = (over: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-1',
  full_name: 'Test User',
  professional_title: 'QA Fixture',
  location: 'Testville',
  phone: '',
  linkedin_url: '',
  avatar_url: '',
  theme_preference: 'system',
  onboarding_completed: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over
});

export const makeApplication = (over: Partial<Application> = {}): Application => ({
  id: over.id ?? `app-${++seq}`,
  user_id: 'user-1',
  company_name: 'Acme Corp',
  job_title: 'Software Engineer',
  location: 'Remote',
  job_type: 'Full-time',
  status: 'Applied',
  application_date: localDate(-10),
  priority: 'Medium',
  tags: [],
  source: null,
  follow_up_date: null,
  follow_up_note: null,
  notes: '',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over
});

export const makeHistory = (
  over: Partial<ApplicationStatusHistory> = {}
): ApplicationStatusHistory => ({
  id: `hist-${++seq}`,
  application_id: 'app-1',
  user_id: 'user-1',
  previous_status: 'Applied',
  new_status: 'Interview',
  note: 'Moved to interview',
  created_at: '2026-01-05T00:00:00.000Z',
  ...over
});

export const makeNotificationPreferences = (
  over: Partial<NotificationPreferences> = {}
): NotificationPreferences => ({
  id: 'notif-1',
  user_id: 'user-1',
  deadline_reminders: true,
  interview_reminders: true,
  follow_up_reminders: true,
  ...over
});

/**
 * A calendar event. `event_date` defaults to a fixed offset from *now* rather
 * than a hard-coded date, because almost every calendar assertion is relative
 * to the present ("upcoming", "this week", "reminder due").
 */
export const makeCalendarEvent = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: over.id ?? `evt-${++seq}`,
  user_id: 'user-1',
  application_id: null,
  title: 'Technical interview',
  event_type: 'technical_interview',
  event_date: hoursFromNow(24),
  notes: null,
  reminder_minutes_before: 60,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over
});

/** An ISO timestamp `hours` from now — negative for the past. */
export const hoursFromNow = (hours: number): string =>
  new Date(Date.now() + hours * 3_600_000).toISOString();

/** An ISO timestamp at `hour` local time, `dayOffset` days from today. */
export const localDateTime = (dayOffset: number, hour = 9, minute = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
