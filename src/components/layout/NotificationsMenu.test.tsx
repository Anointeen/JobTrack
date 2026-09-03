import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeApplication, makeUser, localDate } from '../../test/factories';
import type { Application, CalendarEvent } from '../../types';

/**
 * The notifications control was unreachable in practice: `display: none` below
 * 480px removed it from phones entirely, its panel held only placeholder copy,
 * and its unread dot was shown unconditionally. These tests pin down the parts
 * that can be asserted in jsdom — name, keyboard reachability, open and close
 * behaviour, empty state and the badge. The width-dependent part is CSS and is
 * verified in a real browser.
 */

const mocks = vi.hoisted(() => ({
  applications: [] as Application[],
  events: [] as CalendarEvent[],
  getNotificationPreferences: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'a@b.test' } })
}));

vi.mock('../../context/ApplicationsContext', () => ({
  useApplications: () => ({ applications: mocks.applications })
}));

vi.mock('../../context/CalendarContext', () => ({
  useCalendar: () => ({ events: mocks.events })
}));

vi.mock('../../lib/dataService', () => ({
  dataService: { getNotificationPreferences: mocks.getNotificationPreferences }
}));

import { NotificationsMenu } from './NotificationsMenu';

const setup = (applications: Application[] = []) => {
  mocks.applications = applications;
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <NotificationsMenu />
    </MemoryRouter>
  );
  return { user };
};

/** The toggle, found the way a screen-reader user would find it. */
const toggle = () => screen.getByRole('button', { name: /notifications/i });

beforeEach(() => {
  mocks.applications = [];
  mocks.events = [];
  mocks.getNotificationPreferences.mockReset().mockResolvedValue({
    id: 'n1',
    user_id: 'user-1',
    deadline_reminders: true,
    interview_reminders: true,
    follow_up_reminders: true
  });
  // Referenced so the factory import is meaningful in every file that uses it.
  makeUser();
});

describe('accessibility of the control itself', () => {
  it('is a real button with an accessible name', () => {
    setup();
    const button = toggle();
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAccessibleName(/notifications/i);
  });

  it('is reachable and operable from the keyboard', async () => {
    const { user } = setup();

    await user.tab();
    expect(toggle()).toHaveFocus();

    // Enter and Space both activate a native button.
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: /notifications/i })).toBeInTheDocument();
  });

  it('reports its expanded state and names the panel it controls', async () => {
    const { user } = setup();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).toHaveAttribute('aria-controls', 'notifications-panel');

    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('notifications-panel')).toBeInTheDocument();
  });

  it('does not rely on a title attribute alone to be identifiable', () => {
    setup();
    // An accessible name from aria-label, not a tooltip that never reaches a
    // screen reader or a touch user.
    expect(toggle()).toHaveAttribute('aria-label');
  });
});

describe('opening and closing', () => {
  it('opens the panel on click', async () => {
    const { user } = setup();
    expect(document.getElementById('notifications-panel')).not.toBeInTheDocument();

    await user.click(toggle());
    expect(document.getElementById('notifications-panel')).toBeInTheDocument();
  });

  it('moves focus into the panel so a keyboard user is not left behind', async () => {
    const { user } = setup();
    await user.click(toggle());
    await waitFor(() => expect(document.getElementById('notifications-panel')).toHaveFocus());
  });

  it('closes on Escape and returns focus to the button', async () => {
    const { user } = setup();
    await user.click(toggle());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.getElementById('notifications-panel')).not.toBeInTheDocument());
    expect(toggle()).toHaveFocus();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when the user clicks outside it', async () => {
    const { user } = setup();
    await user.click(toggle());
    expect(document.getElementById('notifications-panel')).toBeInTheDocument();

    await user.click(document.body);
    await waitFor(() => expect(document.getElementById('notifications-panel')).not.toBeInTheDocument());
  });

  it('closes when the toggle is pressed again', async () => {
    const { user } = setup();
    await user.click(toggle());
    await user.click(toggle());
    expect(document.getElementById('notifications-panel')).not.toBeInTheDocument();
  });
});

describe('panel contents', () => {
  it('shows a real empty state when nothing needs attention', async () => {
    const { user } = setup([makeApplication({ deadline: undefined, follow_up_date: null })]);
    await user.click(toggle());

    expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('describes both reminder mechanisms, not just the application one', async () => {
    // The panel is fed by two different rules — the +/-7-day window for
    // application dates, and each calendar event's own
    // reminder_minutes_before. The copy previously named only the first,
    // which read as though events also fired a week out.
    const { user } = setup([makeApplication({ deadline: undefined, follow_up_date: null })]);
    await user.click(toggle());

    const body = screen.getByText(/appear here/i);
    expect(body).toHaveTextContent(/deadlines and follow-ups/i);
    expect(body).toHaveTextContent(/week/i);
    expect(body).toHaveTextContent(/calendar events/i);
    expect(body).toHaveTextContent(/reminder time/i);
    // The old wording lumped events in with the weekly window.
    expect(body).not.toHaveTextContent(/before and after they are due/i);
  });

  it('explains the empty state differently when every reminder is switched off', async () => {
    mocks.getNotificationPreferences.mockResolvedValue({
      id: 'n1', user_id: 'user-1',
      deadline_reminders: false, interview_reminders: false, follow_up_reminders: false
    });
    const { user } = setup([makeApplication({ deadline: localDate(1) })]);

    await waitFor(() => expect(mocks.getNotificationPreferences).toHaveBeenCalled());
    await user.click(toggle());
    expect(screen.getByText(/all reminders are switched off/i)).toBeInTheDocument();
  });

  it('lists a reminder for each upcoming date, linking to the application', async () => {
    const { user } = setup([
      makeApplication({
        id: 'app-77', company_name: 'Stripe', job_title: 'Engineer',
        deadline: localDate(1), follow_up_date: null
      })
    ]);

    await waitFor(() => expect(mocks.getNotificationPreferences).toHaveBeenCalled());
    await user.click(toggle());

    const list = screen.getByRole('list');
    const links = within(list).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/applications/app-77');
    expect(links[0]).toHaveTextContent(/deadline tomorrow/i);
    expect(links[0]).toHaveTextContent(/Engineer at Stripe/i);
  });

  it('offers a route to the preferences that control it', async () => {
    const { user } = setup();
    await user.click(toggle());
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });

  it('closes the panel after following a notification', async () => {
    const { user } = setup([makeApplication({ id: 'app-5', deadline: localDate(0) })]);
    await waitFor(() => expect(mocks.getNotificationPreferences).toHaveBeenCalled());
    await user.click(toggle());

    await user.click(within(screen.getByRole('list')).getAllByRole('link')[0]);
    await waitFor(() => expect(document.getElementById('notifications-panel')).not.toBeInTheDocument());
  });
});

describe('the unread indicator', () => {
  it('is absent when nothing needs attention', async () => {
    setup([makeApplication({ deadline: undefined, follow_up_date: null })]);
    await waitFor(() => expect(mocks.getNotificationPreferences).toHaveBeenCalled());

    // The old bell showed its dot unconditionally, so it always claimed there
    // was something new.
    expect(toggle().querySelector('.notifications-badge')).toBeNull();
    expect(toggle()).toHaveAccessibleName(/nothing needs attention/i);
  });

  it('appears, and is counted in the button name, when something does', async () => {
    setup([
      makeApplication({ id: 'a', deadline: localDate(0), follow_up_date: null }),
      makeApplication({ id: 'b', deadline: localDate(2), follow_up_date: null })
    ]);

    await waitFor(() => expect(toggle()).toHaveAccessibleName(/2 reminders needing attention/i));
    expect(toggle().querySelector('.notifications-badge')).toHaveTextContent('2');
  });

  it('keeps the badge out of the accessible name, which already carries the count', async () => {
    setup([makeApplication({ id: 'a', deadline: localDate(0), follow_up_date: null })]);
    await waitFor(() => expect(toggle()).toHaveAccessibleName(/1 reminder needing attention/i));

    const badge = toggle().querySelector('.notifications-badge');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
  });

  it('caps the badge so a long list cannot stretch the header', async () => {
    setup(Array.from({ length: 12 }, (_, i) =>
      makeApplication({ id: `app-${i}`, deadline: localDate(1), follow_up_date: null })
    ));

    await waitFor(() =>
      expect(toggle().querySelector('.notifications-badge')).toHaveTextContent('9+'));
  });
});

describe('falling back safely', () => {
  it('still shows reminders when the preferences cannot be loaded', async () => {
    mocks.getNotificationPreferences.mockRejectedValue(new Error('offline'));
    const { user } = setup([makeApplication({ id: 'app-1', deadline: localDate(1) })]);

    await waitFor(() => expect(mocks.getNotificationPreferences).toHaveBeenCalled());
    await user.click(toggle());
    expect(within(screen.getByRole('list')).getAllByRole('link')).toHaveLength(1);
  });
});
