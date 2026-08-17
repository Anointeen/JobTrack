export type ApplicationStatus = 
  | 'Saved'
  | 'Applied'
  | 'Assessment'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export type JobType = 
  | 'Full-time'
  | 'Part-time'
  | 'Contract'
  | 'Internship'
  | 'Graduate Program'
  | 'Temporary'
  | 'Freelance'
  | 'Other';

/**
 * Mirrors applications_priority_check in migration 0002.
 * The database column is NOT NULL DEFAULT 'Medium'.
 */
export type ApplicationPriority = 'Low' | 'Medium' | 'High';

export const APPLICATION_PRIORITIES: readonly ApplicationPriority[] = [
  'Low', 'Medium', 'High'
] as const;

/**
 * Mirrors applications_source_check in migration 0002.
 * The database column is nullable — source is optional.
 */
export type ApplicationSource =
  | 'LinkedIn'
  | 'Company Website'
  | 'Indeed'
  | 'Job Board'
  | 'Referral'
  | 'Recruiter'
  | 'University'
  | 'Other';

export const APPLICATION_SOURCES: readonly ApplicationSource[] = [
  'LinkedIn', 'Company Website', 'Indeed', 'Job Board',
  'Referral', 'Recruiter', 'University', 'Other'
] as const;

/**
 * How often a salary is paid. Mirrors applications_salary_period_check in
 * migration 0003.
 */
export type SalaryPeriod = 'year' | 'month';

export const SALARY_PERIODS: readonly { value: SalaryPeriod; label: string }[] = [
  { value: 'year', label: 'Per year' },
  { value: 'month', label: 'Per month' }
] as const;

/**
 * ISO 4217's code for "no currency specified". It backs the picker's *Other*
 * option, so a user whose currency is not listed can still record an amount
 * honestly instead of misfiling it under a currency they do not mean.
 */
export const OTHER_CURRENCY_CODE = 'XXX';

/**
 * Currencies offered by the salary picker.
 *
 * The database checks the *shape* of the code (three uppercase letters), not
 * membership of this list, so extending it needs no migration. There is
 * deliberately no default beyond the first entry: assuming USD is precisely the
 * behaviour migration 0003 exists to remove.
 */
export const SALARY_CURRENCIES: readonly { code: string; label: string }[] = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: OTHER_CURRENCY_CODE, label: 'Other / not listed' }
] as const;

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  location?: string;
  job_type: JobType;
  job_posting_url?: string;
  /**
   * @deprecated Superseded by salary_amount/currency/period in migration 0003.
   * Retained so applications saved before that change still display their
   * salary. The form never writes these; it clears them when the user saves.
   */
  salary_min?: number | null;
  /** @deprecated See salary_min. */
  salary_max?: number | null;
  status: ApplicationStatus;
  application_date: string; // ISO Date YYYY-MM-DD
  deadline?: string; // ISO Date YYYY-MM-DD
  recruiter_name?: string;
  recruiter_email?: string;
  notes?: string;

  // --- Metadata added in migration 0002 ---
  /** NOT NULL in the database, so always present on a row read back. */
  priority: ApplicationPriority;
  source?: ApplicationSource | null;
  /** NOT NULL DEFAULT '{}' — always an array, never null, on a row read back. */
  tags: string[];
  /** ISO Date YYYY-MM-DD. Must not predate application_date. */
  follow_up_date?: string | null;
  follow_up_note?: string | null;

  // --- Salary added in migration 0003 ---
  /**
   * The salary figure, expressed in `salary_currency` and paid every
   * `salary_period`. Optional: plenty of applications never list a salary.
   * When it is set, both of the other two are set — the database enforces it.
   */
  salary_amount?: number | null;
  /** ISO 4217 code, or 'XXX' for a currency outside the offered list. */
  salary_currency?: string | null;
  salary_period?: SalaryPeriod | null;

  created_at: string;
  updated_at: string;
}

/**
 * Payload accepted when creating an application.
 *
 * `priority` and `tags` are optional here even though they are NOT NULL on the
 * row: omitting them lets the database defaults ('Medium' and '{}') apply,
 * which is exactly what should happen for a caller that does not set them.
 */
export type ApplicationInput =
  Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'priority' | 'tags'> & {
    priority?: ApplicationPriority;
    tags?: string[];
  };

/** Payload accepted when updating an application. Every field is optional. */
export type ApplicationUpdate = Partial<Omit<Application, 'id' | 'user_id' | 'created_at'>>;

export interface ApplicationStatusHistory {
  id: string;
  application_id: string;
  user_id: string;
  previous_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  note?: string;
  created_at: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * A user's profile.
 *
 * `id` IS the authenticated user's UUID (profiles.id references auth.users.id).
 * There is deliberately no separate `user_id` column: a second owner field
 * allowed a user to insert a row under another user's primary key, so the two
 * were collapsed into this single authoritative key in migration 0001.
 */
export interface UserProfile {
  id: string;
  full_name: string;
  professional_title?: string;
  location?: string;
  phone?: string;
  linkedin_url?: string;
  avatar_url?: string;
  theme_preference: ThemeMode;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  deadline_reminders: boolean;
  interview_reminders: boolean;
  follow_up_reminders: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSession {
  id: string;
  email: string;
  email_verified?: boolean;
}

/**
 * Result of a successful sign-up.
 *
 * Supabase returns a session only when the project does not require email
 * confirmation. Both outcomes are successes and must be reported as such — the
 * confirmation case used to be thrown as an Error, which surfaced a success
 * message inside the modal's red error banner.
 */
export type SignUpOutcome =
  | { status: 'active_session' }
  | { status: 'confirmation_required'; email: string };

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'recently_updated'
  | 'deadline'
  | 'priority'
  | 'company';

export interface ApplicationFilterOptions {
  searchQuery: string;
  statusFilter: ApplicationStatus | 'All';
  sortBy: SortOption;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}
