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
  created_at: string;
  updated_at: string;
}

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

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  professional_title?: string;
  location?: string;
  phone?: string;
  linkedin_url?: string;
  avatar_url?: string;
  theme_preference?: ThemeMode;
  created_at: string;
  updated_at: string;
  onboarding_completed?: boolean;
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

export type SortOption = 'newest' | 'oldest' | 'recently_updated' | 'company';

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
