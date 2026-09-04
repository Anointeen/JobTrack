import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
  documents: [] as any[],
  attachedDocuments: [] as any[],
  attachDocuments: vi.fn(),
  detachDocument: vi.fn(),
  getDownloadUrl: vi.fn(),
  applications: [] as Application[],
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  openCreateEvent: vi.fn(),
  addToast: vi.fn()
}));

// The application form offers the user's documents for attachment. Mocked at
// the same boundary as the data layer: this suite is about the save flow, not
// the document hub.
vi.mock('./DocumentsContext', () => ({
  useDocuments: () => ({
    documents: mocks.documents,
    links: [],
    documentsFor: () => mocks.attachedDocuments,
    defaultFor: () => undefined,
    attachDocuments: mocks.attachDocuments,
    detachDocument: mocks.detachDocument,
    getDownloadUrl: mocks.getDownloadUrl
  })
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
    <MemoryRouter>

      <ApplicationFormProvider>
        <Harness application={application} />
      </ApplicationFormProvider>
    </MemoryRouter>
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
  mocks.documents = [];
  mocks.attachedDocuments = [];
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

/**
 * Attachments are a separate table, so saving an application is two writes.
 * These pin the ordering and the reconciliation, which is where a join table
 * usually goes wrong.
 */
describe('persisting document attachments', () => {
  const openForm = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: /open form/i }));

  it('attaches the ticked documents to a newly created application', async () => {
    mocks.documents = [{ id: 'r1', name: 'Resume v2', doc_type: 'resume', is_default: false }];
    const { user } = setup(null);

    await openForm(user);
    await user.type(await screen.findByLabelText(/company name/i), 'Globex');
    await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer');
    await user.click(screen.getByLabelText(/resume v2/i));
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(mocks.attachDocuments).toHaveBeenCalledWith('new-1', ['r1']));
  });

  it('saves the application before attaching anything to it', async () => {
    // Links pointing at a row that failed to save would reference nothing.
    mocks.documents = [{ id: 'r1', name: 'Resume v2', doc_type: 'resume', is_default: true }];
    mocks.createApplication.mockRejectedValue(new Error('Database unavailable'));
    const { user } = setup(null);

    await openForm(user);
    await user.type(await screen.findByLabelText(/company name/i), 'Globex');
    await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(mocks.createApplication).toHaveBeenCalled());
    expect(mocks.attachDocuments).not.toHaveBeenCalled();
  });

  it('attaches nothing when nothing is ticked', async () => {
    const { user } = setup(null);

    await openForm(user);
    await user.type(await screen.findByLabelText(/company name/i), 'Globex');
    await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(mocks.createApplication).toHaveBeenCalled());
    expect(mocks.attachDocuments).not.toHaveBeenCalled();
  });

  it('adds only the newly ticked document when editing', async () => {
    // Re-sending the whole list would trip the unique (application_id,
    // document_id) constraint on what is already attached.
    mocks.documents = [
      { id: 'r1', name: 'Resume v2', doc_type: 'resume', is_default: false },
      { id: 'c1', name: 'Cover letter', doc_type: 'cover_letter', is_default: false }
    ];
    mocks.attachedDocuments = [mocks.documents[0]];
    const { user } = setup(makeApplication({ id: 'app-1' }));

    await openForm(user);
    await user.click(await screen.findByLabelText(/cover letter/i));
    await user.click(screen.getByRole('button', { name: /update application/i }));

    await waitFor(() => expect(mocks.attachDocuments).toHaveBeenCalledWith('app-1', ['c1']));
    expect(mocks.detachDocument).not.toHaveBeenCalled();
  });

  it('detaches a document the user unticked', async () => {
    mocks.documents = [{ id: 'r1', name: 'Resume v2', doc_type: 'resume', is_default: false }];
    mocks.attachedDocuments = [mocks.documents[0]];
    const { user } = setup(makeApplication({ id: 'app-1' }));

    await openForm(user);
    await user.click(await screen.findByLabelText(/resume v2/i));
    await user.click(screen.getByRole('button', { name: /update application/i }));

    await waitFor(() => expect(mocks.detachDocument).toHaveBeenCalledWith('app-1', 'r1'));
    expect(mocks.attachDocuments).not.toHaveBeenCalled();
  });

  it('writes nothing when the attachments are unchanged', async () => {
    mocks.documents = [{ id: 'r1', name: 'Resume v2', doc_type: 'resume', is_default: false }];
    mocks.attachedDocuments = [mocks.documents[0]];
    const { user } = setup(makeApplication({ id: 'app-1' }));

    await openForm(user);
    await user.clear(await screen.findByLabelText(/job title/i));
    await user.type(screen.getByLabelText(/job title/i), 'Renamed Role');
    await user.click(screen.getByRole('button', { name: /update application/i }));

    await waitFor(() => expect(mocks.updateApplication).toHaveBeenCalled());
    expect(mocks.attachDocuments).not.toHaveBeenCalled();
    expect(mocks.detachDocument).not.toHaveBeenCalled();
  });
});
