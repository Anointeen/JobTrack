import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeApplication } from '../test/factories';
import type { Application } from '../types';

/**
 * The edit form's save flow.
 *
 * The "Add to Calendar" offer was originally wired only into the detail
 * modal's status panel, so changing a status through *this* form — the pencil
 * icon on an application row — saved correctly and then silently did nothing.
 * Nothing covered this path, which is why it shipped. These tests cover it.
 */

const mocks = vi.hoisted(() => ({
  applications: [] as Application[],
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  openCreateEvent: vi.fn(),
  addToast: vi.fn()
}));

vi.mock('./ApplicationsContext', () => ({
  useApplications: () => ({
    applications: mocks.applications,
    createApplication: mocks.createApplication,
    updateApplication: mocks.updateApplication
  })
}));

vi.mock('./CalendarEventFormContext', () => ({
  useCalendarEventForm: () => ({
    openCreateEvent: mocks.openCreateEvent,
    openEditEvent: vi.fn()
  })
}));

vi.mock('./ToastContext', () => ({
  useToast: () => ({ addToast: mocks.addToast })
}));

import { ApplicationFormProvider, useApplicationForm } from './ApplicationFormContext';

/** Opens the edit form for a given application, the way a row's pencil does. */
const Harness: React.FC<{ application: Application | null }> = ({ application }) => {
  const { openEditForm, openCreateForm } = useApplicationForm();
  return (
    <button
      type="button"
      onClick={() => (application ? openEditForm(application) : openCreateForm())}
    >
      open form
    </button>
  );
};

const setup = (application: Application | null) => {
  const user = userEvent.setup();
  render(
    <ApplicationFormProvider>
      <Harness application={application} />
    </ApplicationFormProvider>
  );
  return { user };
};

/** Opens the form, sets the status, saves. */
const editStatusTo = async (
  user: ReturnType<typeof userEvent.setup>,
  status: string
) => {
  await user.click(screen.getByRole('button', { name: /open form/i }));
  await user.selectOptions(await screen.findByLabelText(/^status/i), status);
  await user.click(screen.getByRole('button', { name: /update application/i }));
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.applications = [];
  mocks.createApplication.mockImplementation(async (d: any) =>
    makeApplication({ ...d, id: 'new-1' })
  );
  mocks.updateApplication.mockImplementation(async (id: string, d: any) =>
    makeApplication({ ...d, id })
  );
});

describe('saving the edit form into an interview stage', () => {
  it('offers the calendar when the status is changed to Interview', async () => {
    const { user } = setup(makeApplication({ id: 'app-1', status: 'Applied' }));
    await editStatusTo(user, 'Interview');

    expect(await screen.findByRole('button', { name: /add to calendar/i })).toBeInTheDocument();
  });

  it('offers the calendar when the status is changed to Assessment', async () => {
    const { user } = setup(makeApplication({ id: 'app-1', status: 'Applied' }));
    await editStatusTo(user, 'Assessment');

    expect(await screen.findByRole('button', { name: /add to calendar/i })).toBeInTheDocument();
  });

  it('saves the application before offering anything', async () => {
    const { user } = setup(makeApplication({ id: 'app-1', status: 'Applied' }));
    await editStatusTo(user, 'Interview');

    await waitFor(() => expect(mocks.updateApplication).toHaveBeenCalled());
    expect(mocks.updateApplication.mock.calls[0][1].status).toBe('Interview');
  });

  it('pre-fills the event with the stage and links the application', async () => {
    const { user } = setup(
      makeApplication({ id: 'app-1', status: 'Applied', company_name: 'Globex' })
    );
    await editStatusTo(user, 'Interview');

    await user.click(await screen.findByRole('button', { name: /add to calendar/i }));

    expect(mocks.openCreateEvent).toHaveBeenCalledTimes(1);
    const prefill = mocks.openCreateEvent.mock.calls[0][0];
    expect(prefill.application_id).toBe('app-1');
    expect(prefill.event_type).toBe('onsite');
    expect(prefill.title).toMatch(/globex/i);
  });

  it('maps the assessment stage to a technical interview', async () => {
    const { user } = setup(makeApplication({ id: 'app-1', status: 'Applied' }));
    await editStatusTo(user, 'Assessment');

    await user.click(await screen.findByRole('button', { name: /add to calendar/i }));
    expect(mocks.openCreateEvent.mock.calls[0][0].event_type).toBe('technical_interview');
  });

  it('can be dismissed without scheduling anything', async () => {
    const { user } = setup(makeApplication({ id: 'app-1', status: 'Applied' }));
    await editStatusTo(user, 'Interview');

    await user.click(await screen.findByRole('button', { name: /not now/i }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /add to calendar/i })).not.toBeInTheDocument());
    expect(mocks.openCreateEvent).not.toHaveBeenCalled();
  });

  it('closes the edit form before the offer appears, so dialogs never stack', async () => {
    const { user } = setup(makeApplication({ id: 'app-1', status: 'Applied' }));
    await editStatusTo(user, 'Interview');

    await screen.findByRole('button', { name: /add to calendar/i });
    expect(screen.queryByRole('button', { name: /update application/i })).not.toBeInTheDocument();
  });
});

describe('when the calendar should stay quiet', () => {
  it('says nothing for a status that is not an interview stage', async () => {
    const { user } = setup(makeApplication({ id: 'app-1', status: 'Applied' }));
    await editStatusTo(user, 'Offer');

    await waitFor(() => expect(mocks.updateApplication).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /add to calendar/i })).not.toBeInTheDocument();
  });

  it('does not re-offer when an application already at Interview is edited', async () => {
    // Editing the notes of an application already at Interview has not moved
    // it anywhere; prompting again would be nagging.
    const { user } = setup(makeApplication({ id: 'app-1', status: 'Interview' }));

    await user.click(screen.getByRole('button', { name: /open form/i }));
    await user.type(await screen.findByLabelText(/notes/i), 'Prep the system design round');
    await user.click(screen.getByRole('button', { name: /update application/i }));

    await waitFor(() => expect(mocks.updateApplication).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /add to calendar/i })).not.toBeInTheDocument();
  });

  it('says nothing when the save failed', async () => {
    mocks.updateApplication.mockRejectedValue(new Error('Network request failed'));
    const { user } = setup(makeApplication({ id: 'app-1', status: 'Applied' }));
    await editStatusTo(user, 'Interview');

    await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith(
      'error', 'Save Error', expect.stringMatching(/network request failed/i)
    ));
    expect(screen.queryByRole('button', { name: /add to calendar/i })).not.toBeInTheDocument();
  });
});

describe('creating an application directly at an interview stage', () => {
  it('offers the calendar', async () => {
    const { user } = setup(null);

    await user.click(screen.getByRole('button', { name: /open form/i }));
    await user.type(await screen.findByLabelText(/company name/i), 'Globex');
    await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer');
    await user.selectOptions(screen.getByLabelText(/^status/i), 'Interview');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    expect(await screen.findByRole('button', { name: /add to calendar/i })).toBeInTheDocument();
  });

  it('stays quiet for an ordinary new application', async () => {
    const { user } = setup(null);

    await user.click(screen.getByRole('button', { name: /open form/i }));
    await user.type(await screen.findByLabelText(/company name/i), 'Globex');
    await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(mocks.createApplication).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /add to calendar/i })).not.toBeInTheDocument();
  });
});
