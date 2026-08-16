import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { makeApplication, makeUser, localDate } from '../test/factories';
import type { Application, ApplicationInput, ApplicationUpdate, UserSession } from '../types';

/**
 * Client-side data-flow tests for ApplicationsContext.
 *
 * dataService is mocked — that is the boundary to Supabase, and nothing here
 * touches the network or the live project. The context's own logic (fetching,
 * caching, refresh-after-write, clearing on sign-out) runs for real.
 *
 * Note the deliberate limit of scope: this context is a client cache, not an
 * authorization layer. Row Level Security remains the authoritative boundary,
 * and the test below named "cannot expose another user's application" asserts
 * only that the client never invents data it was not given.
 */

const mocks = vi.hoisted(() => ({
  auth: { user: null as UserSession | null, needsOnboarding: false },
  data: {
    getApplications: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    deleteApplication: vi.fn()
  }
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => mocks.auth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../lib/dataService', () => ({ dataService: mocks.data }));

import { ApplicationsProvider, useApplications } from './ApplicationsContext';

/** Surfaces context state as text, and exposes actions as buttons. */
const Harness: React.FC<{
  onCreate?: ApplicationInput;
  onUpdate?: { id: string; updates: ApplicationUpdate };
  onDelete?: string;
  lookupId?: string;
}> = ({ onCreate, onUpdate, onDelete, lookupId }) => {
  const ctx = useApplications();
  const [actionError, setActionError] = React.useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setActionError('');
    try {
      await fn();
    } catch (err: any) {
      setActionError(err?.message ?? 'unknown error');
    }
  };

  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="loaded">{String(ctx.loaded)}</span>
      <span data-testid="error">{ctx.error ?? ''}</span>
      <span data-testid="count">{ctx.applications.length}</span>
      <span data-testid="titles">{ctx.applications.map(a => a.job_title).join('|')}</span>
      <span data-testid="lookup">{lookupId ? String(ctx.getById(lookupId)?.job_title ?? 'undefined') : ''}</span>
      <span data-testid="action-error">{actionError}</span>

      <button onClick={() => run(() => ctx.createApplication(onCreate as ApplicationInput))}>create</button>
      <button onClick={() => run(() => ctx.updateApplication(onUpdate!.id, onUpdate!.updates))}>update</button>
      <button onClick={() => run(() => ctx.removeApplication(onDelete as string))}>delete</button>
      <button onClick={() => run(() => ctx.refresh())}>refresh</button>
    </div>
  );
};

const renderProvider = (props: React.ComponentProps<typeof Harness> = {}) =>
  render(
    <ApplicationsProvider>
      <Harness {...props} />
    </ApplicationsProvider>
  );

const click = async (name: string) => {
  await act(async () => {
    screen.getByRole('button', { name }).click();
  });
};

beforeEach(() => {
  mocks.auth.user = makeUser();
  mocks.auth.needsOnboarding = false;
  mocks.data.getApplications.mockResolvedValue([]);
  mocks.data.createApplication.mockReset();
  mocks.data.updateApplication.mockReset();
  mocks.data.deleteApplication.mockReset();
});

describe('loading applications', () => {
  it('loads the signed-in user\'s applications into context', async () => {
    mocks.data.getApplications.mockResolvedValue([
      makeApplication({ id: 'a1', job_title: 'Engineer' }),
      makeApplication({ id: 'a2', job_title: 'Designer' })
    ]);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
    expect(screen.getByTestId('titles')).toHaveTextContent('Engineer|Designer');
    expect(mocks.data.getApplications).toHaveBeenCalledWith('user-1');
  });

  it('reports loading while the fetch is in flight, then settles', async () => {
    let resolveLoad: (apps: Application[]) => void = () => {};
    mocks.data.getApplications.mockReturnValue(new Promise(res => { resolveLoad = res; }));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('true'));
    // `loaded` stays false so consumers do not render "not found" prematurely.
    expect(screen.getByTestId('loaded')).toHaveTextContent('false');

    await act(async () => { resolveLoad([makeApplication({ id: 'a1' })]); });

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('loaded')).toHaveTextContent('true');
  });

  it('does not fetch while onboarding is still incomplete', async () => {
    mocks.auth.needsOnboarding = true;
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(mocks.data.getApplications).not.toHaveBeenCalled();
  });

  it('does not fetch when there is no session', async () => {
    mocks.auth.user = null;
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(mocks.data.getApplications).not.toHaveBeenCalled();
  });

  it('surfaces a fetch failure as an error state rather than an empty list', async () => {
    mocks.data.getApplications.mockRejectedValue(new Error('Network unreachable'));
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Network unreachable'));
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('clears a previous error on a successful refresh', async () => {
    mocks.data.getApplications.mockRejectedValueOnce(new Error('Temporary blip'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Temporary blip'));

    mocks.data.getApplications.mockResolvedValue([makeApplication({ id: 'a1' })]);
    await click('refresh');

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(''));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

describe('creating an application', () => {
  it('adds the created application to local state', async () => {
    const created = makeApplication({ id: 'new-1', job_title: 'Created Role' });
    mocks.data.createApplication.mockResolvedValue(created);
    mocks.data.getApplications.mockResolvedValueOnce([]).mockResolvedValue([created]);

    renderProvider({ onCreate: { company_name: 'Globex', job_title: 'Created Role' } as ApplicationInput });
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));

    await click('create');

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(screen.getByTestId('titles')).toHaveTextContent('Created Role');
  });

  it('passes metadata through to the data layer unchanged', async () => {
    const input: ApplicationInput = {
      company_name: 'Globex',
      job_title: 'Metadata Role',
      job_type: 'Full-time',
      status: 'Applied',
      application_date: localDate(-3),
      priority: 'High',
      source: 'Referral',
      tags: ['Remote', 'Dream Job'],
      follow_up_date: localDate(4),
      follow_up_note: 'Chase Sarah'
    } as ApplicationInput;

    mocks.data.createApplication.mockResolvedValue(makeApplication({ id: 'new-1' }));
    renderProvider({ onCreate: input });
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));

    await click('create');

    await waitFor(() => expect(mocks.data.createApplication).toHaveBeenCalled());
    const [userId, payload] = mocks.data.createApplication.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(payload.priority).toBe('High');
    expect(payload.source).toBe('Referral');
    expect(payload.tags).toEqual(['Remote', 'Dream Job']);
    expect(payload.follow_up_date).toBe(localDate(4));
    expect(payload.follow_up_note).toBe('Chase Sarah');
  });

  it('surfaces a create failure to the caller', async () => {
    mocks.data.createApplication.mockRejectedValue(new Error('Insert rejected'));
    renderProvider({ onCreate: { company_name: 'X', job_title: 'Y' } as ApplicationInput });
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));

    await click('create');

    await waitFor(() => expect(screen.getByTestId('action-error')).toHaveTextContent('Insert rejected'));
  });

  it('refuses to create without a session', async () => {
    mocks.auth.user = null;
    renderProvider({ onCreate: { company_name: 'X', job_title: 'Y' } as ApplicationInput });

    await click('create');

    await waitFor(() =>
      expect(screen.getByTestId('action-error')).toHaveTextContent(/signed in/i));
    expect(mocks.data.createApplication).not.toHaveBeenCalled();
  });
});

describe('updating an application', () => {
  it('reflects the updated application in local state', async () => {
    const before = makeApplication({ id: 'a1', job_title: 'Before' });
    const after = makeApplication({ id: 'a1', job_title: 'After' });
    mocks.data.getApplications.mockResolvedValueOnce([before]).mockResolvedValue([after]);
    mocks.data.updateApplication.mockResolvedValue(after);

    renderProvider({ onUpdate: { id: 'a1', updates: { job_title: 'After' } } });
    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('Before'));

    await click('update');

    await waitFor(() => expect(screen.getByTestId('titles')).toHaveTextContent('After'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('passes nullable metadata through as null so it can be cleared', async () => {
    // null clears the column; '' would violate the source CHECK constraint and
    // is not a valid DATE. The context must not coerce one into the other.
    const app = makeApplication({ id: 'a1', source: 'LinkedIn', follow_up_date: localDate(2) });
    mocks.data.getApplications.mockResolvedValue([app]);
    mocks.data.updateApplication.mockResolvedValue(
      makeApplication({ id: 'a1', source: null, follow_up_date: null })
    );

    renderProvider({
      onUpdate: { id: 'a1', updates: { source: null, follow_up_date: null, follow_up_note: null } }
    });
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));

    await click('update');

    await waitFor(() => expect(mocks.data.updateApplication).toHaveBeenCalled());
    const [, , updates] = mocks.data.updateApplication.mock.calls[0];
    expect(updates.source).toBeNull();
    expect(updates.follow_up_date).toBeNull();
    expect(updates.follow_up_note).toBeNull();
    expect(updates.source).not.toBe('');
    expect(updates.follow_up_date).not.toBe('');
  });

  it('surfaces an update failure to the caller', async () => {
    mocks.data.getApplications.mockResolvedValue([makeApplication({ id: 'a1' })]);
    mocks.data.updateApplication.mockRejectedValue(new Error('Update rejected'));

    renderProvider({ onUpdate: { id: 'a1', updates: { job_title: 'X' } } });
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));

    await click('update');

    await waitFor(() => expect(screen.getByTestId('action-error')).toHaveTextContent('Update rejected'));
  });
});

describe('deleting an application', () => {
  it('removes the application from local state', async () => {
    const a1 = makeApplication({ id: 'a1', job_title: 'Doomed' });
    const a2 = makeApplication({ id: 'a2', job_title: 'Survivor' });
    mocks.data.getApplications.mockResolvedValueOnce([a1, a2]).mockResolvedValue([a2]);
    mocks.data.deleteApplication.mockResolvedValue(undefined);

    renderProvider({ onDelete: 'a1' });
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));

    await click('delete');

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(screen.getByTestId('titles')).toHaveTextContent('Survivor');
    expect(mocks.data.deleteApplication).toHaveBeenCalledWith('user-1', 'a1');
  });

  it('surfaces a delete failure to the caller', async () => {
    mocks.data.getApplications.mockResolvedValue([makeApplication({ id: 'a1' })]);
    mocks.data.deleteApplication.mockRejectedValue(new Error('Delete rejected'));

    renderProvider({ onDelete: 'a1' });
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));

    await click('delete');

    await waitFor(() => expect(screen.getByTestId('action-error')).toHaveTextContent('Delete rejected'));
    // The row is still present because the delete did not happen.
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

describe('sign-out', () => {
  it('clears cached applications when the session ends', async () => {
    mocks.data.getApplications.mockResolvedValue([makeApplication({ id: 'a1' })]);
    const { rerender } = render(
      <ApplicationsProvider><Harness /></ApplicationsProvider>
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    // Simulate sign-out: the auth context reports no user on the next render.
    mocks.auth.user = null;
    rerender(<ApplicationsProvider><Harness /></ApplicationsProvider>);

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(screen.getByTestId('loaded')).toHaveTextContent('false');
  });
});

describe('detail lookup scoping', () => {
  it('resolves an application the user actually has', async () => {
    mocks.data.getApplications.mockResolvedValue([
      makeApplication({ id: 'mine', job_title: 'My Role' })
    ]);
    renderProvider({ lookupId: 'mine' });

    await waitFor(() => expect(screen.getByTestId('lookup')).toHaveTextContent('My Role'));
  });

  it('returns undefined for an id that was never loaded', async () => {
    // The client can only resolve ids present in what the server returned, and
    // the server only returns rows RLS allows. This asserts the client does not
    // fabricate a result — it is not itself the security boundary.
    mocks.data.getApplications.mockResolvedValue([makeApplication({ id: 'mine' })]);
    renderProvider({ lookupId: 'someone-elses-id' });

    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));
    expect(screen.getByTestId('lookup')).toHaveTextContent('undefined');
  });

  it('scopes every read and write to the signed-in user id', async () => {
    mocks.data.getApplications.mockResolvedValue([makeApplication({ id: 'a1' })]);
    mocks.data.updateApplication.mockResolvedValue(makeApplication({ id: 'a1' }));

    renderProvider({ onUpdate: { id: 'a1', updates: { job_title: 'X' } } });
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));
    await click('update');

    await waitFor(() => expect(mocks.data.updateApplication).toHaveBeenCalled());
    expect(mocks.data.getApplications).toHaveBeenCalledWith('user-1');
    expect(mocks.data.updateApplication.mock.calls[0][0]).toBe('user-1');
  });
});

describe('metadata round-trip', () => {
  it('preserves every metadata field returned by the data layer', async () => {
    const rich = makeApplication({
      id: 'a1',
      job_title: 'Rich Role',
      priority: 'High',
      source: 'University',
      tags: ['Graduate Program', 'Relocation'],
      follow_up_date: localDate(6),
      follow_up_note: 'Email the careers office'
    });
    mocks.data.getApplications.mockResolvedValue([rich]);

    const Probe: React.FC = () => {
      const { getById } = useApplications();
      const app = getById('a1');
      return <span data-testid="probe">{JSON.stringify(app ?? null)}</span>;
    };

    render(<ApplicationsProvider><Probe /></ApplicationsProvider>);

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toContain('Rich Role'));
    const parsed = JSON.parse(screen.getByTestId('probe').textContent as string);
    expect(parsed.priority).toBe('High');
    expect(parsed.source).toBe('University');
    expect(parsed.tags).toEqual(['Graduate Program', 'Relocation']);
    expect(parsed.follow_up_date).toBe(localDate(6));
    expect(parsed.follow_up_note).toBe('Email the careers office');
  });
});
