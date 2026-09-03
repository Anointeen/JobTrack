import { Application, CalendarEvent, CalendarEventType } from '../types';

/**
 * Pure calendar logic: month grids, grouping, formatting and reminder timing.
 *
 * Every date here is handled in the user's *local* calendar, and dates are
 * built from their parts wherever a day boundary matters. `new Date('2026-09-03')`
 * is UTC midnight, which resolves to the previous day for anyone west of
 * Greenwich; that bug has already been fixed once in this codebase, in
 * parseLocalDayMs in applicationFilters.ts.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' for the local day a timestamp falls on. */
export const localDayKey = (value: string | Date): string => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Local midnight of the day a timestamp falls on, as epoch ms. */
export const startOfLocalDay = (value: string | Date): number => {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return NaN;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export interface CalendarMonth {
  year: number;
  /** 0-indexed, matching Date#getMonth. */
  month: number;
}

/** The month a date falls in. */
export const monthOf = (value: string | Date): CalendarMonth => {
  const d = value instanceof Date ? value : new Date(value);
  return { year: d.getFullYear(), month: d.getMonth() };
};

/** The current month, in local time. */
export const currentMonth = (): CalendarMonth => monthOf(new Date());

/** Steps a month by `delta`, rolling the year over in both directions. */
export const addMonths = ({ year, month }: CalendarMonth, delta: number): CalendarMonth => {
  // Date normalises out-of-range months for us, negatives included.
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

/** Column headers, Sunday-first to match the grid below. */
export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const monthLabel = ({ year, month }: CalendarMonth): string =>
  `${MONTH_NAMES[month]} ${year}`;

export interface CalendarCell {
  /** 'YYYY-MM-DD', the key events are grouped under. */
  key: string;
  /** Day of the month, 1-31. */
  day: number;
  /** False for the leading and trailing days borrowed from adjacent months. */
  inMonth: boolean;
  isToday: boolean;
}

/**
 * The month laid out as whole weeks, Sunday-first.
 *
 * Always six rows. A fixed height stops the grid resizing as the user pages
 * between months, which is jarring and moves the controls out from under the
 * pointer mid-click.
 */
export const buildMonthGrid = ({ year, month }: CalendarMonth): CalendarCell[] => {
  const leadingDays = new Date(year, month, 1).getDay();
  const todayKey = localDayKey(new Date());

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    // Day 1 minus the weekday offset walks back into the previous month; Date
    // normalises both the negative start and the overflow at the far end.
    const date = new Date(year, month, 1 - leadingDays + i);
    const key = localDayKey(date);
    cells.push({
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
      isToday: key === todayKey
    });
  }
  return cells;
};

/** Events keyed by the local day they fall on, each day sorted by time. */
export const groupEventsByDay = (events: CalendarEvent[]): Map<string, CalendarEvent[]> => {
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = localDayKey(event.event_date);
    if (!key) continue;
    const bucket = byDay.get(key);
    if (bucket) bucket.push(event);
    else byDay.set(key, [event]);
  }
  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => Date.parse(a.event_date) - Date.parse(b.event_date));
  }
  return byDay;
};

/** Events from `now` onwards, soonest first. */
export const upcomingEvents = (
  events: CalendarEvent[],
  limit?: number,
  now: number = Date.now()
): CalendarEvent[] => {
  const future = events
    .filter(e => {
      const ms = Date.parse(e.event_date);
      return !Number.isNaN(ms) && ms >= now;
    })
    .sort((a, b) => Date.parse(a.event_date) - Date.parse(b.event_date));
  return limit === undefined ? future : future.slice(0, limit);
};

/**
 * Events between now and `days` ahead, soonest first.
 *
 * The window closes at the *end* of the final day rather than exactly N×24h
 * from now, so "this week" means seven calendar days and does not silently
 * drop an event scheduled later on the last of them.
 */
export const eventsWithinDays = (
  events: CalendarEvent[],
  days: number,
  now: number = Date.now()
): CalendarEvent[] => {
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  const endMs = end.getTime();
  return upcomingEvents(events, undefined, now)
    .filter(e => Date.parse(e.event_date) <= endMs);
};

// --- Presentation ----------------------------------------------------------

export const EVENT_TYPE_LABEL: Record<CalendarEventType, string> = {
  phone_screen: 'Phone screen',
  technical_interview: 'Technical interview',
  onsite: 'Onsite',
  application_deadline: 'Application deadline',
  follow_up: 'Follow-up',
  offer_deadline: 'Offer deadline',
  other: 'Other'
};

/**
 * Badge tone per event type, as a CSS class.
 *
 * These resolve to theme-aware token pairs defined in index.css, never raw
 * palette values: --amber-700 and its siblings are dark ink meant for light
 * surfaces and go unreadable when the dark theme flips the background beneath
 * them, which is exactly the defect the --meta-* roles were introduced to fix.
 */
export const EVENT_TYPE_TONE: Record<CalendarEventType, string> = {
  phone_screen: 'evt-sky',
  technical_interview: 'evt-indigo',
  onsite: 'evt-purple',
  application_deadline: 'evt-rose',
  follow_up: 'evt-amber',
  offer_deadline: 'evt-emerald',
  other: 'evt-slate'
};

/** e.g. "Thu, 3 Sep 2026". */
export const formatEventDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
};

/** e.g. "2:30 PM", following the viewer's locale. */
export const formatEventTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

export const formatEventDateTime = (iso: string): string => {
  const date = formatEventDate(iso);
  return date ? `${date} at ${formatEventTime(iso)}` : '';
};

/** "Today", "Tomorrow", "In 3 days", "Yesterday", "2 days ago". */
export const relativeDayLabel = (iso: string, now: number = Date.now()): string => {
  const target = startOfLocalDay(iso);
  if (Number.isNaN(target)) return '';
  const today = startOfLocalDay(new Date(now));
  const days = Math.round((target - today) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
};

// --- <input type="datetime-local"> bridging ---------------------------------

/**
 * An ISO timestamp as the 'YYYY-MM-DDTHH:mm' a datetime-local input expects.
 *
 * toISOString() would be wrong here: it converts to UTC, so the input would
 * display a different wall-clock time than the one the user picked.
 */
export const toDateTimeLocalValue = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * The reverse: a datetime-local value read as local wall-clock time, returned
 * as a full ISO timestamp. Null when the input is empty or unparseable.
 */
export const fromDateTimeLocalValue = (value: string): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])
  );
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** A datetime-local value for the next round hour — the form's default. */
export const defaultEventDateTimeValue = (now: Date = new Date()): string => {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toDateTimeLocalValue(d.toISOString());
};

// --- Linking back to applications -------------------------------------------

/** "Senior Engineer at Stripe", or null when the event stands alone. */
export const linkedApplicationLabel = (
  event: Pick<CalendarEvent, 'application_id'>,
  applications: Application[]
): string | null => {
  if (!event.application_id) return null;
  const app = applications.find(a => a.id === event.application_id);
  return app ? `${app.job_title} at ${app.company_name}` : null;
};

/**
 * Application statuses that mean an interview is happening, and the event type
 * to pre-select when offering "Add to Calendar" from a status change.
 *
 * 'Assessment' maps to a technical interview because that is what an assessment
 * stage is in practice — a take-home or a timed exercise with a due date.
 */
export const INTERVIEW_STAGE_EVENT_TYPE: Partial<Record<string, CalendarEventType>> = {
  Assessment: 'technical_interview',
  Interview: 'onsite'
};

/** True when moving to this status is worth offering a calendar event for. */
export const isInterviewStage = (status: string): boolean =>
  Object.prototype.hasOwnProperty.call(INTERVIEW_STAGE_EVENT_TYPE, status);
