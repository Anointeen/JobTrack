import { 
  Application, 
  ApplicationStatus, 
  ApplicationStatusHistory, 
  UserProfile, 
  NotificationPreferences 
} from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  APPLICATIONS: 'jobtrack_applications_',
  HISTORY: 'jobtrack_status_history_',
  PROFILE: 'jobtrack_profile_',
  NOTIFICATIONS: 'jobtrack_notifications_'
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
      salary_min: 165000,
      salary_max: 210000,
      status: 'Interview',
      application_date: daysAgo(14),
      deadline: daysAgo(-7),
      recruiter_name: 'Sarah Jenkins',
      recruiter_email: 'sjenkin@stripe.com',
      notes: 'Passed initial recruiter screening and technical assessment. Technical panel scheduled for next Tuesday.',
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
      salary_min: 150000,
      salary_max: 190000,
      status: 'Offer',
      application_date: daysAgo(28),
      deadline: daysAgo(-3),
      recruiter_name: 'Marcus Vance',
      recruiter_email: 'marcus.v@airbnb.com',
      notes: 'Offer letter received! Base salary $175k + Equity & Sign-on bonus. Reviewing compensation package.',
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
      salary_min: 140000,
      salary_max: 180000,
      status: 'Assessment',
      application_date: daysAgo(7),
      deadline: daysAgo(-2),
      recruiter_name: 'Alex Rivera',
      recruiter_email: 'arivera@vercel.com',
      notes: 'Completed take-home project building a server-driven UI dashboard.',
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
      salary_min: 145000,
      salary_max: 175000,
      status: 'Applied',
      application_date: daysAgo(5),
      deadline: daysAgo(-10),
      recruiter_name: 'Elena Rostova',
      recruiter_email: 'elena.r@spotify.com',
      notes: 'Applied via company portal with tailored cover letter highlighting audio processing experience.',
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
      salary_min: 170000,
      salary_max: 220000,
      status: 'Saved',
      application_date: daysAgo(1),
      deadline: daysAgo(-14),
      recruiter_name: '',
      recruiter_email: '',
      notes: 'Discovered via Twitter. Need to customize resume focusing on high-performance web apps before submitting.',
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
      salary_min: 150000,
      salary_max: 185000,
      status: 'Rejected',
      application_date: daysAgo(35),
      deadline: daysAgo(20),
      notes: 'Received polite rejection email after final interview stage.',
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
        throw new Error(`Failed to load applications: ${error.message}`);
      }
      return data as Application[];
    }

    // Fallback: LocalStorage
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
    appData: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<Application> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
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
        throw new Error(`Failed to create application: ${error.message}`);
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

    // LocalStorage
    const newApp: Application = {
      ...appData,
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
    updates: Partial<Omit<Application, 'id' | 'user_id' | 'created_at'>>
  ): Promise<Application> {
    const existing = await this.getApplicationById(id, userId);
    if (!existing) {
      throw new Error('Application not found or unauthorized.');
    }

    const previousStatus = existing.status;
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('applications')
        .update({
          ...updates,
          updated_at: now
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update application error:', error);
        throw new Error(`Failed to update application: ${error.message}`);
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

    // LocalStorage
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
        throw new Error(`Failed to delete application: ${error.message}`);
      }
      return;
    }

    // LocalStorage
    const apps = await this.getApplications(userId);
    const filtered = apps.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS + userId, JSON.stringify(filtered));

    // Clean up history
    const historyKey = STORAGE_KEYS.HISTORY + userId;
    const history = await this.getStatusHistory(userId, id);
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

      if (error) return [];
      return data as ApplicationStatusHistory[];
    }

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
  ): Promise<ApplicationStatusHistory> {
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

      if (error) {
        console.error('Supabase record status history error:', error);
      } else if (data) {
        return data as ApplicationStatusHistory;
      }
    }

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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase fetch profile error:', error);
      }
      if (data) return data as UserProfile;
    }

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
      id: existing?.id || userId,
      user_id: userId,
      full_name: profileData.full_name || existing?.full_name || 'Job Tracker User',
      professional_title: profileData.professional_title ?? existing?.professional_title ?? '',
      location: profileData.location ?? existing?.location ?? '',
      phone: profileData.phone ?? existing?.phone ?? '',
      linkedin_url: profileData.linkedin_url ?? existing?.linkedin_url ?? '',
      avatar_url: profileData.avatar_url ?? existing?.avatar_url ?? '',
      theme_preference: profileData.theme_preference ?? existing?.theme_preference ?? 'system',
      onboarding_completed: profileData.onboarding_completed ?? existing?.onboarding_completed ?? true,
      created_at: existing?.created_at || now,
      updated_at: now
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert([{
          id: userId,
          user_id: userId,
          full_name: fullProfile.full_name,
          professional_title: fullProfile.professional_title,
          location: fullProfile.location,
          phone: fullProfile.phone,
          linkedin_url: fullProfile.linkedin_url,
          avatar_url: fullProfile.avatar_url,
          theme_preference: fullProfile.theme_preference,
          updated_at: now
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase update profile error:', error);
        throw new Error(`Failed to save profile: ${error.message}`);
      }
      return data as UserProfile;
    }

    localStorage.setItem(STORAGE_KEYS.PROFILE + userId, JSON.stringify(fullProfile));
    return fullProfile;
  },

  // --- NOTIFICATION PREFERENCES ---
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) return data as NotificationPreferences;
    }

    const key = STORAGE_KEYS.NOTIFICATIONS + userId;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }

    const defaults: NotificationPreferences = {
      id: 'notif-' + userId,
      user_id: userId,
      deadline_reminders: true,
      interview_reminders: true,
      follow_up_reminders: true
    };
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
      await supabase
        .from('notification_preferences')
        .upsert([{
          user_id: userId,
          deadline_reminders: updated.deadline_reminders,
          interview_reminders: updated.interview_reminders,
          follow_up_reminders: updated.follow_up_reminders
        }]);
    }

    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS + userId, JSON.stringify(updated));
    return updated;
  },

  // --- DANGER ZONE: DELETE ACCOUNT ---
  async deleteAccount(userId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      // In production Supabase, RPC or Auth Admin API deletes the auth user
    }

    localStorage.removeItem(STORAGE_KEYS.APPLICATIONS + userId);
    localStorage.removeItem(STORAGE_KEYS.HISTORY + userId);
    localStorage.removeItem(STORAGE_KEYS.PROFILE + userId);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS + userId);
  }
};
