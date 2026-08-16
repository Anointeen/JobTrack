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

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  location?: string;
  job_type: JobType;
  job_posting_url?: string;
  salary_min?: number;
  salary_max?: number;
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
