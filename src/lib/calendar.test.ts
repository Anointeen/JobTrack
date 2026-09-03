import { describe, it, expect } from 'vitest';
import {
  addMonths,
  buildMonthGrid,
  defaultEventDateTimeValue,
  eventsWithinDays,
  fromDateTimeLocalValue,
  groupEventsByDay,
  isInterviewStage,
  INTERVIEW_STAGE_EVENT_TYPE,
  linkedApplicationLabel,
  localDayKey,
  monthLabel,
  relativeDayLabel,
  toDateTimeLocalValue,
  upcomingEvents
} from './calendar';
import { makeApplication, makeCalendarEvent, localDateTime, hoursFromNow } from '../test/factories';

/**
 * Calendar logic is pure and date-heavy, so it is tested here rather than
 * through the screen. Every case is built from local calendar parts: a
 * date-only string passed to `new Date()` is UTC midnight, which lands on the
 * previous day west of Greenwich, and that class of bug has bitten this
 * codebase before.
 */

describe('localDayKey', () => {
  it('keys a timestamp by its local day, not its UTC day', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const [y, m, d] = [noon.getFullYear(), noon.getMonth() + 1, noon.getDate()];
    const expected = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    expect(localDayKey(noon.toISOString())).toBe(expected);
  });

  it('returns an empty string for an unparseable value', () => {
    expect(localDayKey('not-a-date')).toBe('');
  });
});

describe('addMonths', () => {
  it('steps forward and back within a year', () => {
    expect(addMonths({ year: 2026, month: 5 }, 1)).toEqual({ year: 2026, month: 6 });
    expect(addMonths({ year: 2026, month: 5 }, -1)).toEqual({ year: 2026, month: 4 });
  });

  it('rolls the year over in both directions', () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('handles multi-month steps', () => {
    expect(addMonths({ year: 2026, month: 0 }, 14)).toEqual({ year: 2027, month: 2 });
  });
});

describe('monthLabel', () => {
  it('names the month and year', () => {
    expect(monthLabel({ year: 2026, month: 8 })).toBe('September 2026');
  });
});

describe('buildMonthGrid', () => {
  it('always returns six whole weeks', () => {
    for (const month of [0, 1, 5, 11]) {
      expect(buildMonthGrid({ year: 2026, month })).toHaveLength(42);
    }
  });

  it('starts on a Sunday and runs consecutively', () => {
    const grid = buildMonthGrid({ year: 2026, month: 8 });
    const [y, m, d] = grid[0].key.split('-').map(Number);
    expect(new Date(y, m - 1, d).getDay()).toBe(0);

    for (let i = 1; i < grid.length; i++) {
      const prev = grid[i - 1].key.split('-').map(Number);
      const curr = grid[i].key.split('-').map(Number);
      const diff =
        new Date(curr[0], curr[1] - 1, curr[2]).getTime() -
        new Date(prev[0], prev[1] - 1, prev[2]).getTime();
      expect(diff).toBe(86_400_000);
    }
  });

  it('marks days from the neighbouring months as outside', () => {
    // September 2026 starts on a Tuesday, so two August days lead the grid.
    const grid = buildMonthGrid({ year: 2026, month: 8 });
    const inMonth = grid.filter(c => c.inMonth);
    expect(inMonth).toHaveLength(30);
    expect(inMonth[0].day).toBe(1);
    expect(inMonth[inMonth.length - 1].day).toBe(30);
    expect(grid[0].inMonth).toBe(false);
  });

  it('flags today exactly once, in the current month', () => {
    const now = new Date();
    const grid = buildMonthGrid({ year: now.getFullYear(), month: now.getMonth() });
    expect(grid.filter(c => c.isToday)).toHaveLength(1);
    expect(grid.find(c => c.isToday)?.day).toBe(now.getDate());
  });

  it('flags no day as today in a month that is not the current one', () => {
    const grid = buildMonthGrid(addMonths({ year: new Date().getFullYear(), month: new Date().getMonth() }, 6));
    expect(grid.some(c => c.isToday && c.inMonth)).toBe(false);
  });
});

describe('groupEventsByDay', () => {
  it('buckets events under their local day', () => {
    const events = [
      makeCalendarEvent({ id: 'a', event_date: localDateTime(1, 9) }),
      makeCalendarEvent({ id: 'b', event_date: localDateTime(1, 15) }),
      makeCalendarEvent({ id: 'c', event_date: localDateTime(2, 9) })
    ];
    const byDay = groupEventsByDay(events);

    expect(byDay.get(localDayKey(events[0].event_date))).toHaveLength(2);
    expect(byDay.get(localDayKey(events[2].event_date))).toHaveLength(1);
  });

  it('sorts each day by time', () => {
    const late = makeCalendarEvent({ id: 'late', event_date: localDateTime(1, 16) });
    const early = makeCalendarEvent({ id: 'early', event_date: localDateTime(1, 8) });
    const byDay = groupEventsByDay([late, early]);

    expect(byDay.get(localDayKey(late.event_date))?.map(e => e.id)).toEqual(['early', 'late']);
  });

  it('drops events with an unreadable date rather than bucketing them under ""', () => {
    const byDay = groupEventsByDay([makeCalendarEvent({ event_date: 'nonsense' })]);
    expect(byDay.size).toBe(0);
  });
});

describe('upcomingEvents', () => {
  it('excludes events that have already happened', () => {
    const past = makeCalendarEvent({ id: 'past', event_date: hoursFromNow(-2) });
    const future = makeCalendarEvent({ id: 'future', event_date: hoursFromNow(2) });
    expect(upcomingEvents([past, future]).map(e => e.id)).toEqual(['future']);
  });

  it('orders soonest first', () => {
    const events = [
      makeCalendarEvent({ id: 'later', event_date: hoursFromNow(48) }),
      makeCalendarEvent({ id: 'sooner', event_date: hoursFromNow(4) })
    ];
    expect(upcomingEvents(events).map(e => e.id)).toEqual(['sooner', 'later']);
  });

  it('applies the limit after sorting, so the nearest events survive it', () => {
    const events = [
      makeCalendarEvent({ id: 'c', event_date: hoursFromNow(72) }),
      makeCalendarEvent({ id: 'a', event_date: hoursFromNow(1) }),
      makeCalendarEvent({ id: 'b', event_date: hoursFromNow(24) })
    ];
    expect(upcomingEvents(events, 2).map(e => e.id)).toEqual(['a', 'b']);
  });
});

describe('eventsWithinDays', () => {
  it('includes an event later on the final day of the window', () => {
    // The boundary that a naive now + N*24h comparison silently drops.
    const event = makeCalendarEvent({ event_date: localDateTime(7, 23, 30) });
    expect(eventsWithinDays([event], 7)).toHaveLength(1);
  });

  it('excludes an event beyond the window', () => {
    expect(eventsWithinDays([makeCalendarEvent({ event_date: localDateTime(9, 12) })], 7))
      .toHaveLength(0);
  });

  it('excludes past events', () => {
    expect(eventsWithinDays([makeCalendarEvent({ event_date: hoursFromNow(-1) })], 7))
      .toHaveLength(0);
  });
});

describe('relativeDayLabel', () => {
  it('names the nearby days in words', () => {
    expect(relativeDayLabel(localDateTime(0, 12))).toBe('Today');
    expect(relativeDayLabel(localDateTime(1, 12))).toBe('Tomorrow');
    expect(relativeDayLabel(localDateTime(-1, 12))).toBe('Yesterday');
  });

  it('counts further days in both directions', () => {
    expect(relativeDayLabel(localDateTime(4, 12))).toBe('In 4 days');
    expect(relativeDayLabel(localDateTime(-3, 12))).toBe('3 days ago');
  });

  it('says "Today" for an event later today, not "In 0 days"', () => {
    expect(relativeDayLabel(localDateTime(0, 23))).toBe('Today');
  });
});

describe('datetime-local bridging', () => {
  it('round-trips a local wall-clock time without shifting it to UTC', () => {
    const iso = localDateTime(3, 14, 30);
    const inputValue = toDateTimeLocalValue(iso);

    expect(inputValue).toMatch(/^\d{4}-\d{2}-\d{2}T14:30$/);
    expect(fromDateTimeLocalValue(inputValue)).toBe(
      new Date(new Date(iso).setSeconds(0, 0)).toISOString()
    );
  });

  it('reads the input as local time, not as UTC', () => {
    const parsed = fromDateTimeLocalValue('2026-09-03T09:00');
    expect(parsed).not.toBeNull();
    const d = new Date(parsed as string);
    expect(d.getHours()).toBe(9);
    expect(d.getDate()).toBe(3);
  });

  it('rejects an empty or malformed value', () => {
    expect(fromDateTimeLocalValue('')).toBeNull();
    expect(fromDateTimeLocalValue('tomorrow at nine')).toBeNull();
    expect(fromDateTimeLocalValue('2026-09-03')).toBeNull();
  });

  it('returns an empty string for an unparseable timestamp', () => {
    expect(toDateTimeLocalValue('nonsense')).toBe('');
  });

  it('defaults a new event to the next round hour', () => {
    const value = defaultEventDateTimeValue(new Date(2026, 8, 3, 14, 37));
    expect(value).toBe('2026-09-03T15:00');
  });

  it('rolls the default into the next day just before midnight', () => {
    expect(defaultEventDateTimeValue(new Date(2026, 8, 3, 23, 10))).toBe('2026-09-04T00:00');
  });
});

describe('linkedApplicationLabel', () => {
  const apps = [makeApplication({ id: 'app-1', job_title: 'Staff Engineer', company_name: 'Globex' })];

  it('names the linked application', () => {
    expect(linkedApplicationLabel({ application_id: 'app-1' }, apps))
      .toBe('Staff Engineer at Globex');
  });

  it('returns null for a standalone event', () => {
    expect(linkedApplicationLabel({ application_id: null }, apps)).toBeNull();
  });

  it('returns null when the application is not in the loaded list', () => {
    expect(linkedApplicationLabel({ application_id: 'gone' }, apps)).toBeNull();
  });
});

describe('interview stages', () => {
  it('recognises the statuses worth scheduling', () => {
    expect(isInterviewStage('Interview')).toBe(true);
    expect(isInterviewStage('Assessment')).toBe(true);
  });

  it('does not offer to schedule terminal or pre-application statuses', () => {
    for (const status of ['Saved', 'Applied', 'Offer', 'Rejected', 'Withdrawn']) {
      expect(isInterviewStage(status)).toBe(false);
    }
  });

  it('maps each stage to a sensible default event type', () => {
    expect(INTERVIEW_STAGE_EVENT_TYPE.Interview).toBe('onsite');
    expect(INTERVIEW_STAGE_EVENT_TYPE.Assessment).toBe('technical_interview');
  });
});
