import { describe, it, expect } from 'vitest';
import { buildNotifications, allRemindersDisabled, NOTIFICATION_WINDOW_DAYS } from './notifications';
import { makeApplication, localDate } from '../test/factories';

/**
 * Notifications are derived from applications the user already has, gated by
 * the switches in the existing notification_preferences row. No table, no poll.
 */

const ALL_ON = {
  deadline_reminders: true,
  interview_reminders: true,
  follow_up_reminders: true
};

const ALL_OFF = {
  deadline_reminders: false,
  interview_reminders: false,
  follow_up_reminders: false
};

describe('buildNotifications', () => {
  it('returns nothing when there are no applications', () => {
    expect(buildNotifications([], ALL_ON)).toEqual([]);
  });

  it('returns nothing when no application carries a date', () => {
    const apps = [makeApplication({ deadline: undefined, follow_up_date: null })];
    expect(buildNotifications(apps, ALL_ON)).toEqual([]);
  });

  it('raises a deadline reminder for a deadline inside the window', () => {
    const apps = [makeApplication({
      company_name: 'Stripe', job_title: 'Engineer', deadline: localDate(2)
    })];
    const [item] = buildNotifications(apps, ALL_ON);

    expect(item.kind).toBe('deadline');
    expect(item.urgency).toBe('soon');
    expect(item.title).toMatch(/deadline in 2 days/i);
    expect(item.detail).toBe('Engineer at Stripe');
  });

  it('classifies today and overdue distinctly', () => {
    const today = buildNotifications([makeApplication({ deadline: localDate(0) })], ALL_ON);
    expect(today[0].urgency).toBe('today');
    expect(today[0].title).toMatch(/today/i);

    const late = buildNotifications([makeApplication({ deadline: localDate(-2) })], ALL_ON);
    expect(late[0].urgency).toBe('overdue');
    expect(late[0].title).toMatch(/2 days ago/i);
  });

  it('ignores dates outside the window in both directions', () => {
    const far = NOTIFICATION_WINDOW_DAYS + 1;
    expect(buildNotifications([makeApplication({ deadline: localDate(far) })], ALL_ON)).toEqual([]);
    expect(buildNotifications([makeApplication({ deadline: localDate(-far) })], ALL_ON)).toEqual([]);
  });

  it('raises a follow-up reminder, preferring the user\'s own note as the detail', () => {
    const apps = [makeApplication({
      deadline: undefined,
      follow_up_date: localDate(1),
      follow_up_note: 'Email Sarah'
    })];
    const [item] = buildNotifications(apps, ALL_ON);

    expect(item.kind).toBe('follow_up');
    expect(item.title).toMatch(/follow up tomorrow/i);
    expect(item.detail).toBe('Email Sarah');
  });

  it('treats the deadline of an interview-stage application as an interview reminder', () => {
    const apps = [makeApplication({ status: 'Interview', deadline: localDate(1) })];
    const [item] = buildNotifications(apps, ALL_ON);

    expect(item.kind).toBe('interview');
    // ...and only once: it must not also count as a plain deadline.
    expect(buildNotifications(apps, ALL_ON)).toHaveLength(1);
  });

  it('ignores closed applications', () => {
    for (const status of ['Rejected', 'Withdrawn'] as const) {
      const apps = [makeApplication({ status, deadline: localDate(1), follow_up_date: localDate(1) })];
      expect(buildNotifications(apps, ALL_ON)).toEqual([]);
    }
  });

  it('respects each preference switch independently', () => {
    const apps = [
      makeApplication({ id: 'a', deadline: localDate(1), follow_up_date: null }),
      makeApplication({ id: 'b', status: 'Interview', deadline: localDate(1), follow_up_date: null }),
      makeApplication({ id: 'c', deadline: undefined, follow_up_date: localDate(1) })
    ];

    expect(buildNotifications(apps, ALL_ON)).toHaveLength(3);
    expect(buildNotifications(apps, { ...ALL_ON, deadline_reminders: false })
      .map(n => n.kind)).toEqual(expect.not.arrayContaining(['deadline']));
    expect(buildNotifications(apps, { ...ALL_ON, interview_reminders: false })
      .map(n => n.kind)).toEqual(expect.not.arrayContaining(['interview']));
    expect(buildNotifications(apps, { ...ALL_ON, follow_up_reminders: false })
      .map(n => n.kind)).toEqual(expect.not.arrayContaining(['follow_up']));
    expect(buildNotifications(apps, ALL_OFF)).toEqual([]);
  });

  it('puts the most pressing item first', () => {
    const apps = [
      makeApplication({ id: 'soon', company_name: 'C', deadline: localDate(5), follow_up_date: null }),
      makeApplication({ id: 'late', company_name: 'A', deadline: localDate(-1), follow_up_date: null }),
      makeApplication({ id: 'now', company_name: 'B', deadline: localDate(0), follow_up_date: null })
    ];

    expect(buildNotifications(apps, ALL_ON).map(n => n.urgency))
      .toEqual(['overdue', 'today', 'soon']);
  });

  it('gives one application both a deadline and a follow-up reminder', () => {
    const apps = [makeApplication({ deadline: localDate(3), follow_up_date: localDate(1) })];
    expect(buildNotifications(apps, ALL_ON).map(n => n.kind).sort())
      .toEqual(['deadline', 'follow_up']);
  });

  it('produces ids that are stable and unique per application and kind', () => {
    const apps = [makeApplication({ id: 'app-9', deadline: localDate(1), follow_up_date: localDate(1) })];
    const ids = buildNotifications(apps, ALL_ON).map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(buildNotifications(apps, ALL_ON).map(n => n.id)).toEqual(ids);
  });
});

describe('allRemindersDisabled', () => {
  it('is true only when every switch is off', () => {
    expect(allRemindersDisabled(ALL_OFF)).toBe(true);
    expect(allRemindersDisabled(ALL_ON)).toBe(false);
    expect(allRemindersDisabled({ ...ALL_OFF, deadline_reminders: true })).toBe(false);
  });
});
