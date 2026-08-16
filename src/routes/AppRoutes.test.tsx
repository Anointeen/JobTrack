import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { makeApplication, makeProfile, makeUser } from '../test/factories';
import type { UserProfile, UserSession } from '../types';

/**
 * Routing / auth-guard integration tests.
 *
 * Only two boundaries are mocked: the auth state (so a session can be set up
 * without a real Supabase handshake) and the data layer (so nothing reaches
 * the network). The router, the protected layout, the guards and the real
 * screens all run for real, so these tests describe user-visible behaviour
 * rather than the shape of the implementation.
 */

interface MockAuthState {
  user: UserSession | null;
  profile: UserProfile | null;
  loading: boolean;
  needsOnboarding: boolean;
  isPasswordRecovery: boolean;
}

const mocks = vi.hoisted(() => ({
  auth: {
    user: null,
    profile: null,
    loading: false,
    needsOnboarding: false,
    isPasswordRecovery: false
  } as MockAuthState,
  data: {
    getApplications: vi.fn(),
    getAllStatusHistory: vi.fn(),
    getStatusHistory: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    getNotificationPreferences: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    deleteApplication: vi.fn()
  }
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    ...mocks.auth,
    completePasswordRecovery: vi.fn(),
    cancelPasswordRecovery: vi.fn(),
    signUp: vi.fn(),
    logIn: vi.fn(),
    logOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    completeOnboarding: vi.fn(),
    refreshProfile: vi.fn()
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../lib/dataService', () => ({ dataService: mocks.data }));

/** Reports where the router actually ended up, and any carried state. */
const LocationProbe: React.FC = () => {
  const location = useLocation();
  return (
    <>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="state">{JSON.stringify(location.state ?? null)}</span>
    </>
  );
};

const renderAt = async (path: string) => {
  const { AppRoutes } = await import('./AppRoutes');
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <AppRoutes />
      </MemoryRouter>
    </ThemeProvider>
  );
};

const signedIn = (over: Partial<MockAuthState> = {}) => {
  mocks.auth.user = makeUser();
  mocks.auth.profile = makeProfile();
  mocks.auth.loading = false;
  mocks.auth.needsOnboarding = false;
  mocks.auth.isPasswordRecovery = false;
  Object.assign(mocks.auth, over);
};

/**
 * Warm the route chunks before any assertion runs.
 *
 * AppRoutes loads every protected screen through React.lazy. The first test to
 * touch one pays the whole transform cost inside its own timeout, which made
 * the first case fail under full-suite load while passing in isolation.
 * Resolving the imports up front makes each test's timing independent of the
 * order the suite happens to run in.
 */
beforeAll(async () => {
  await Promise.all([
    import('../components/layout/ProtectedLayout'),
    import('../components/dashboard/DashboardView'),
    import('../components/applications/ApplicationsView'),
    import('../components/applications/ApplicationDetailRoute'),
    import('../components/profile/ProfileView'),
    import('../components/settings/SettingsView'),
    import('../components/placeholder/CalendarView'),
    import('../components/placeholder/DocumentsView'),
    import('../components/common/NotFoundPage')
  ]);
}, 30_000);

beforeEach(() => {
  mocks.auth.user = null;
  mocks.auth.profile = null;
  mocks.auth.loading = false;
  mocks.auth.needsOnboarding = false;
  mocks.auth.isPasswordRecovery = false;

  mocks.data.getApplications.mockResolvedValue([]);
  mocks.data.getAllStatusHistory.mockResolvedValue([]);
  mocks.data.getStatusHistory.mockResolvedValue([]);
  mocks.data.getProfile.mockResolvedValue(makeProfile());
  mocks.data.getNotificationPreferences.mockResolvedValue({
    id: 'n1', user_id: 'user-1',
    deadline_reminders: true, interview_reminders: true, follow_up_reminders: true
  });
});

describe('unauthenticated access to protected routes', () => {
  it('redirects /dashboard to the landing page', async () => {
    await renderAt('/dashboard');
    // Exact comparison, not toHaveTextContent: that does a substring match, so
    // '/dashboard' would satisfy an assertion for '/' and hide the failure.
    await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/'));
    // The landing page is what actually rendered.
    expect(await screen.findAllByRole('button', { name: /log in/i })).not.toHaveLength(0);
  });

  it('redirects /applications to the landing page', async () => {
    await renderAt('/applications');
    await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/'));
  });

  it('does not render protected content while redirecting', async () => {
    await renderAt('/settings');
    await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/'));
    expect(screen.queryByText(/account settings/i)).not.toBeInTheDocument();
  });

  it('preserves the intended deep path and query in redirect state', async () => {
    await renderAt('/applications/app-1?status=interview');
    await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/'));

    const state = JSON.parse(screen.getByTestId('state').textContent || 'null');
    expect(state?.from?.pathname).toBe('/applications/app-1');
    expect(state?.from?.search).toBe('?status=interview');
  });

  it('shows the landing page at / without redirecting', async () => {
    await renderAt('/');
    expect(await screen.findByRole('heading', { name: /take control of your job search/i }))
      .toBeInTheDocument();
  });
});

describe('authenticated access', () => {
  it('renders the dashboard at /dashboard', async () => {
    signedIn();
    await renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByTestId('pathname').textContent).toBe('/dashboard');
  });

  it('renders the applications list at /applications', async () => {
    signedIn();
    mocks.data.getApplications.mockResolvedValue([makeApplication({ id: 'app-1' })]);
    await renderAt('/applications');
    expect(await screen.findByRole('heading', { name: /job applications/i })).toBeInTheDocument();
  });

  it('redirects an authenticated user away from the landing page', async () => {
    signedIn();
    await renderAt('/');
    await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/dashboard'));
  });

  it('renders the detail route for an owned application', async () => {
    signedIn();
    mocks.data.getApplications.mockResolvedValue([
      makeApplication({ id: 'app-1', job_title: 'Staff Engineer', company_name: 'Globex' })
    ]);
    await renderAt('/applications/app-1');

    // level 2 targets the detail body heading; the modal chrome repeats the
    // job title as its own h3 title.
    expect(await screen.findByRole('heading', { name: /staff engineer/i, level: 2 }))
      .toBeInTheDocument();
    // The company appears in both the underlying list row and the modal over
    // it — the detail route renders as an overlay, so duplication is expected.
    expect(screen.getAllByText('Globex').length).toBeGreaterThan(0);
    expect(screen.getByTestId('pathname').textContent).toBe('/applications/app-1');
  });

  it('shows "Application not found" for an id that is not in the user\'s own set', async () => {
    signedIn();
    // Simulates both a deleted application and one owned by somebody else:
    // either way the client never sees it, and RLS is the real boundary.
    mocks.data.getApplications.mockResolvedValue([makeApplication({ id: 'app-mine' })]);
    await renderAt('/applications/someone-elses-id');

    expect(await screen.findByRole('heading', { name: /couldn't find that application/i, level: 2 }))
      .toBeInTheDocument();
  });

  it('does not claim "not found" before the applications have loaded', async () => {
    signedIn();
    let resolveLoad: (value: unknown) => void = () => {};
    mocks.data.getApplications.mockReturnValue(new Promise(res => { resolveLoad = res; }));

    await renderAt('/applications/app-1');

    // While the fetch is in flight the detail route must not accuse the user of
    // following a bad link.
    await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/applications/app-1'));
    expect(screen.queryByText(/couldn't find that application/i)).not.toBeInTheDocument();

    resolveLoad([makeApplication({ id: 'app-1', job_title: 'Deferred Role' })]);
    expect(await screen.findByRole('heading', { name: /deferred role/i, level: 2 }))
      .toBeInTheDocument();
  });
});

describe('route aliases and fallbacks', () => {
  it('redirects /home to /dashboard', async () => {
    signedIn();
    await renderAt('/home');
    await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/dashboard'));
  });

  it('renders the Not Found page for an unknown route', async () => {
    signedIn();
    await renderAt('/no-such-page');
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('renders Not Found for an unknown route while signed out too', async () => {
    await renderAt('/no-such-page');
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});

describe('session loading gate', () => {
  it('does not bounce a deep link to the landing page while the session resolves', async () => {
    // The bug this guards against: deciding "no user" before Supabase has
    // restored the session, which would make every refresh of a deep link
    // land on the landing page.
    mocks.auth.loading = true;
    await renderAt('/applications');

    expect(screen.getByTestId('pathname').textContent).toBe('/applications');
    expect(screen.queryByRole('heading', { name: /job applications/i })).not.toBeInTheDocument();
  });
});

describe('onboarding gate', () => {
  it('shows onboarding instead of the dashboard when the profile is incomplete', async () => {
    signedIn({ needsOnboarding: true });
    await renderAt('/dashboard');

    expect(await screen.findByRole('heading', { name: /set up your profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument();
  });

  it('gates every protected route, not just the dashboard', async () => {
    signedIn({ needsOnboarding: true });
    await renderAt('/applications');

    expect(await screen.findByRole('heading', { name: /set up your profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /job applications/i })).not.toBeInTheDocument();
  });

  it('lets an onboarded user through', async () => {
    signedIn({ needsOnboarding: false });
    await renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
});

describe('password recovery precedence', () => {
  it('shows the set-new-password screen instead of the dashboard', async () => {
    // A recovery link grants a real session, so without this precedence the
    // user would silently land on the dashboard still using the old password.
    signedIn({ isPasswordRecovery: true });
    await renderAt('/dashboard');

    expect(await screen.findByRole('heading', { name: /set a new password/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument();
  });

  it('outranks the unauthenticated redirect as well', async () => {
    mocks.auth.isPasswordRecovery = true;
    await renderAt('/applications');

    expect(await screen.findByRole('heading', { name: /set a new password/i })).toBeInTheDocument();
  });

  it('outranks the onboarding gate', async () => {
    signedIn({ needsOnboarding: true, isPasswordRecovery: true });
    await renderAt('/dashboard');

    expect(await screen.findByRole('heading', { name: /set a new password/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /set up your profile/i })).not.toBeInTheDocument();
  });
});
