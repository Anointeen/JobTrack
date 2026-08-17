import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SignUpOutcome } from '../../types';

/**
 * Sign-up has three distinct outcomes and they must not be conflated:
 *
 *   A. success with an active session      -> close, the app is usable
 *   B. success needing email confirmation  -> a success screen, NOT an error
 *   C. genuine failure                     -> the error banner
 *
 * Outcome B previously threw an Error, so "Account created. Please check your
 * email" was rendered inside the red error banner.
 */

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  logIn: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ signUp: mocks.signUp, logIn: mocks.logIn }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children
}));

import { AuthModal } from './AuthModal';

const setup = (initialMode: 'login' | 'signup' = 'signup') => {
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<AuthModal isOpen onClose={onClose} initialMode={initialMode} />);
  return { onClose, user };
};

const fillSignup = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/full name/i), 'Ada Lovelace');
  await user.type(screen.getByLabelText(/email address/i), 'ada@example.test');
  await user.type(screen.getByLabelText(/password/i), 'CorrectHorse1');
};

const submitSignup = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /create account/i }));

beforeEach(() => {
  mocks.signUp.mockReset();
  mocks.logIn.mockReset().mockResolvedValue(undefined);
});

describe('A. sign-up with an active session', () => {
  it('closes the modal so the user lands in the app', async () => {
    mocks.signUp.mockResolvedValue({ status: 'active_session' } as SignUpOutcome);
    const { onClose, user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows no error banner', async () => {
    mocks.signUp.mockResolvedValue({ status: 'active_session' } as SignUpOutcome);
    const { user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalled());
    expect(screen.queryByText(/an error occurred/i)).not.toBeInTheDocument();
  });
});

describe('B. sign-up requiring email confirmation', () => {
  const confirmation: SignUpOutcome = {
    status: 'confirmation_required',
    email: 'ada@example.test'
  };

  it('presents it as a success, not an error', async () => {
    mocks.signUp.mockResolvedValue(confirmation);
    const { user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    const status = await screen.findByRole('status');
    expect(status).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /account created/i })).toBeInTheDocument();

    // The distinguishing regression check: this must not be in an alert.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('names the address the confirmation was sent to', async () => {
    mocks.signUp.mockResolvedValue(confirmation);
    const { user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    expect(await screen.findByText('ada@example.test')).toBeInTheDocument();
    expect(screen.getByText(/we've sent a confirmation link/i)).toBeInTheDocument();
  });

  it('tells the user what to do next', async () => {
    mocks.signUp.mockResolvedValue(confirmation);
    const { user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    await screen.findByRole('status');
    expect(screen.getByText(/select the confirmation link/i)).toBeInTheDocument();
    expect(screen.getByText(/come back here and log in/i)).toBeInTheDocument();
    expect(screen.getByText(/spam folder/i)).toBeInTheDocument();
  });

  it('does not close the modal into a signed-out app', async () => {
    mocks.signUp.mockResolvedValue(confirmation);
    const { onClose, user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    await screen.findByRole('status');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('offers a keyboard-reachable route to the login form', async () => {
    mocks.signUp.mockResolvedValue(confirmation);
    const { user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    const cta = await screen.findByRole('button', { name: /continue to log in/i });
    expect(cta).toBeEnabled();

    await user.click(cta);
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('C. genuine sign-up failure', () => {
  it('shows the error banner', async () => {
    mocks.signUp.mockRejectedValue(new Error('Password should be at least 6 characters.'));
    const { onClose, user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    expect(await screen.findByText(/password should be at least 6 characters/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // A failure must never be dressed up as the confirmation success screen.
    expect(screen.queryByRole('heading', { name: /account created/i })).not.toBeInTheDocument();
  });

  it('re-enables the submit control so the user can retry', async () => {
    mocks.signUp.mockRejectedValueOnce(new Error('Network request failed'));
    const { user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    await screen.findByText(/network request failed/i);
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  it('does not call the API with an empty form', async () => {
    const { user } = setup();
    await submitSignup(user);

    // The browser's own `required` validation blocks the submit first; either
    // way nothing must reach the auth layer.
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('reports missing fields when its own validation is reached', async () => {
    setup();
    // Submitting the form directly bypasses native constraint validation, which
    // is what lets the component's own check run.
    const form = screen
      .getByRole('button', { name: /create account/i })
      .closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(await screen.findByText(/complete all required fields/i)).toBeInTheDocument();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
});

/**
 * Sign in and sign up are two separate experiences that happen to share one
 * component. Whichever one the user asked for is the only one they may see:
 * no registration fields on the sign-in screen, and no mixed-purpose wording.
 *
 * The primary action is located by `type="submit"` rather than by name, because
 * each screen also carries a *link* to the other one whose label collides with
 * the other screen's submit label.
 */
const primaryAction = () =>
  document.querySelector('form button[type="submit"]') as HTMLButtonElement;

describe('D. separate sign-in and sign-up experiences', () => {
  it('shows only the sign-in experience when opened as sign in', () => {
    setup('login');

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();

    expect(primaryAction()).toHaveTextContent(/sign in/i);
    expect(primaryAction()).not.toHaveTextContent(/create account/i);
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('keeps "Forgot Password?" on the sign-in screen only', async () => {
    const onOpenForgotPassword = vi.fn();
    const user = userEvent.setup();
    render(
      <AuthModal
        isOpen
        onClose={vi.fn()}
        initialMode="login"
        onOpenForgotPassword={onOpenForgotPassword}
      />
    );

    const forgot = screen.getByRole('button', { name: /forgot password/i });
    await user.click(forgot);
    expect(onOpenForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('shows only the registration experience when opened as sign up', () => {
    setup('signup');

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();

    expect(primaryAction()).toHaveTextContent(/create account/i);
    expect(screen.queryByRole('button', { name: /forgot password/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /start tracking your career/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it('switches sign in -> sign up and moves focus to the first new field', async () => {
    const { user } = setup('login');

    await user.click(screen.getByRole('button', { name: /^sign up$/i }));

    const fullName = await screen.findByLabelText(/full name/i);
    expect(fullName).toBeInTheDocument();
    expect(primaryAction()).toHaveTextContent(/create account/i);
    expect(screen.queryByRole('button', { name: /forgot password/i })).not.toBeInTheDocument();
    await waitFor(() => expect(fullName).toHaveFocus());
  });

  it('switches sign up -> sign in and moves focus to the email field', async () => {
    const { user } = setup('signup');

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument());
    expect(primaryAction()).toHaveTextContent(/sign in/i);
    await waitFor(() => expect(screen.getByLabelText(/email address/i)).toHaveFocus());
  });

  it('does not carry the typed password across a switch', async () => {
    const { user } = setup('signup');

    await user.type(screen.getByLabelText(/^password/i), 'CorrectHorse1');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(screen.getByLabelText(/^password/i)).toHaveValue(''));
    expect(screen.getByLabelText(/email address/i)).toHaveValue('');
  });

  it('reopens on the experience the caller asked for, not the last one shown', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AuthModal isOpen onClose={vi.fn()} initialMode="login" />
    );

    // The user wanders into sign up, then closes the modal.
    await user.click(screen.getByRole('button', { name: /^sign up$/i }));
    expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument();
    rerender(<AuthModal isOpen={false} onClose={vi.fn()} initialMode="login" />);

    // Choosing "Sign in" again must not reopen on the registration screen.
    rerender(<AuthModal isOpen onClose={vi.fn()} initialMode="login" />);
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(primaryAction()).toHaveTextContent(/sign in/i);
  });

  it('clears a stale error when moving to the other experience', async () => {
    const { user } = setup('signup');

    const form = primaryAction().closest('form') as HTMLFormElement;
    fireEvent.submit(form);
    expect(await screen.findByText(/complete all required fields/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(screen.queryByText(/complete all required fields/i)).not.toBeInTheDocument();
  });
});

describe('no internal detail reaches the UI', () => {
  it('does not render database constraint names', async () => {
    // The auth layer sanitises before throwing; this asserts the modal does not
    // reintroduce raw detail of its own.
    mocks.signUp.mockRejectedValue(
      new Error('We could not complete that request. Please try again.')
    );
    const { user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    const banner = await screen.findByText(/could not complete that request/i);
    expect(banner.textContent).not.toMatch(/constraint|relation |violates|postgres|supabase|sql/i);
  });

  it('surfaces the neutral duplicate-account wording without confirming existence', async () => {
    mocks.signUp.mockRejectedValue(new Error(
      'We could not create an account with those details. If you already have an ' +
      'account, try logging in or resetting your password.'
    ));
    const { user } = setup();

    await fillSignup(user);
    await submitSignup(user);

    const msg = await screen.findByText(/could not create an account with those details/i);
    // Must not assert that the address is registered.
    expect(msg.textContent).not.toMatch(/already registered|user exists|email is taken/i);
  });
});
