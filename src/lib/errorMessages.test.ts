import { describe, it, expect } from 'vitest';
import { friendlyDatabaseError, friendlyAuthError } from './errorMessages';

/**
 * These run with import.meta.env.DEV true, so the translated sentence is
 * followed by a "[dev: …]" suffix carrying the original message. Assertions use
 * `toContain` for that reason, plus an explicit check that the suffix exists —
 * losing diagnostics in development would be its own regression.
 */

describe('constraint translation', () => {
  it('translates the priority check', () => {
    const msg = friendlyDatabaseError({
      code: '23514',
      message: 'new row for relation "applications" violates check constraint "applications_priority_check"'
    });
    expect(msg).toContain('Priority must be Low, Medium or High.');
  });

  it('translates the source check', () => {
    const msg = friendlyDatabaseError({
      code: '23514',
      message: 'violates check constraint "applications_source_check"'
    });
    expect(msg).toContain('not one of the supported options');
  });

  it('translates the follow-up date check', () => {
    const msg = friendlyDatabaseError({
      code: '23514',
      message: 'violates check constraint "applications_follow_up_after_application_date_check"'
    });
    expect(msg).toContain('Follow-up date cannot be earlier than the application date.');
  });

  it('translates the deadline check', () => {
    const msg = friendlyDatabaseError({
      code: '23514',
      message: 'violates check constraint "applications_deadline_after_application_date_check"'
    });
    expect(msg).toContain('Deadline cannot be earlier than the application date.');
  });

  it('translates the salary range check', () => {
    const msg = friendlyDatabaseError({
      code: '23514',
      message: 'violates check constraint "applications_salary_range_check"'
    });
    expect(msg).toContain('Maximum salary cannot be lower than minimum salary.');
  });

  it('prefers the constraint message over the generic code message', () => {
    const msg = friendlyDatabaseError({
      code: '23514',
      message: 'violates check constraint "applications_priority_check"'
    });
    expect(msg).toContain('Priority must be');
    expect(msg).not.toMatch(/^Some of the values entered/);
  });
});

describe('SQLSTATE translation', () => {
  it('translates a permission denial without naming the table', () => {
    const msg = friendlyDatabaseError({ code: '42501', message: 'permission denied for table applications' });
    expect(msg).toContain('You do not have permission to do that.');
  });

  it('translates a unique violation', () => {
    const msg = friendlyDatabaseError({ code: '23505', message: 'duplicate key value violates unique constraint "some_idx"' });
    expect(msg).toContain('That record already exists.');
  });

  it('translates a not-null violation', () => {
    const msg = friendlyDatabaseError({ code: '23502', message: 'null value in column "tags" violates not-null constraint' });
    expect(msg).toContain('A required field was left empty.');
  });

  it('translates a missing row', () => {
    const msg = friendlyDatabaseError({ code: 'PGRST116', message: 'The result contains 0 rows' });
    expect(msg).toContain('That record could not be found.');
  });

  it('translates an unrecognised check constraint generically', () => {
    const msg = friendlyDatabaseError({ code: '23514', message: 'violates check constraint "some_future_check"' });
    expect(msg).toContain('Some of the values entered are not valid.');
  });
});

describe('non-database errors', () => {
  it('passes a network failure through, since its own wording is useful', () => {
    const msg = friendlyDatabaseError({ message: 'Failed to fetch' });
    expect(msg).toBe('Failed to fetch');
  });

  it('falls back to the supplied message when the error is unrecognisable', () => {
    const msg = friendlyDatabaseError({}, 'Your applications could not be loaded.');
    expect(msg).toBe('Your applications could not be loaded.');
  });

  it('falls back for null and undefined', () => {
    expect(friendlyDatabaseError(null, 'fallback text')).toBe('fallback text');
    expect(friendlyDatabaseError(undefined, 'fallback text')).toBe('fallback text');
  });

  it('keeps a plain readable message that is not database internals', () => {
    const msg = friendlyDatabaseError({ message: 'You must be signed in to add an application.' });
    expect(msg).toContain('You must be signed in');
  });
});

describe('authentication errors', () => {
  it('does not confirm that an address is already registered', () => {
    // Supabase answers a duplicate sign-up with "User already registered" when
    // email confirmation is disabled, which is an account-enumeration oracle.
    for (const raw of ['User already registered', 'A user with this email already exists']) {
      const msg = friendlyAuthError({ message: raw });
      expect(msg).not.toMatch(/already registered|already exists/i);
      expect(msg).toMatch(/could not create an account/i);
      // Still actionable.
      expect(msg).toMatch(/logging in|resetting your password/i);
    }
  });

  it('passes through ordinary auth messages unchanged', () => {
    expect(friendlyAuthError({ message: 'Invalid login credentials' }))
      .toBe('Invalid login credentials');
    expect(friendlyAuthError({ message: 'Password should be at least 6 characters' }))
      .toBe('Password should be at least 6 characters');
  });

  it('replaces anything resembling internals', () => {
    const msg = friendlyAuthError({
      message: 'null value in column "email" of relation "users" violates not-null constraint'
    });
    expect(msg).not.toMatch(/relation |violates|constraint|null value/i);
  });

  it('falls back when there is no message at all', () => {
    expect(friendlyAuthError({})).toMatch(/could not complete that request/i);
    expect(friendlyAuthError(null)).toMatch(/could not complete that request/i);
    expect(friendlyAuthError(undefined, 'custom fallback')).toBe('custom fallback');
  });
});

describe('leakage guards', () => {
  const internals = [
    { code: '23514', message: 'new row for relation "applications" violates check constraint "applications_priority_check"' },
    { code: '42501', message: 'permission denied for table applications' },
    { code: '23502', message: 'null value in column "tags" of relation "applications" violates not-null constraint' }
  ];

  it('never surfaces raw internals as the leading sentence', () => {
    for (const err of internals) {
      const msg = friendlyDatabaseError(err);
      const leading = msg.split('[dev:')[0];
      expect(leading).not.toMatch(/violates|constraint|relation |null value in|permission denied for/i);
    }
  });

  it('retains the original message for developers', () => {
    // Diagnostics must survive in development; only production hides them.
    const msg = friendlyDatabaseError(internals[0]);
    expect(msg).toContain('[dev:');
    expect(msg).toContain('applications_priority_check');
  });

  it('never emits SQL, tokens or connection strings', () => {
    const msg = friendlyDatabaseError({
      code: '42601',
      message: 'syntax error at or near "SELECT" postgres://user:pw@host:5432/db'
    });
    const leading = msg.split('[dev:')[0];
    expect(leading).not.toMatch(/select|postgres:\/\/|syntax error/i);
  });
});
