/**
 * Translates database errors into sentences a user can act on.
 *
 * Supabase surfaces PostgREST/PostgreSQL errors verbatim, so without this a
 * failed save shows things like:
 *
 *   new row for relation "applications" violates check constraint
 *   "applications_priority_check"
 *
 * Constraint names are not secrets, but they are implementation detail and
 * mean nothing to the person trying to save a job application. Client-side
 * validation already catches the common cases first; this is the safety net for
 * anything that reaches the database anyway.
 *
 * In development the original message is appended so debugging is unaffected.
 * Nothing here ever surfaces SQL, stack traces, tokens or connection details.
 */

interface DatabaseErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

/** Constraint name -> message. Mirrors migrations 0001, 0002 and 0003. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  applications_priority_check:
    'Priority must be Low, Medium or High.',
  applications_source_check:
    'That source is not one of the supported options.',
  applications_status_check:
    'That status is not one of the supported options.',
  applications_job_type_check:
    'That job type is not one of the supported options.',
  // Retained: the deprecated salary_min/salary_max pair still exists and is
  // still constrained, even though the current form no longer writes it.
  applications_salary_range_check:
    'Maximum salary cannot be lower than minimum salary.',
  applications_salary_amount_check:
    'Salary cannot be negative.',
  applications_salary_currency_check:
    'That currency is not one of the supported options.',
  applications_salary_period_check:
    'Salary period must be per year or per month.',
  applications_salary_amount_is_labelled_check:
    'Choose a currency and a payment period for this salary.',
  applications_deadline_after_application_date_check:
    'Deadline cannot be earlier than the application date.',
  applications_follow_up_after_application_date_check:
    'Follow-up date cannot be earlier than the application date.',
  applications_company_name_check:
    'Company name cannot be empty.',
  applications_job_title_check:
    'Job title cannot be empty.',
  application_status_history_new_status_check:
    'That status is not one of the supported options.',
  profiles_theme_preference_check:
    'Theme must be Light, Dark or System.',
  notification_preferences_user_id_key:
    'Your notification preferences already exist.'
};

/** SQLSTATE -> message, for errors with no recognisable constraint name. */
const CODE_MESSAGES: Record<string, string> = {
  '23514': 'Some of the values entered are not valid. Please review the form and try again.',
  '23505': 'That record already exists.',
  '23503': 'A related record is missing, so this could not be saved.',
  '23502': 'A required field was left empty.',
  '22P02': 'One of the values is in an unexpected format.',
  '42501': 'You do not have permission to do that.',
  '42P01': 'JobTrack could not reach part of its database. Please try again shortly.',
  PGRST116: 'That record could not be found.',
  '23P01': 'That change conflicts with an existing record.'
};

const GENERIC = 'Something went wrong while saving. Please try again.';

/**
 * Produces a user-facing sentence for a database error.
 *
 * `fallback` is used when the error is not recognisably a database error —
 * typically a network failure, whose own message is already readable.
 */
export const friendlyDatabaseError = (
  error: unknown,
  fallback: string = GENERIC
): string => {
  const err = (error ?? {}) as DatabaseErrorLike;
  const raw = typeof err.message === 'string' ? err.message : '';
  const haystack = `${raw} ${err.details ?? ''}`.toLowerCase();

  let friendly: string | null = null;

  // A named constraint is the most precise signal available.
  for (const [constraint, message] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (haystack.includes(constraint)) {
      friendly = message;
      break;
    }
  }

  if (!friendly && err.code && CODE_MESSAGES[err.code]) {
    friendly = CODE_MESSAGES[err.code];
  }

  // Not a database error we recognise. A network failure's own message is
  // already meaningful, so prefer it over a generic sentence.
  if (!friendly) {
    if (/fetch|network|timeout|offline/i.test(raw)) return raw;
    friendly = raw && !looksInternal(raw) ? raw : fallback;
  }

  if (import.meta.env.DEV && raw && raw !== friendly) {
    return `${friendly} [dev: ${raw}]`;
  }
  return friendly;
};

/**
 * True when a message reads like database internals rather than something a
 * user should see.
 */
const looksInternal = (message: string): boolean =>
  /violates|constraint|relation |column |syntax error|duplicate key|permission denied for|null value in/i
    .test(message);

/**
 * Sanitises an authentication error for display.
 *
 * Two concerns beyond readability:
 *
 *  1. Account enumeration. When email confirmation is disabled, Supabase
 *     answers a duplicate sign-up with "User already registered", which
 *     confirms that an address has an account. That is rewritten to a neutral
 *     sentence which is still actionable. (With confirmation enabled Supabase
 *     obfuscates this itself, returning a normal success shape — another
 *     reason the checklist recommends enabling it.)
 *  2. Internal detail. Anything resembling database or infrastructure output is
 *     replaced rather than shown.
 */
export const friendlyAuthError = (
  error: unknown,
  fallback = 'We could not complete that request. Please try again.'
): string => {
  const raw = typeof (error as { message?: string })?.message === 'string'
    ? (error as { message: string }).message
    : '';

  if (!raw) return fallback;

  if (/already registered|already exists|user already/i.test(raw)) {
    return 'We could not create an account with those details. If you already ' +
      'have an account, try logging in or resetting your password.';
  }

  if (looksInternal(raw)) return fallback;

  return raw;
};
