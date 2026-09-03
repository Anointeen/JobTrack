import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeApplication, makeCalendarEvent, localDateTime, hoursFromNow } from '../../test/factories';
import type { Application, CalendarEvent } from '../../types';

/**
 * Calendar screen integration tests.
 *
 * The three contexts it reads are mocked at their boundary — the screen's job
 * is to present events and route the user's intent, not to fetch. The month
 * grid, the agenda, the view toggle and the add/edit affordances all run for
 * real.
 */

const mocks = vi.hoisted(() => ({
  events: [] as CalendarEvent[],
  applications: [] as Application[],
  loading: false,
  loaded: true,
  error: null as string | null,
  openCreateEvent: vi.fn(),
  openEditEvent: vi.fn()
}));

vi.mock('../../context/CalendarContext', () => ({
  useCalendar: () => ({
    events: mocks.events,
    loading: mocks.loading,
    loaded: mocks.loaded,
    error: mocks.error
  })
}));

vi.mock('../../context/ApplicationsContext', () => ({
  useApplications: () => ({ applications: mocks.applications })
}));

vi.mock('../../context/CalendarEventFormContext', () => ({
  useCalendarEventForm: () => ({
    openCreateEvent: mocks.openCreateEvent,
    openEditEvent: mocks.openEditEvent
  })
}));

import { CalendarView } from './CalendarView';

const setup = (events: CalendarEvent[] = [], applications: Application[] = []) => {
  mocks.events = events;
  mocks.applications = applications;
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <CalendarView />
    </MemoryRouter>
  );
  return { user };
};

const showAgenda = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('radio', { name: /agenda/i }));

beforeEach(() => {
  mocks.events = [];
  mocks.applications = [];
  mocks.loading = false;
  mocks.loaded = true;
  mocks.error = null;
  mocks.openCreateEvent.mockReset();
  mocks.openEditEvent.mockReset();
});

describe('the calendar replaces the placeholder', () => {
  it('renders the real calendar, not a coming-soon panel', () => {
    setup();
    expect(screen.getByRole('heading', { name: /interview & deadline calendar/i }))
      .toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/google calendar and outlook/i)).not.toBeInTheDocument();
  });

  it('shows a month grid of six whole weeks', () => {
    const { container } = { container: document.body };
    setup();
    expect(container.querySelectorAll('.calendar-cell')).toHaveLength(42);
  });

  it('labels every weekday column', () => {
    setup();
    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
  });
});

describe('month navigation', () => {
  const monthName = () =>
    document.querySelector('.calendar-month-label')?.textContent ?? '';

  it('opens on the current month', () => {
    setup();
    const now = new Date();
    expect(monthName()).toContain(String(now.getFullYear()));
  });

  it('steps forward and back', async () => {
    const { user } = setup();
    const start = monthName();

    await user.click(screen.getByRole('button', { name: /next month/i }));
    const next = monthName();
    expect(next).not.toBe(start);

    await user.click(screen.getByRole('button', { name: /previous month/i }));
    expect(monthName()).toBe(start);
  });

  it('returns to the current month with Today', async () => {
    const { user } = setup();
    const start = monthName();

    await user.click(screen.getByRole('button', { name: /next month/i }));
    await user.click(screen.getByRole('button', { name: /next month/i }));
    expect(monthName()).not.toBe(start);

    await user.click(screen.getByRole('button', { name: /^today$/i }));
    expect(monthName()).toBe(start);
  });
});

describe('showing events', () => {
  it('places an event in the month grid', () => {
    setup([makeCalendarEvent({ title: 'Onsite loop', event_date: localDateTime(0, 11) })]);
    expect(screen.getByText('Onsite loop')).toBeInTheDocument();
  });

  it('tells the user when a month is empty rather than showing a bare grid', () => {
    setup();
    expect(screen.getByText(/nothing scheduled in/i)).toBeInTheDocument();
  });

  it('collapses a busy day into a "+N more" control', () => {
    const day = 0;
    setup([
      makeCalendarEvent({ id: 'e1', title: 'One', event_date: localDateTime(day, 9) }),
      makeCalendarEvent({ id: 'e2', title: 'Two', event_date: localDateTime(day, 10) }),
      makeCalendarEvent({ id: 'e3', title: 'Three', event_date: localDateTime(day, 11) }),
      makeCalendarEvent({ id: 'e4', title: 'Four', event_date: localDateTime(day, 12) })
    ]);
    expect(screen.getByRole('button', { name: /\+1 more/i })).toBeInTheDocument();
  });

  it('opens the event for editing when it is selected', async () => {
    const event = makeCalendarEvent({ title: 'Phone screen', event_date: localDateTime(0, 11) });
    const { user } = setup([event]);

    await user.click(screen.getByText('Phone screen'));
    expect(mocks.openEditEvent).toHaveBeenCalledWith(event);
  });

  it('surfaces a load failure instead of an empty calendar', () => {
    mocks.error = 'Your calendar could not be loaded.';
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be loaded/i);
  });
});

describe('the agenda view', () => {
  it('is a radio group, so the two views are one setting', () => {
    setup();
    const group = screen.getByRole('radiogroup', { name: /calendar view/i });
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /month/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('switches to a list of upcoming events', async () => {
    const { user } = setup([
      makeCalendarEvent({ title: 'Take-home review', event_date: hoursFromNow(30) })
    ]);

    await showAgenda(user);
    expect(screen.getByRole('radio', { name: /agenda/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('heading', { name: /upcoming events/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take-home review' })).toBeInTheDocument();
  });

  it('lists only what is still ahead', async () => {
    const { user } = setup([
      makeCalendarEvent({ id: 'past', title: 'Last week call', event_date: hoursFromNow(-72) }),
      makeCalendarEvent({ id: 'future', title: 'Next week loop', event_date: hoursFromNow(72) })
    ]);

    await showAgenda(user);
    expect(screen.getByRole('button', { name: 'Next week loop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Last week call' })).not.toBeInTheDocument();
  });

  it('orders the list soonest first', async () => {
    const { user } = setup([
      makeCalendarEvent({ id: 'b', title: 'Later event', event_date: hoursFromNow(72) }),
      makeCalendarEvent({ id: 'a', title: 'Sooner event', event_date: hoursFromNow(5) })
    ]);

    await showAgenda(user);
    const titles = screen.getAllByRole('button')
      .map(b => b.textContent)
      .filter(t => t === 'Sooner event' || t === 'Later event');
    expect(titles).toEqual(['Sooner event', 'Later event']);
  });

  it('names the type and links to the application an event belongs to', async () => {
    const { user } = setup(
      [makeCalendarEvent({
        title: 'Onsite loop',
        event_type: 'onsite',
        application_id: 'app-1',
        event_date: hoursFromNow(48)
      })],
      [makeApplication({ id: 'app-1', job_title: 'Staff Engineer', company_name: 'Globex' })]
    );

    await showAgenda(user);
    expect(screen.getByText('Onsite')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /staff engineer at globex/i }))
      .toHaveAttribute('href', '/applications/app-1');
  });

  it('shows no application link for a standalone event', async () => {
    const { user } = setup([
      makeCalendarEvent({ title: 'Coffee chat', application_id: null, event_date: hoursFromNow(24) })
    ]);

    await showAgenda(user);
    expect(screen.queryByRole('link', { name: /at / })).not.toBeInTheDocument();
  });

  it('has a real empty state', async () => {
    const { user } = setup();
    await showAgenda(user);
    expect(screen.getByText(/no upcoming events/i)).toBeInTheDocument();
  });

  it('does not nest a link inside a button', async () => {
    const { user } = setup(
      [makeCalendarEvent({ application_id: 'app-1', event_date: hoursFromNow(24) })],
      [makeApplication({ id: 'app-1' })]
    );
    await showAgenda(user);

    // Interactive content inside a button is invalid and unreachable for
    // keyboard and screen-reader users.
    expect(document.querySelector('button a')).toBeNull();
  });
});

describe('adding an event', () => {
  it('offers an Add Event control', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add event/i }));
    expect(mocks.openCreateEvent).toHaveBeenCalledTimes(1);
  });

  it('pre-fills the date when adding from a specific day', async () => {
    const { user } = setup();
    const addButtons = screen.getAllByRole('button', { name: /add an event on/i });
    expect(addButtons.length).toBe(42);

    await user.click(addButtons[0]);
    expect(mocks.openCreateEvent).toHaveBeenCalledTimes(1);

    const prefill = mocks.openCreateEvent.mock.calls[0][0];
    expect(prefill.event_date).toBeTruthy();
    // 9am local on the day that was clicked, not UTC midnight.
    expect(new Date(prefill.event_date).getHours()).toBe(9);
  });

  it('gives every per-day add control a distinct accessible name', () => {
    setup();
    const names = screen.getAllByRole('button', { name: /add an event on/i })
      .map(b => b.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(names.length);
  });
});
