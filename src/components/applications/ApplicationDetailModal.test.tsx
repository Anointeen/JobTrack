import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeApplication, makeHistory, localDate } from '../../test/factories';

/**
 * Detail modal: metadata presentation, empty states and the status-change
 * failure path. dataService is the mocked boundary.
 */

const mocks = vi.hoisted(() => ({
  data: {
    getStatusHistory: vi.fn(),
    updateApplication: vi.fn(),
    recordStatusHistory: vi.fn()
  }
}));

vi.mock('../../lib/dataService', () => ({ dataService: mocks.data }));

import { ApplicationDetailModal } from './ApplicationDetailModal';

const setup = (application = makeApplication({ id: 'a1' })) => {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onStatusChanged = vi.fn();
  const user = userEvent.setup();

  render(
    <ApplicationDetailModal
      application={application}
      isOpen
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
      onStatusChanged={onStatusChanged}
    />
  );

  return { onClose, onEdit, onDelete, onStatusChanged, user };
};

beforeEach(() => {
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
