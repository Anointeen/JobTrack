import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeProfile } from '../../test/factories';

/**
 * Onboarding is a blocking, non-dismissible modal — it is the one screen where
 * a swallowed error strands the user with no route forward. These tests pin the
 * failure paths specifically.
 */

// vi.hoisted runs before module imports, so no imported helper may be called
// inside it — the fixture is built in beforeEach instead.
const mocks = vi.hoisted(() => ({
  completeOnboarding: vi.fn(),
  profile: null as ReturnType<typeof makeProfile> | null
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile: mocks.profile, completeOnboarding: mocks.completeOnboarding }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

import { OnboardingModal } from './OnboardingModal';

const setup = () => {
  const onComplete = vi.fn();
  const user = userEvent.setup();
  render(<OnboardingModal isOpen onComplete={onComplete} />);
  return { onComplete, user };
};

beforeEach(() => {
  mocks.completeOnboarding.mockReset().mockResolvedValue(undefined);
  // A user who reaches onboarding has the blank profile the signup trigger
  // created, so every field starts empty and typing does not append.
  mocks.profile = makeProfile({
    full_name: '',
    professional_title: '',
    location: '',
    phone: '',
    linkedin_url: '',
    onboarding_completed: false
  });
});

describe('completing onboarding', () => {
  it('saves the entered profile and reports completion', async () => {
    const { onComplete, user } = setup();

    await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/professional title/i), 'Engineer');
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));

    await waitFor(() => expect(mocks.completeOnboarding).toHaveBeenCalled());
    expect(mocks.completeOnboarding.mock.calls[0][0]).toMatchObject({
      full_name: 'Ada Lovelace',
      professional_title: 'Engineer'
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it('keeps the primary action disabled until a name is supplied', async () => {
    const { user } = setup();
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/full name/i), 'Ada');
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeEnabled();
  });

  it('allows skipping the optional fields', async () => {
    const { onComplete, user } = setup();

    await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: /skip optional info/i }));

    await waitFor(() => expect(mocks.completeOnboarding).toHaveBeenCalled());
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });
});

describe('failure paths', () => {
  it('tells the user when saving the profile fails', async () => {
    mocks.completeOnboarding.mockRejectedValue(new Error('Profile write failed'));
    const { onComplete, user } = setup();

    await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/profile write failed/i);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('tells the user when skipping fails, instead of failing silently', async () => {
    // This path previously had no catch at all: the rejection became an
    // unhandled promise and the user was left on a blocking modal with no
    // feedback and no way to continue.
    mocks.completeOnboarding.mockRejectedValue(new Error('Skip write failed'));
    const { onComplete, user } = setup();

    await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: /skip optional info/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/skip write failed/i);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('re-enables the controls after a failure so the user can retry', async () => {
    mocks.completeOnboarding.mockRejectedValueOnce(new Error('Transient failure'));
    const { onComplete, user } = setup();

    await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
    await screen.findByRole('alert');

    // Not stuck behind a permanently disabled button.
    const retry = screen.getByRole('button', { name: /go to dashboard/i });
    expect(retry).toBeEnabled();

    mocks.completeOnboarding.mockResolvedValue(undefined);
    await user.click(retry);
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it('clears a previous error when the retry succeeds', async () => {
    mocks.completeOnboarding.mockRejectedValueOnce(new Error('First attempt failed'));
    const { user } = setup();

    await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace');
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
    await screen.findByRole('alert');

    mocks.completeOnboarding.mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
