import {
  Application,
  ApplicationInput,
  ApplicationUpdate,
  ApplicationStatus,
  ApplicationStatusHistory,
  UserProfile,
  NotificationPreferences
} from '../types';
import { supabase, isSupabaseConfigured, isDemoMode } from './supabase';
import { friendlyDatabaseError } from './errorMessages';

const STORAGE_KEYS = {
  APPLICATIONS: 'jobtrack_applications_',
  HISTORY: 'jobtrack_status_history_',
  PROFILE: 'jobtrack_profile_',
  NOTIFICATIONS: 'jobtrack_notifications_'
};

/**
 * Guards every localStorage code path below.
 *
 * The localStorage store is a development convenience only. Previously these
 * paths ran whenever Supabase happened to be unconfigured, which meant a
 * misconfigured deployment would silently serve seeded demo data. Demo mode is
 * now development-only, so reaching one of these paths anywhere else is a bug
 * and must fail loudly rather than fabricate data.
 */
const assertDemoMode = (operation: string): void => {
  if (!isDemoMode) {
    throw new Error(
      `Cannot ${operation}: Supabase is not configured, and the local demo store is ` +
        `available in development only.`
    );
  }
};

// Seed realistic sample applications for demo user
const getInitialSeedApplications = (userId: string): Application[] => {
  const now = new Date();
  const daysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'app-seed-1',
      user_id: userId,
      company_name: 'Stripe',
      job_title: 'Senior Frontend Engineer',
      location: 'San Francisco, CA (Remote)',
      job_type: 'Full-time',
      job_posting_url: 'https://stripe.com/jobs/senior-frontend-engineer',
      salary_amount: 185000,
      salary_currency: 'USD',
      salary_period: 'year',
      status: 'Interview',
      application_date: daysAgo(14),
      deadline: daysAgo(-7),
      recruiter_name: 'Sarah Jenkins',
      recruiter_email: 'sjenkin@stripe.com',
      notes: 'Passed initial recruiter screening and technical assessment. Technical panel scheduled for next Tuesday.',
      priority: 'High',
      source: 'LinkedIn',
      tags: ['Dream Job', 'Remote'],
      created_at: daysAgo(14) + 'T10:00:00Z',
      updated_at: daysAgo(2) + 'T14:30:00Z'
    },
    {
      id: 'app-seed-2',
      user_id: userId,
      company_name: 'Airbnb',
      job_title: 'Full Stack Engineer - Host Platform',
      location: 'Seattle, WA (Hybrid)',
      job_type: 'Full-time',
      job_posting_url: 'https://careers.airbnb.com/positions/full-stack-engineer',
      salary_amount: 95000,
      salary_currency: 'GBP',
      salary_period: 'year',
      status: 'Offer',
      application_date: daysAgo(28),
      deadline: daysAgo(-3),
      recruiter_name: 'Marcus Vance',
      recruiter_email: 'marcus.v@airbnb.com',
      notes: 'Offer letter received! Base salary $175k + Equity & Sign-on bonus. Reviewing compensation package.',
      priority: 'High',
      source: 'Referral',
      tags: ['Relocation'],
      created_at: daysAgo(28) + 'T09:15:00Z',
      updated_at: daysAgo(1) + 'T16:00:00Z'
    },
    {
      id: 'app-seed-3',
      user_id: userId,
      company_name: 'Vercel',
      job_title: 'React Core Developer',
      location: 'Remote',
      job_type: 'Contract',
      job_posting_url: 'https://vercel.com/careers/react-core',
      salary_amount: 160000,
      salary_currency: 'USD',
      salary_period: 'year',
      status: 'Assessment',
      application_date: daysAgo(7),
      deadline: daysAgo(-2),
      recruiter_name: 'Alex Rivera',
      recruiter_email: 'arivera@vercel.com',
      notes: 'Completed take-home project building a server-driven UI dashboard.',
      priority: 'Medium',
      source: 'Company Website',
      tags: ['Remote', 'Contract'],
      created_at: daysAgo(7) + 'T11:45:00Z',
      updated_at: daysAgo(3) + 'T12:00:00Z'
    },
    {
      id: 'app-seed-4',
      user_id: userId,
      company_name: 'Spotify',
      job_title: 'Software Engineer II - Web Experience',
      location: 'New York, NY (Hybrid)',
      job_type: 'Full-time',
      job_posting_url: 'https://spotifyjobs.com/web-engineer',
      salary_amount: 950000,
      salary_currency: 'NGN',
      salary_period: 'month',
      status: 'Applied',
      application_date: daysAgo(5),
      deadline: daysAgo(-10),
      recruiter_name: 'Elena Rostova',
      recruiter_email: 'elena.r@spotify.com',
      notes: 'Applied via company portal with tailored cover letter highlighting audio processing experience.',
      priority: 'Medium',
      source: 'Indeed',
      tags: ['Hybrid'],
      follow_up_date: daysAgo(-3),
      follow_up_note: 'Chase the recruiter if there is no reply by then.',
      created_at: daysAgo(5) + 'T15:20:00Z',
      updated_at: daysAgo(5) + 'T15:20:00Z'
    },
    {
      id: 'app-seed-5',
      user_id: userId,
      company_name: 'Linear',
      job_title: 'Product Engineer',
      location: 'Remote (US/EU)',
      job_type: 'Full-time',
      job_posting_url: 'https://linear.app/careers/product-engineer',
      salary_amount: 195000,
      salary_currency: 'USD',
      salary_period: 'year',
      status: 'Saved',
      application_date: daysAgo(1),
      deadline: daysAgo(-14),
      recruiter_name: '',
      recruiter_email: '',
      notes: 'Discovered via Twitter. Need to customize resume focusing on high-performance web apps before submitting.',
      priority: 'High',
      source: 'Other',
      tags: ['Dream Job', 'Remote'],
      created_at: daysAgo(1) + 'T18:00:00Z',
      updated_at: daysAgo(1) + 'T18:00:00Z'
    },
    {
      id: 'app-seed-6',
      user_id: userId,
      company_name: 'Datadog',
      job_title: 'Frontend Platform Engineer',
      location: 'Boston, MA',
      job_type: 'Full-time',
      salary_amount: 88000,
      salary_currency: 'EUR',
      salary_period: 'year',
      status: 'Rejected',
      application_date: daysAgo(35),
      deadline: daysAgo(20),
      notes: 'Received polite rejection email after final interview stage.',
      priority: 'Low',
      source: 'Job Board',
      tags: [],
      created_at: daysAgo(35) + 'T08:00:00Z',
      updated_at: daysAgo(10) + 'T11:00:00Z'
    }
  ];
};

const getInitialSeedHistory = (userId: string): ApplicationStatusHistory[] => {
  const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  return [
    {
      id: 'hist-1',
      application_id: 'app-seed-1',
      user_id: userId,
      previous_status: 'Applied',
      new_status: 'Assessment',
      note: 'Invited to complete online coding assessment.',
      created_at: daysAgo(10)
    },
    {
      id: 'hist-2',
      application_id: 'app-seed-1',
      user_id: userId,
      previous_status: 'Assessment',
      new_status: 'Interview',
      note: 'Passed assessment, scheduled technical phone call.',
      created_at: daysAgo(2)
    },
    {
      id: 'hist-3',
      application_id: 'app-seed-2',
      user_id: userId,
      previous_status: 'Applied',
      new_status: 'Interview',
      note: 'Recruiter call completed, moved to onsite loop.',
      created_at: daysAgo(15)
    },
    {
      id: 'hist-4',
      application_id: 'app-seed-2',
      user_id: userId,
      previous_status: 'Interview',
      new_status: 'Offer',
      note: 'Received formal job offer!',
      created_at: daysAgo(1)
    }
  ];
};

export const dataService = {
  // --- APPLICATIONS ---
  async getApplications(userId: string): Promise<Application[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch applications error:', error);
        throw new Error(friendlyDatabaseError(error, 'Your applications could not be loaded. Please try again.'));
      }
      return data as Application[];
    }

    // Development-only local store
    assertDemoMode('load applications');
    const key = STORAGE_KEYS.APPLICATIONS + userId;
    const stored = localStorage.getItem(key);
    if (!stored) {
      const initial = getInitialSeedApplications(userId);
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  async getApplicationById(id: string, userId: string): Promise<Application | null> {
    const apps = await this.getApplications(userId);
    return apps.find(a => a.id === id) || null;
  },

  async createApplication(
    userId: string, 
    appData: ApplicationInput
  ): Promise<Application> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      // Omitted keys are dropped during JSON serialisation, so the column
      // defaults from migration 0002 (priority 'Medium', tags '{}') apply
      // whenever the caller does not supply them. `.select()` returns the full
      // row, including the values the database filled in.
      const { data, error } = await supabase
        .from('applications')
        .insert([{
          user_id: userId,
          ...appData
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase create application error:', error);
        throw new Error(friendlyDatabaseError(error, 'The application could not be saved. Please try again.'));
      }

      const newApp = data as Application;

      // Log initial status history entry
      await this.recordStatusHistory(userId, {
        application_id: newApp.id,
        previous_status: null,
        new_status: newApp.status,
        note: 'Application created'
      });

      return newApp;
    }

    // Development-only local store
    assertDemoMode('create an application');
    const newApp: Application = {
      ...appData,
      // Mirrors the NOT NULL DEFAULTs the database applies in migration 0002,
      // so a locally created record has the same shape as a persisted one.
      priority: appData.priority ?? 'Medium',
      tags: appData.tags ?? [],
      id: 'app-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      user_id: userId,
      created_at: now,
      updated_at: now
    };

    const apps = await this.getApplications(userId);
    apps.unshift(newApp);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS + userId, JSON.stringify(apps));

    // Log status history
    await this.recordStatusHistory(userId, {
      application_id: newApp.id,
      previous_status: null,
      new_status: newApp.status,
      note: 'Application created'
    });

    return newApp;
  },

  async updateApplication(
    userId: string, 
    id: string, 
    updates: ApplicationUpdate
  ): Promise<Application> {
    const existing = await this.getApplicationById(id, userId);
    if (!existing) {
      throw new Error('Application not found or unauthorized.');
    }

    const previousStatus = existing.status;
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      // `updated_at` is maintained by the set_applications_updated_at trigger.
      const { data, error } = await supabase
        .from('applications')
        .update({ ...updates })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update application error:', error);
        throw new Error(friendlyDatabaseError(error, 'The application could not be updated. Please try again.'));
      }

      const updatedApp = data as Application;

      // Check if status changed
      if (updates.status && updates.status !== previousStatus) {
        await this.recordStatusHistory(userId, {
          application_id: id,
          previous_status: previousStatus,
          new_status: updates.status,
          note: `Status changed from ${previousStatus} to ${updates.status}`
        });
      }

      return updatedApp;
    }

    // Development-only local store
    assertDemoMode('update an application');
    const apps = await this.getApplications(userId);
    const index = apps.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Application not found.');

    const updatedApp: Application = {
      ...apps[index],
      ...updates,
      updated_at: now
    };

    apps[index] = updatedApp;
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS + userId, JSON.stringify(apps));

    // Record status history if changed
    if (updates.status && updates.status !== previousStatus) {
      await this.recordStatusHistory(userId, {
        application_id: id,
        previous_status: previousStatus,
        new_status: updates.status,
        note: `Status changed from ${previousStatus} to ${updates.status}`
      });
    }

    return updatedApp;
  },

  async deleteApplication(userId: string, id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase delete application error:', error);
        throw new Error(friendlyDatabaseError(error, 'The application could not be deleted. Please try again.'));
      }
      return;
    }

    // Development-only local store
    assertDemoMode('delete an application');
    const apps = await this.getApplications(userId);
    const filtered = apps.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS + userId, JSON.stringify(filtered));

    // Clean up history (Supabase does this via ON DELETE CASCADE)
    const historyKey = STORAGE_KEYS.HISTORY + userId;
    const allHistory = await this.getAllStatusHistory(userId);
    const updatedHistory = allHistory.filter(h => h.application_id !== id);
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
  },

  // --- STATUS HISTORY ---
  async getAllStatusHistory(userId: string): Promise<ApplicationStatusHistory[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('application_status_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch status history error:', error);
        return [];
      }
      return data as ApplicationStatusHistory[];
    }

    // Development-only local store
    assertDemoMode('load status history');
    const key = STORAGE_KEYS.HISTORY + userId;
    const stored = localStorage.getItem(key);
    if (!stored) {
      const initial = getInitialSeedHistory(userId);
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  async getStatusHistory(userId: string, applicationId: string): Promise<ApplicationStatusHistory[]> {
    const all = await this.getAllStatusHistory(userId);
    return all.filter(h => h.application_id === applicationId).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async recordStatusHistory(
    userId: string, 
    entry: {
      application_id: string;
      previous_status: ApplicationStatus | null;
      new_status: ApplicationStatus;
      note?: string;
    }
  ): Promise<ApplicationStatusHistory | null> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('application_status_history')
        .insert([{
          user_id: userId,
          application_id: entry.application_id,
          previous_status: entry.previous_status,
          new_status: entry.new_status,
          note: entry.note
        }])
        .select()
        .single();

      // History logging is best-effort: a failure here must not roll back the
      // application change the user just made. It is reported, not thrown, and
      // never silently redirected into the local demo store.
      if (error) {
        console.error('Supabase record status history error:', error);
        return null;
      }
      return data as ApplicationStatusHistory;
    }

    // Development-only local store
    assertDemoMode('record status history');
    const newHistory: ApplicationStatusHistory = {
      id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      user_id: userId,
      application_id: entry.application_id,
      previous_status: entry.previous_status,
      new_status: entry.new_status,
      note: entry.note,
      created_at: now
    };

    const all = await this.getAllStatusHistory(userId);
    all.unshift(newHistory);
    localStorage.setItem(STORAGE_KEYS.HISTORY + userId, JSON.stringify(all));

    return newHistory;
  },

  // --- USER PROFILE ---
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (isSupabaseConfigured && supabase) {
      // `profiles.id` IS the auth user's UUID — there is no separate user_id.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // PGRST116 = no row. Any other error is a real failure and must surface:
      // silently returning null here would let updateProfile() overwrite a
      // live profile with blank values.
      if (error && error.code !== 'PGRST116') {
        console.error('Supabase fetch profile error:', error);
        throw new Error(friendlyDatabaseError(error, 'Your profile could not be loaded. Please try again.'));
      }
      return (data as UserProfile) ?? null;
    }

    // Development-only local store
    assertDemoMode('load a profile');
    const key = STORAGE_KEYS.PROFILE + userId;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  },

  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const now = new Date().toISOString();
    const existing = await this.getProfile(userId);

    const fullProfile: UserProfile = {
      id: userId,
      full_name: profileData.full_name || existing?.full_name || 'Job Tracker User',
      professional_title: profileData.professional_title ?? existing?.professional_title ?? '',
      location: profileData.location ?? existing?.location ?? '',
      phone: profileData.phone ?? existing?.phone ?? '',
      linkedin_url: profileData.linkedin_url ?? existing?.linkedin_url ?? '',
      avatar_url: profileData.avatar_url ?? existing?.avatar_url ?? '',
      theme_preference: profileData.theme_preference ?? existing?.theme_preference ?? 'system',
      // Defaults to FALSE to match the column default. A profile is only
      // onboarded once completeOnboarding() explicitly says so.
      onboarding_completed:
        profileData.onboarding_completed ?? existing?.onboarding_completed ?? false,
      created_at: existing?.created_at || now,
      updated_at: now
    };

    if (isSupabaseConfigured && supabase) {
      // The handle_new_user() trigger creates this row at signup, so this is
      // normally an update. Upserting on the `id` primary key keeps it correct
      // even if the row is somehow absent. `updated_at` is set by the
      // set_profiles_updated_at trigger.
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          [{
            id: userId,
            full_name: fullProfile.full_name,
            professional_title: fullProfile.professional_title,
            location: fullProfile.location,
            phone: fullProfile.phone,
            linkedin_url: fullProfile.linkedin_url,
            avatar_url: fullProfile.avatar_url,
            theme_preference: fullProfile.theme_preference,
            onboarding_completed: fullProfile.onboarding_completed
          }],
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Supabase update profile error:', error);
        throw new Error(friendlyDatabaseError(error, 'Your profile could not be saved. Please try again.'));
      }
      return data as UserProfile;
    }

    // Development-only local store
    assertDemoMode('save a profile');
    localStorage.setItem(STORAGE_KEYS.PROFILE + userId, JSON.stringify(fullProfile));
    return fullProfile;
  },

  // --- NOTIFICATION PREFERENCES ---
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const defaults: NotificationPreferences = {
      id: 'notif-' + userId,
      user_id: userId,
      deadline_reminders: true,
      interview_reminders: true,
      follow_up_reminders: true
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Supabase fetch notification preferences error:', error);
        throw new Error(friendlyDatabaseError(error, 'Your notification preferences could not be loaded.'));
      }
      // handle_new_user() seeds this row, but fall back to the same defaults
      // the column definitions use if it is missing.
      return (data as NotificationPreferences) ?? defaults;
    }

    // Development-only local store
    assertDemoMode('load notification preferences');
    const key = STORAGE_KEYS.NOTIFICATIONS + userId;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }

    return defaults;
  },

  async updateNotificationPreferences(
    userId: string, 
    prefs: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.getNotificationPreferences(userId);
    const updated: NotificationPreferences = {
      ...existing,
      ...prefs,
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      // `onConflict: 'user_id'` targets the UNIQUE(user_id) constraint. Without
      // it PostgREST resolves the conflict against the `id` primary key, which
      // is never supplied here — so every save generated a fresh id and the
      // second save violated UNIQUE(user_id). The error was also unchecked, so
      // the UI reported success on a failed write.
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          [{
            user_id: userId,
            deadline_reminders: updated.deadline_reminders,
            interview_reminders: updated.interview_reminders,
            follow_up_reminders: updated.follow_up_reminders
          }],
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Supabase update notification preferences error:', error);
        throw new Error(friendlyDatabaseError(error, 'Your notification preferences could not be saved.'));
      }
      return data as NotificationPreferences;
    }

    // Development-only local store
    assertDemoMode('save notification preferences');
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS + userId, JSON.stringify(updated));
    return updated;
  },

  // --- DANGER ZONE: DELETE ACCOUNT ---
  /**
   * Deletes every row this user owns.
   *
   * INCOMPLETE BY DESIGN: the `auth.users` record itself cannot be removed from
   * the browser — that requires the Auth Admin API, which needs a service-role
   * key and therefore must live in a Supabase Edge Function. Until that exists,
   * the login remains valid and signing back in produces an empty account that
   * re-runs onboarding.
   *
   * Previously this method did nothing at all against Supabase while the UI
   * promised a permanent wipe.
   */
  async deleteAccount(userId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      // Deleting applications cascades to application_status_history.
      const { error: applicationsError } = await supabase
        .from('applications')
        .delete()
        .eq('user_id', userId);

      if (applicationsError) {
        console.error('Supabase delete applications error:', applicationsError);
        throw new Error(friendlyDatabaseError(applicationsError, 'Your applications could not be deleted.'));
      }

      const { error: preferencesError } = await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', userId);

      if (preferencesError) {
        console.error('Supabase delete notification preferences error:', preferencesError);
        throw new Error(friendlyDatabaseError(preferencesError, 'Your notification preferences could not be deleted.'));
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Supabase delete profile error:', profileError);
        throw new Error(friendlyDatabaseError(profileError, 'Your profile could not be deleted.'));
      }

      return;
    }

    // Development-only local store
    assertDemoMode('delete an account');
    localStorage.removeItem(STORAGE_KEYS.APPLICATIONS + userId);
    localStorage.removeItem(STORAGE_KEYS.HISTORY + userId);
    localStorage.removeItem(STORAGE_KEYS.PROFILE + userId);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS + userId);
  }
};
