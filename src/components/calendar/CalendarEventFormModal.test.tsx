import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarEventFormModal } from './CalendarEventFormModal';
import { makeApplication, makeCalendarEvent, localDateTime } from '../../test/factories';
import type { CalendarEventInput } from '../../types';

/**
 * Event form integration tests.
 *
 * Rendered with real props; `onSave` stands in for the data layer, which is the
 * natural boundary — everything up to and including validation runs for real,
 * and the assertion is on the payload the data layer would receive.
 */

const APPS = [
  makeApplication({ id: 'app-1', job_title: 'Staff Engineer', company_name: 'Globex' }),
  makeApplication({ id: 'app-2', job_title: 'Frontend Lead', company_name: 'Initech' })
];

const setup = (props: Partial<React.ComponentProps<typeof CalendarEventFormModal>> = {}) => {
  const onSave = vi.fn<(data: CalendarEventInput) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const onDelete = vi.fn<(e: any) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();

  render(
    <CalendarEventFormModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      applications={APPS}
      initialData={null}
      {...props}
    />
  );

  return { onSave, onClose, onDelete, user };
};

/** The <form>, for submits that deliberately skip native validation. */
const submitTarget = (): HTMLFormElement =>
  screen.getByRole('button', { name: /save event|update event/i })
    .closest('form') as HTMLFormElement;

const savedPayload = async (onSave: ReturnType<typeof setup>['onSave']) => {
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  return onSave.mock.calls[0][0];
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('opening the form', () => {
  it('offers every event type', () => {
    setup();
    const options = Array.from(
      (screen.getByLabelText(/event type/i) as HTMLSelectElement).options
    ).map(o => o.value);

    expect(options).toEqual([
      'phone_screen', 'technical_interview', 'onsite',
      'application_deadline', 'follow_up', 'offer_deadline', 'other'
    ]);
  });

  it('defaults the date to a round hour rather than leaving it blank', () => {
    setup();
    const value = (screen.getByLabelText(/date & time/i) as HTMLInputElement).value;
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/);
  });

  it('starts unlinked, and lists the user\'s applications', () => {
    setup();
    const select = screen.getByLabelText(/linked application/i) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByRole('option', { name: /staff engineer at globex/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /frontend lead at initech/i })).toBeInTheDocument();
  });

  it('says so when there are no applications to link to', () => {
    setup({ applications: [] });
    expect(screen.getByText(/no applications yet/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/linked application/i)).not.toBeInTheDocument();
  });

  it('enables the reminder by default, at the database default lead time', () => {
    setup();
    expect(screen.getByLabelText(/remind me before this event/i)).toBeChecked();
    expect(screen.getByLabelText(/^remind me$/i)).toHaveValue('60');
  });
});

describe('validation', () => {
  it('does not save without a title', async () => {
    const { onSave } = setup();
    fireEvent.submit(submitTarget());

    expect(await screen.findByText(/give the event a title/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not save without a date', async () => {
    const { onSave, user } = setup();
    await user.type(screen.getByLabelText(/^title/i), 'Phone screen');
    fireEvent.change(screen.getByLabelText(/date & time/i), { target: { value: '' } });
    fireEvent.submit(submitTarget());

    expect(await screen.findByText(/choose a date and time/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a title that is only whitespace, mirroring the database check', async () => {
    const { onSave, user } = setup();
    await user.type(screen.getByLabelText(/^title/i), '   ');
    fireEvent.submit(submitTarget());

    expect(await screen.findByText(/give the event a title/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('creating an event', () => {
  it('saves the title, type, time and reminder', async () => {
    const { onSave, user } = setup();

    await user.type(screen.getByLabelText(/^title/i), 'Technical interview');
    await user.selectOptions(screen.getByLabelText(/event type/i), 'technical_interview');
    fireEvent.change(screen.getByLabelText(/date & time/i), { target: { value: '2026-11-04T14:30' } });
    await user.selectOptions(screen.getByLabelText(/^remind me$/i), '1440');
    await user.click(screen.getByRole('button', { name: /save event/i }));

    const payload = await savedPayload(onSave);
    expect(payload.title).toBe('Technical interview');
    expect(payload.event_type).toBe('technical_interview');
    expect(payload.reminder_minutes_before).toBe(1440);

    // Stored as a real instant, read back as the wall-clock time entered.
    const saved = new Date(payload.event_date);
    expect(saved.getHours()).toBe(14);
    expect(saved.getMinutes()).toBe(30);
    expect(saved.getDate()).toBe(4);
  });

  it('links the chosen application', async () => {
    const { onSave, user } = setup();

    await user.type(screen.getByLabelText(/^title/i), 'Onsite loop');
    await user.selectOptions(screen.getByLabelText(/linked application/i), 'app-2');
    await user.click(screen.getByRole('button', { name: /save event/i }));

    expect((await savedPayload(onSave)).application_id).toBe('app-2');
  });

  it('sends null rather than an empty string for an unlinked event', async () => {
    // undefined keys are dropped before reaching PostgREST, and '' is not a
    // UUID — null is the only value that actually means "not linked".
    const { onSave, user } = setup();
    await user.type(screen.getByLabelText(/^title/i), 'Coffee chat');
    await user.click(screen.getByRole('button', { name: /save event/i }));

    const payload = await savedPayload(onSave);
    expect(payload.application_id).toBeNull();
    expect(payload.notes).toBeNull();
  });

  it('sends null when the reminder is switched off', async () => {
    const { onSave, user } = setup();
    await user.type(screen.getByLabelText(/^title/i), 'Optional catch-up');
    await user.click(screen.getByLabelText(/remind me before this event/i));

    expect(screen.queryByLabelText(/^remind me$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save event/i }));

    expect((await savedPayload(onSave)).reminder_minutes_before).toBeNull();
  });

  it('trims the title and notes before saving', async () => {
    const { onSave, user } = setup();
    await user.type(screen.getByLabelText(/^title/i), '  Phone screen  ');
    await user.type(screen.getByLabelText(/notes/i), '  Ask about on-call  ');
    await user.click(screen.getByRole('button', { name: /save event/i }));

    const payload = await savedPayload(onSave);
    expect(payload.title).toBe('Phone screen');
    expect(payload.notes).toBe('Ask about on-call');
  });

  it('closes on a successful save', async () => {
    const { onClose, user } = setup();
    await user.type(screen.getByLabelText(/^title/i), 'Phone screen');
    await user.click(screen.getByRole('button', { name: /save event/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('keeps the form open and reports a failed save', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Network request failed'));
    const { onClose, user } = setup({ onSave });

    await user.type(screen.getByLabelText(/^title/i), 'Phone screen');
    await user.click(screen.getByRole('button', { name: /save event/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/network request failed/i);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /save event/i })).toBeEnabled();
  });
});

describe('filtering the application picker', () => {
  it('narrows the options to matching applications', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/search applications/i), 'initech');

    expect(screen.queryByRole('option', { name: /staff engineer at globex/i })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /frontend lead at initech/i })).toBeInTheDocument();
  });

  it('says so when the filter matches nothing', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/search applications/i), 'zzzz');
    expect(screen.getByText(/no applications match/i)).toBeInTheDocument();
  });

  it('never filters away the application already linked', async () => {
    // Otherwise typing in the filter would silently blank an existing link.
    const { user } = setup({
      initialData: makeCalendarEvent({ application_id: 'app-1' })
    });

    await user.type(screen.getByLabelText(/search applications/i), 'initech');
    expect(screen.getByRole('option', { name: /staff engineer at globex/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/linked application/i) as HTMLSelectElement).value).toBe('app-1');
  });
});

describe('editing an existing event', () => {
  const existing = makeCalendarEvent({
    id: 'evt-1',
    title: 'Onsite loop',
    event_type: 'onsite',
    event_date: localDateTime(3, 10, 15),
    application_id: 'app-1',
    notes: 'Four rounds',
    reminder_minutes_before: 1440
  });

  it('populates every field from the record', () => {
    setup({ initialData: existing });

    expect(screen.getByLabelText(/^title/i)).toHaveValue('Onsite loop');
    expect(screen.getByLabelText(/event type/i)).toHaveValue('onsite');
    // Local wall-clock time, not the UTC instant the row stores.
    expect((screen.getByLabelText(/date & time/i) as HTMLInputElement).value).toMatch(/T10:15$/);
    expect(screen.getByLabelText(/linked application/i)).toHaveValue('app-1');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Four rounds');
    expect(screen.getByLabelText(/^remind me$/i)).toHaveValue('1440');
  });

  it('shows an event whose reminder is off as unchecked', () => {
    setup({ initialData: makeCalendarEvent({ reminder_minutes_before: null }) });
    expect(screen.getByLabelText(/remind me before this event/i)).not.toBeChecked();
  });

  it('treats a zero lead time as an enabled reminder, not as off', () => {
    setup({ initialData: makeCalendarEvent({ reminder_minutes_before: 0 }) });
    expect(screen.getByLabelText(/remind me before this event/i)).toBeChecked();
  });

  it('preserves unchanged fields when only one is edited', async () => {
    const { onSave, user } = setup({ initialData: existing });

    await user.clear(screen.getByLabelText(/^title/i));
    await user.type(screen.getByLabelText(/^title/i), 'Onsite loop (rescheduled)');
    await user.click(screen.getByRole('button', { name: /update event/i }));

    const payload = await savedPayload(onSave);
    expect(payload.title).toBe('Onsite loop (rescheduled)');
    expect(payload.event_type).toBe('onsite');
    expect(payload.application_id).toBe('app-1');
    expect(payload.notes).toBe('Four rounds');
    expect(payload.reminder_minutes_before).toBe(1440);
  });

  it('can unlink the application', async () => {
    const { onSave, user } = setup({ initialData: existing });
    await user.selectOptions(screen.getByLabelText(/linked application/i), '');
    await user.click(screen.getByRole('button', { name: /update event/i }));

    expect((await savedPayload(onSave)).application_id).toBeNull();
  });
});

describe('deleting an event', () => {
  it('is not offered while creating', () => {
    setup();
    expect(screen.queryByRole('button', { name: /delete event/i })).not.toBeInTheDocument();
  });

  it('asks for confirmation first', async () => {
    const { onDelete, user } = setup({ initialData: makeCalendarEvent() });

    await user.click(screen.getByRole('button', { name: /delete event/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(/delete this event\?/i)).toBeInTheDocument();
  });

  it('deletes once confirmed', async () => {
    const event = makeCalendarEvent({ id: 'evt-9' });
    const { onDelete, onClose, user } = setup({ initialData: event });

    await user.click(screen.getByRole('button', { name: /delete event/i }));
    await user.click(screen.getByRole('button', { name: /yes, delete/i }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(event));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('lets the user back out', async () => {
    const { onDelete, user } = setup({ initialData: makeCalendarEvent() });

    await user.click(screen.getByRole('button', { name: /delete event/i }));
    await user.click(screen.getByRole('button', { name: /keep it/i }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /delete event/i })).toBeInTheDocument();
  });
});

describe('pre-filled from elsewhere', () => {
  it('applies the prefill when creating', () => {
    setup({
      prefill: {
        title: 'Interview — Globex',
        event_type: 'onsite',
        application_id: 'app-1'
      }
    });

    expect(screen.getByLabelText(/^title/i)).toHaveValue('Interview — Globex');
    expect(screen.getByLabelText(/event type/i)).toHaveValue('onsite');
    expect(screen.getByLabelText(/linked application/i)).toHaveValue('app-1');
  });

  it('ignores the prefill when editing an existing event', () => {
    setup({
      initialData: makeCalendarEvent({ title: 'Real event', event_type: 'phone_screen' }),
      prefill: { title: 'Should be ignored', event_type: 'onsite' }
    });

    expect(screen.getByLabelText(/^title/i)).toHaveValue('Real event');
    expect(screen.getByLabelText(/event type/i)).toHaveValue('phone_screen');
  });
});
