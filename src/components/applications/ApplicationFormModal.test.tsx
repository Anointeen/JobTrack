import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationFormModal } from './ApplicationFormModal';
import { makeApplication, localDate } from '../../test/factories';
import type { ApplicationInput } from '../../types';

/**
 * Application form integration tests.
 *
 * The form is rendered with real props; `onSave` stands in for the data layer,
 * which is the natural boundary — everything the user does up to and including
 * validation runs for real, and the assertion is on what payload the data layer
 * would receive.
 */

const setup = (props: Partial<React.ComponentProps<typeof ApplicationFormModal>> = {}) => {
  const onSave = vi.fn<(data: ApplicationInput) => Promise<void>>().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(
    <ApplicationFormModal
      isOpen
      onClose={onClose}
      onSave={onSave}
      initialData={null}
      {...props}
    />
  );

  return { onSave, onClose, user };
};

/**
 * Sets a date input.
 *
 * fireEvent.change, not a direct `.value` assignment: React installs a value
 * tracker on controlled inputs and ignores raw assignments, so the component
 * state would never update. Typing into a date input is separately unreliable
 * in jsdom.
 */
const setDate = (label: RegExp, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

/** The <form> element, for submits that deliberately skip native validation. */
const submitTarget = (): HTMLFormElement =>
  screen.getByRole('button', { name: /save application|update application/i })
    .closest('form') as HTMLFormElement;

const fillRequired = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/company name/i), 'Globex');
  await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer');
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('opening the form', () => {
  it('renders the add form when no application is supplied', () => {
    setup();
    expect(screen.getByRole('heading', { name: /add new application/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save application/i })).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    setup({ isOpen: false });
    expect(screen.queryByRole('heading', { name: /add new application/i })).not.toBeInTheDocument();
  });

  it('renders the edit form when an application is supplied', () => {
    setup({ initialData: makeApplication({ job_title: 'Existing Role' }) });
    expect(screen.getByRole('heading', { name: /edit job application/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update application/i })).toBeInTheDocument();
  });
});

describe('required-field validation', () => {
  it('does not submit when company and job title are empty', async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole('button', { name: /save application/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not submit with only a company name', async () => {
    const { onSave, user } = setup();
    await user.type(screen.getByLabelText(/company name/i), 'Globex');
    await user.click(screen.getByRole('button', { name: /save application/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits once both required fields are filled', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: /save application/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });
});

describe('metadata defaults and entry', () => {
  it('defaults priority to Medium', () => {
    setup();
    expect(screen.getByLabelText(/priority/i)).toHaveValue('Medium');
  });

  it('defaults source to unspecified', () => {
    setup();
    expect(screen.getByLabelText(/source/i)).toHaveValue('');
  });

  it('submits the default metadata when the user changes nothing', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.priority).toBe('Medium');
    expect(payload.tags).toEqual([]);
    expect(payload.source).toBeNull();
    expect(payload.follow_up_date).toBeNull();
    expect(payload.follow_up_note).toBeNull();
  });

  it('lets the user choose a priority', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.selectOptions(screen.getByLabelText(/priority/i), 'High');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].priority).toBe('High');
  });

  it('lets the user choose a source', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.selectOptions(screen.getByLabelText(/source/i), 'Referral');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].source).toBe('Referral');
  });

  it('accepts a follow-up date and note', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    setDate(/application date/i, localDate(-5));
    setDate(/follow-up date/i, localDate(3));
    await user.type(screen.getByLabelText(/follow-up note/i), 'Chase the recruiter');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.follow_up_date).toBe(localDate(3));
    expect(payload.follow_up_note).toBe('Chase the recruiter');
  });
});

describe('metadata validation', () => {
  it('rejects a follow-up note with no follow-up date', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/follow-up note/i), 'Note without a date');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    expect(await screen.findByText(/add a follow-up date so this note can be scheduled/i))
      .toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a follow-up date earlier than the application date', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    setDate(/application date/i, localDate(0));
    setDate(/follow-up date/i, localDate(-5));
    await user.click(screen.getByRole('button', { name: /save application/i }));

    // Two layers reject this: the input's `min` attribute stops the browser
    // submitting at all, and the custom validator (exercised below) catches it
    // if that is ever bypassed. The guarantee either way is that nothing is
    // sent to the data layer.
    expect(onSave).not.toHaveBeenCalled();
  });

  it('produces a readable message when the follow-up date check is reached', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    setDate(/application date/i, localDate(0));
    setDate(/follow-up date/i, localDate(-5));

    // Submitting the form directly bypasses native constraint validation, which
    // is what lets the component's own validator run — this is the layer that
    // renders a sentence instead of a raw PostgreSQL 23514 error.
    fireEvent.submit(submitTarget());

    expect(await screen.findByText(/follow-up date cannot be earlier than the application date/i))
      .toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('accepts a follow-up date equal to the application date', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    setDate(/application date/i, localDate(0));
    setDate(/follow-up date/i, localDate(0));
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });

  it('rejects a deadline earlier than the application date', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    setDate(/application date/i, localDate(0));
    setDate(/application deadline/i, localDate(-3));
    await user.click(screen.getByRole('button', { name: /save application/i }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('produces a readable message when the deadline check is reached', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    setDate(/application date/i, localDate(0));
    setDate(/application deadline/i, localDate(-3));

    fireEvent.submit(submitTarget());

    expect(await screen.findByText(/deadline cannot be earlier than the application date/i))
      .toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a maximum salary below the minimum', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/salary min/i), '90000');
    await user.type(screen.getByLabelText(/salary max/i), '50000');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    expect(await screen.findByText(/maximum salary cannot be lower than minimum salary/i))
      .toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects an invalid recruiter email', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/recruiter email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    // type="email" makes the browser refuse the submit first.
    expect(onSave).not.toHaveBeenCalled();
  });

  it('produces a readable message when the email check is reached', async () => {
    const { onSave, user } = setup();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/recruiter email/i), 'not-an-email');

    fireEvent.submit(submitTarget());

    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('editing an existing application', () => {
  const existing = makeApplication({
    id: 'app-edit',
    company_name: 'Initech',
    job_title: 'Principal Engineer',
    priority: 'High',
    source: 'LinkedIn',
    tags: ['Dream Job', 'Remote'],
    application_date: localDate(-20),
    follow_up_date: localDate(5),
    follow_up_note: 'Ping Sarah',
    notes: 'Existing notes body'
  });

  it('populates every metadata field from the existing record', () => {
    setup({ initialData: existing });

    expect(screen.getByLabelText(/company name/i)).toHaveValue('Initech');
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Principal Engineer');
    expect(screen.getByLabelText(/priority/i)).toHaveValue('High');
    expect(screen.getByLabelText(/source/i)).toHaveValue('LinkedIn');
    expect(screen.getByLabelText(/follow-up date/i)).toHaveValue(localDate(5));
    expect(screen.getByLabelText(/follow-up note/i)).toHaveValue('Ping Sarah');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Existing notes body');
  });

  it('shows the existing tags as removable chips', () => {
    setup({ initialData: existing });
    expect(screen.getByText('Dream Job')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove tag dream job/i })).toBeInTheDocument();
  });

  it('preserves unchanged metadata when only one field is edited', async () => {
    const { onSave, user } = setup({ initialData: existing });

    await user.clear(screen.getByLabelText(/job title/i));
    await user.type(screen.getByLabelText(/job title/i), 'Distinguished Engineer');
    await user.click(screen.getByRole('button', { name: /update application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.job_title).toBe('Distinguished Engineer');
    expect(payload.priority).toBe('High');
    expect(payload.source).toBe('LinkedIn');
    expect(payload.tags).toEqual(['Dream Job', 'Remote']);
    expect(payload.follow_up_date).toBe(localDate(5));
    expect(payload.follow_up_note).toBe('Ping Sarah');
  });

  it('clears nullable metadata as null rather than an empty string', async () => {
    // null is what actually clears the column; '' would fail the source CHECK
    // constraint and an empty date string is not a valid DATE.
    const { onSave, user } = setup({ initialData: existing });

    await user.selectOptions(screen.getByLabelText(/source/i), '');
    setDate(/follow-up date/i, '');
    await user.clear(screen.getByLabelText(/follow-up note/i));
    await user.click(screen.getByRole('button', { name: /update application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.source).toBeNull();
    expect(payload.follow_up_date).toBeNull();
    expect(payload.follow_up_note).toBeNull();
  });

  it('can remove all tags, submitting an empty array', async () => {
    const { onSave, user } = setup({ initialData: existing });

    await user.click(screen.getByRole('button', { name: /remove tag dream job/i }));
    await user.click(screen.getByRole('button', { name: /remove tag remote/i }));
    await user.click(screen.getByRole('button', { name: /update application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].tags).toEqual([]);
  });
});

describe('cancel and close', () => {
  it('closes without saving when Cancel is pressed', async () => {
    const { onSave, onClose, user } = setup();
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('closes without saving from the modal close control', async () => {
    const { onSave, onClose, user } = setup();
    await user.click(screen.getByRole('button', { name: /close modal/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('submission outcomes', () => {
  it('surfaces a save failure to the user and keeps the form open', async () => {
    const onSave = vi.fn<(data: ApplicationInput) => Promise<void>>()
      .mockRejectedValue(new Error('Database unavailable'));
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ApplicationFormModal isOpen onClose={onClose} onSave={onSave} initialData={null} />
    );

    await user.type(screen.getByLabelText(/company name/i), 'Globex');
    await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    expect(await screen.findByText(/database unavailable/i)).toBeInTheDocument();
    // The form stays open so the user does not lose what they typed.
    expect(screen.getByRole('heading', { name: /add new application/i })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a successful save', async () => {
    const { onSave, onClose, user } = setup();
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('trims whitespace from text fields before saving', async () => {
    const { onSave, user } = setup();
    await user.type(screen.getByLabelText(/company name/i), '  Globex  ');
    await user.type(screen.getByLabelText(/job title/i), '  Staff Engineer  ');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.company_name).toBe('Globex');
    expect(payload.job_title).toBe('Staff Engineer');
  });

  it('disables the submit control while the save is in flight', async () => {
    let resolveSave: () => void = () => {};
    const onSave = vi.fn<(data: ApplicationInput) => Promise<void>>()
      .mockReturnValue(new Promise<void>(res => { resolveSave = res; }));
    const user = userEvent.setup();

    render(<ApplicationFormModal isOpen onClose={vi.fn()} onSave={onSave} initialData={null} />);

    await user.type(screen.getByLabelText(/company name/i), 'Globex');
    await user.type(screen.getByLabelText(/job title/i), 'Staff Engineer');
    await user.click(screen.getByRole('button', { name: /save application/i }));

    const submitting = await screen.findByRole('button', { name: /saving application/i });
    expect(submitting).toBeDisabled();

    resolveSave();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });
});

describe('modal footer usability', () => {
  it('keeps both footer controls reachable', () => {
    setup();
    const cancel = screen.getByRole('button', { name: /^cancel$/i });
    const save = screen.getByRole('button', { name: /save application/i });
    expect(cancel).toBeEnabled();
    expect(save).toBeEnabled();
    // Both live in the same action row, so neither can be pushed off-screen
    // independently of the other.
    expect(within(save.parentElement as HTMLElement).getByRole('button', { name: /^cancel$/i }))
      .toBe(cancel);
  });
});
