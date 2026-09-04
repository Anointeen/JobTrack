import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { makeApplication, makeHistory, localDate } from '../../test/factories';

/**
 * Detail modal: metadata presentation, empty states and the status-change
 * failure path. dataService is the mocked boundary.
 */

const mocks = vi.hoisted(() => ({
  documents: [] as any[],
  attachedDocuments: [] as any[],
  attachDocuments: vi.fn(),
  detachDocument: vi.fn(),
  getDownloadUrl: vi.fn(),
  openCreateEvent: vi.fn(),
  addToast: vi.fn(),
  data: {
    getStatusHistory: vi.fn(),
    updateApplication: vi.fn(),
    recordStatusHistory: vi.fn()
  }
}));

vi.mock('../../lib/dataService', () => ({ dataService: mocks.data }));

// The attached-documents section reports failures through the toast system.
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ addToast: mocks.addToast })
}));

// The application form and detail view now offer the user's documents.
// Mocked at the same boundary as the data layer: these suites are about the
// application surfaces, not the document hub.
vi.mock('../../context/DocumentsContext', () => ({
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

// The detail modal offers to add an interview stage to the calendar, so it
// consumes the event-form context. Mocked at the same boundary as the data
// layer: these tests are about the detail modal, not the calendar.
vi.mock('../../context/CalendarEventFormContext', () => ({
  useCalendarEventForm: () => ({ openCreateEvent: mocks.openCreateEvent, openEditEvent: vi.fn() })
}));

import { ApplicationDetailModal } from './ApplicationDetailModal';

const setup = (application = makeApplication({ id: 'a1' })) => {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onStatusChanged = vi.fn();
  const user = userEvent.setup();

  render(
    <MemoryRouter>

      <ApplicationDetailModal
        application={application}
        isOpen
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChanged={onStatusChanged}
      />
    </MemoryRouter>
  );

  return { onClose, onEdit, onDelete, onStatusChanged, user };
};

beforeEach(() => {
  mocks.documents = [];
  mocks.attachedDocuments = [];
  mocks.data.getStatusHistory.mockResolvedValue([]);
  mocks.data.updateApplication.mockReset();
  mocks.data.recordStatusHistory.mockReset().mockResolvedValue(null);
});

describe('metadata presentation', () => {
  it('shows priority, source, tags and follow-up when present', async () => {
    setup(makeApplication({
      id: 'a1',
      // Distinct from any tag value, so the assertions cannot match the
      // location field by accident.
      location: 'Berlin, DE',
      priority: 'High',
      source: 'Referral',
      tags: ['Fully-Remote', 'Dream Job'],
      follow_up_date: localDate(3),
      follow_up_note: 'Chase the recruiter'
    }));

    expect(await screen.findByText('High')).toBeInTheDocument();
    expect(screen.getByText('Referral')).toBeInTheDocument();
    expect(screen.getByText('Fully-Remote')).toBeInTheDocument();
    expect(screen.getByText('Dream Job')).toBeInTheDocument();
    expect(screen.getByText('Chase the recruiter')).toBeInTheDocument();
  });

  it('shows honest empty states instead of invented values', async () => {
    setup(makeApplication({ id: 'a1', source: null, tags: [], follow_up_date: null, notes: '' }));

    // "Not specified" is used for both the absent source and the absent salary
    // range — both are legitimate empty states, so assert at least one.
    expect((await screen.findAllByText(/not specified/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/no tags yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no follow-up scheduled/i)).toBeInTheDocument();
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });

  it('does not render follow-up urgency when no follow-up date exists', async () => {
    setup(makeApplication({ id: 'a1', follow_up_date: null }));
    await screen.findByText(/no follow-up scheduled/i);

    expect(screen.queryByText(/follow up today/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/follow-up overdue/i)).not.toBeInTheDocument();
  });

  it('describes an overdue follow-up', async () => {
    setup(makeApplication({ id: 'a1', follow_up_date: localDate(-3) }));
    expect(await screen.findByText(/follow-up overdue by 3 days/i)).toBeInTheDocument();
  });

  it('describes a follow-up due today', async () => {
    setup(makeApplication({ id: 'a1', follow_up_date: localDate(0) }));
    expect(await screen.findByText(/follow up today/i)).toBeInTheDocument();
  });
});

describe('status history', () => {
  it('renders the recorded transitions', async () => {
    mocks.data.getStatusHistory.mockResolvedValue([
      makeHistory({ previous_status: 'Applied', new_status: 'Interview', note: 'Panel booked' })
    ]);
    setup();

    expect(await screen.findByText('Panel booked')).toBeInTheDocument();
  });

  it('shows an empty state when there is no history', async () => {
    setup();
    expect(await screen.findByText(/no status history recorded yet/i)).toBeInTheDocument();
  });
});

describe('changing status', () => {
  it('writes the new status and reports the change', async () => {
    const updated = makeApplication({ id: 'a1', status: 'Interview' });
    mocks.data.updateApplication.mockResolvedValue(updated);
    const { onStatusChanged, user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));

    await user.click(screen.getByRole('button', { name: /change status/i }));
    await user.selectOptions(await screen.findByLabelText(/new status/i), 'Interview');
    await user.click(screen.getByRole('button', { name: /save new status/i }));

    await waitFor(() => expect(mocks.data.updateApplication).toHaveBeenCalled());
    expect(mocks.data.updateApplication.mock.calls[0][2]).toEqual({ status: 'Interview' });
    await waitFor(() => expect(onStatusChanged).toHaveBeenCalledWith(updated));
  });

  it('surfaces a failed status change instead of doing nothing visible', async () => {
    // Previously this error was only logged: the button re-enabled itself and
    // the user had no way to tell the write had failed.
    mocks.data.updateApplication.mockRejectedValue(new Error('Status write rejected'));
    const { onStatusChanged, user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));

    await user.click(screen.getByRole('button', { name: /change status/i }));
    await user.selectOptions(await screen.findByLabelText(/new status/i), 'Offer');
    await user.click(screen.getByRole('button', { name: /save new status/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/status write rejected/i);
    expect(onStatusChanged).not.toHaveBeenCalled();
  });

  it('leaves the control usable after a failure so the change can be retried', async () => {
    mocks.data.updateApplication.mockRejectedValueOnce(new Error('Transient'));
    const { user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));

    await user.click(screen.getByRole('button', { name: /change status/i }));
    await user.selectOptions(await screen.findByLabelText(/new status/i), 'Offer');
    await user.click(screen.getByRole('button', { name: /save new status/i }));
    await screen.findByRole('alert');

    expect(screen.getByRole('button', { name: /save new status/i })).toBeEnabled();
  });

  it('does not write when the status has not actually changed', async () => {
    const { user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));

    await user.click(screen.getByRole('button', { name: /change status/i }));
    // Selection still 'Applied', so the save control stays disabled.
    expect(await screen.findByRole('button', { name: /save new status/i })).toBeDisabled();
    expect(mocks.data.updateApplication).not.toHaveBeenCalled();
  });
});

describe('modal actions', () => {
  it('can be closed', async () => {
    const { onClose, user } = setup();
    await user.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('requires confirmation before deleting', async () => {
    const { onDelete, user } = setup();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(await screen.findByRole('heading', { name: /delete application\?/i })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /yes, delete/i }));
    expect(onDelete).toHaveBeenCalledWith('a1');
  });

  it('lets the user back out of the delete confirmation', async () => {
    const { onDelete, user } = setup();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /delete application\?/i })).not.toBeInTheDocument());
    expect(onDelete).not.toHaveBeenCalled();
  });
});

/**
 * Moving an application into an interview stage is the moment a user knows
 * they have something to schedule, so the calendar is offered right there. It
 * is an offer, not a step: the status change is already saved by the time it
 * appears, and dismissing it changes nothing.
 */
describe('the Add to Calendar prompt', () => {
  const moveTo = async (
    user: ReturnType<typeof userEvent.setup>,
    status: string,
    from = 'Applied'
  ) => {
    mocks.data.updateApplication.mockResolvedValue(
      makeApplication({ id: 'a1', status: status as any })
    );
    await user.click(screen.getByRole('button', { name: /change status/i }));
    await user.selectOptions(await screen.findByLabelText(/new status/i), status);
    await user.click(screen.getByRole('button', { name: /save new status/i }));
    return from;
  };

  it('offers the calendar after moving to Interview', async () => {
    const { user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));
    await moveTo(user, 'Interview');

    expect(await screen.findByRole('button', { name: /add to calendar/i })).toBeInTheDocument();
  });

  it('offers the calendar after moving to Assessment', async () => {
    const { user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));
    await moveTo(user, 'Assessment');

    expect(await screen.findByRole('button', { name: /add to calendar/i })).toBeInTheDocument();
  });

  it('stays quiet for statuses that are not interview stages', async () => {
    const { user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));
    await moveTo(user, 'Offer');

    await waitFor(() => expect(mocks.data.updateApplication).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /add to calendar/i })).not.toBeInTheDocument();
  });

  it('does not offer the calendar when the status change failed', async () => {
    // Scheduling around a change that was never saved would be worse than
    // saying nothing.
    mocks.data.updateApplication.mockRejectedValue(new Error('Status write rejected'));
    const { user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));

    await user.click(screen.getByRole('button', { name: /change status/i }));
    await user.selectOptions(await screen.findByLabelText(/new status/i), 'Interview');
    await user.click(screen.getByRole('button', { name: /save new status/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add to calendar/i })).not.toBeInTheDocument();
  });

  it('opens the event form pre-filled with the application and stage', async () => {
    const { user } = setup(
      makeApplication({ id: 'a1', status: 'Applied', company_name: 'Globex', job_title: 'Staff Engineer' })
    );
    await moveTo(user, 'Interview');

    await user.click(await screen.findByRole('button', { name: /add to calendar/i }));

    expect(mocks.openCreateEvent).toHaveBeenCalledTimes(1);
    const prefill = mocks.openCreateEvent.mock.calls[0][0];
    expect(prefill.application_id).toBe('a1');
    expect(prefill.event_type).toBe('onsite');
    expect(prefill.title).toMatch(/globex/i);
  });

  it('pre-fills a technical interview for the assessment stage', async () => {
    const { user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));
    await moveTo(user, 'Assessment');

    await user.click(await screen.findByRole('button', { name: /add to calendar/i }));
    expect(mocks.openCreateEvent.mock.calls[0][0].event_type).toBe('technical_interview');
  });

  it('closes this modal so two dialogs never stack', async () => {
    const { onClose, user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));
    await moveTo(user, 'Interview');

    await user.click(await screen.findByRole('button', { name: /add to calendar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('can be dismissed without scheduling anything', async () => {
    const { onClose, user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));
    await moveTo(user, 'Interview');

    await user.click(await screen.findByRole('button', { name: /not now/i }));

    expect(screen.queryByRole('button', { name: /add to calendar/i })).not.toBeInTheDocument();
    expect(mocks.openCreateEvent).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('is announced as a status, not as an error', async () => {
    const { user } = setup(makeApplication({ id: 'a1', status: 'Applied' }));
    await moveTo(user, 'Interview');

    await screen.findByRole('button', { name: /add to calendar/i });
    expect(screen.getByRole('status')).toHaveTextContent(/put it on your calendar/i);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

/**
 * Attached documents on the detail view — what was actually sent with this
 * application, and a way to fix it.
 */
describe('attached documents', () => {
  it('lists what is attached, with a way to open it', async () => {
    mocks.attachedDocuments = [
      { id: 'r1', name: 'Resume v2', doc_type: 'resume', storage_path: 'user-1/a.pdf' }
    ];
    mocks.getDownloadUrl.mockResolvedValue('https://signed.test/a.pdf');
    window.open = vi.fn() as any;
    const { user } = setup();

    expect(screen.getByRole('heading', { name: /^documents$/i })).toBeInTheDocument();
    expect(screen.getByText('Resume v2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view/i }));
    await waitFor(() => expect(mocks.getDownloadUrl).toHaveBeenCalledWith('user-1/a.pdf'));
  });

  it('opens a portfolio link directly, with no signing step', () => {
    mocks.attachedDocuments = [
      {
        id: 'p1', name: 'My portfolio', doc_type: 'portfolio_link',
        storage_path: null, external_url: 'https://example.test/me'
      }
    ];
    setup();

    expect(screen.getByRole('link', { name: /open/i }))
      .toHaveAttribute('href', 'https://example.test/me');
  });

  it('says so when nothing is attached', () => {
    mocks.attachedDocuments = [];
    mocks.documents = [{ id: 'r1', name: 'Resume v2', doc_type: 'resume' }];
    setup();
    expect(screen.getByText(/no documents attached to this application yet/i)).toBeInTheDocument();
  });

  it('points at the hub when the user has no documents at all', () => {
    mocks.attachedDocuments = [];
    mocks.documents = [];
    setup();
    expect(screen.getByRole('link', { name: /document hub/i })).toHaveAttribute('href', '/documents');
  });

  it('can detach a document', async () => {
    mocks.attachedDocuments = [
      { id: 'r1', name: 'Resume v2', doc_type: 'resume', storage_path: 'user-1/a.pdf' }
    ];
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /detach resume v2/i }));
    await waitFor(() => expect(mocks.detachDocument).toHaveBeenCalledWith('a1', 'r1'));
  });

  it('can attach one that is not yet on this application', async () => {
    mocks.attachedDocuments = [];
    mocks.documents = [{ id: 'r1', name: 'Resume v2', doc_type: 'resume' }];
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /attach/i }));
    await user.click(await screen.findByRole('button', { name: /resume v2/i }));

    await waitFor(() => expect(mocks.attachDocuments).toHaveBeenCalledWith('a1', ['r1']));
  });
});
