import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, UserProfile } from '../types';
import { supabase, isSupabaseConfigured, isDemoMode } from '../lib/supabase';
import { dataService } from '../lib/dataService';

interface AuthContextType {
  user: UserSession | null;
  profile: UserProfile | null;
  loading: boolean;
  needsOnboarding: boolean;
  /** True while the user is in a Supabase password-recovery session. */
  isPasswordRecovery: boolean;
  /** Leaves recovery mode once a new password has been set. */
  completePasswordRecovery: () => void;
  /** Abandons recovery mode and signs the temporary session out. */
  cancelPasswordRecovery: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  completeOnboarding: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'jobtrack_demo_user';
const LOCAL_USERS_DB_KEY = 'jobtrack_users_db';

/**
 * Guards the localStorage authentication paths below.
 *
 * Demo auth stores passwords in plaintext and auto-creates an account for any
 * unrecognised email. It previously activated whenever Supabase happened to be
 * unconfigured, which meant a deployment with missing environment variables
 * would silently serve insecure authentication. It is now development-only.
 */
const assertDemoAuth = (): void => {
  if (!isDemoMode) {
    throw new Error(
      'Authentication is unavailable: Supabase is not configured, and the local demo ' +
        'login is restricted to development builds.'
    );
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  /**
   * Seeded from the URL fragment so the recovery screen is chosen on the very
   * first render. Supabase strips `#access_token=...&type=recovery` from the
   * URL once it has consumed it, so relying only on the PASSWORD_RECOVERY
   * event can briefly flash the dashboard first. The event below still sets
   * this too, covering whichever happens first.
   */
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash.includes('type=recovery');
  });

  // Initialize Auth state
  //
  // The cleanup function is returned from useEffect *synchronously*. It used to
  // be returned from inside the async initAuth(), so React received a Promise
  // instead of a cleanup function and the auth subscription was never released
  // — under StrictMode's double-mount that left a second live listener behind,
  // duplicating every profile fetch.
  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const toSession = (u: { id: string; email?: string | null; email_confirmed_at?: string | null }): UserSession => ({
      id: u.id,
      email: u.email || '',
      email_verified: Boolean(u.email_confirmed_at)
    });

    if (isSupabaseConfigured && supabase) {
      // Registered before the first await so no auth event can slip through the
      // gap, and so the unsubscribe handle exists by the time cleanup runs.
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;

        // Fired when the user opens the recovery link from their email. The
        // session that arrives with it is only meant for setting a new password.
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (session?.user) {
          const u = toSession(session.user);
          setUser(u);
          // Deferred to a fresh task: supabase-js invokes this callback while
          // holding its internal auth lock, and awaiting another client call
          // inline can deadlock.
          setTimeout(() => {
            if (!cancelled) void loadUserProfile(u.id);
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
          setNeedsOnboarding(false);
        }
      });
      subscription = authListener.subscription;

      void (async () => {
        try {
          const { data: { session } } = await supabase!.auth.getSession();
          if (cancelled) return;

          if (session?.user) {
            const userSession = toSession(session.user);
            setUser(userSession);
            await loadUserProfile(userSession.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    } else if (isDemoMode) {
      // Local Demo Auth Persistence (development only)
      void (async () => {
        const savedUserStr = localStorage.getItem(LOCAL_USER_KEY);
        if (savedUserStr) {
          try {
            const savedUser: UserSession = JSON.parse(savedUserStr);
            if (!cancelled) {
              setUser(savedUser);
              await loadUserProfile(savedUser.id);
            }
          } catch {
            localStorage.removeItem(LOCAL_USER_KEY);
          }
        }
        if (!cancelled) setLoading(false);
      })();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const existingProfile = await dataService.getProfile(userId);
      if (existingProfile) {
        setProfile(existingProfile);
        setNeedsOnboarding(!existingProfile.onboarding_completed);
      } else {
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setNeedsOnboarding(true);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (error) throw new Error(error.message);

      // The handle_new_user() trigger already created the profile and default
      // notification preferences server-side. No client-side insert is
      // attempted: that insert cannot succeed when the project requires email
      // confirmation, because no session exists yet for RLS to authorise.
      if (data.session?.user) {
        const uSession: UserSession = {
          id: data.session.user.id,
          email: data.session.user.email || '',
          email_verified: Boolean(data.session.user.email_confirmed_at)
        };
        setUser(uSession);
        await loadUserProfile(uSession.id);
        return;
      }

      // No session means the Supabase project requires email confirmation.
      throw new Error(
        'Account created. Please check your email to confirm your address, then log in.'
      );
    }

    // Local Demo SignUp (development only)
    assertDemoAuth();
    const usersDbStr = localStorage.getItem(LOCAL_USERS_DB_KEY);
    const usersDb = usersDbStr ? JSON.parse(usersDbStr) : {};
    
    if (usersDb[email]) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    const newUserId = 'usr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    usersDb[email] = { password, id: newUserId, email };
    localStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(usersDb));

    const newUserSession: UserSession = { id: newUserId, email, email_verified: true };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUserSession));
    setUser(newUserSession);

    const newProf = await dataService.updateProfile(newUserId, {
      full_name: fullName,
      onboarding_completed: false
    });
    setProfile(newProf);
    setNeedsOnboarding(true);
  };

  const logIn = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (data.user) {
        const uSession: UserSession = { id: data.user.id, email: data.user.email || '' };
        setUser(uSession);
        await loadUserProfile(uSession.id);
      }
      return;
    }

    // Local Demo Login (development only)
    assertDemoAuth();
    const usersDbStr = localStorage.getItem(LOCAL_USERS_DB_KEY);
    const usersDb = usersDbStr ? JSON.parse(usersDbStr) : {};

    const existing = usersDb[email];
    if (!existing || existing.password !== password) {
      // If demo mode has no saved user yet, auto-create account for seamless trial experience!
      if (!existing && email.includes('@')) {
        const defaultName = email.split('@')[0].replace('.', ' ');
        const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
        await signUp(email, password, formattedName);
        return;
      }
      throw new Error('Invalid email or password. Please check your credentials.');
    }

    const userSession: UserSession = { id: existing.id, email: existing.email, email_verified: true };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userSession));
    setUser(userSession);
    await loadUserProfile(userSession.id);
  };

  const logOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(LOCAL_USER_KEY);
    setUser(null);
    setProfile(null);
    setNeedsOnboarding(false);
    setIsPasswordRecovery(false);
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      // Without redirectTo the recovery link uses the project's default Site
      // URL, which may not point back at this build. The link returns here with
      // `type=recovery` in the fragment, which the auth listener picks up.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      });
      if (error) throw new Error(error.message);
      return;
    }
    // Demo mode has no mail delivery; the modal still shows its sent state.
  };

  const completePasswordRecovery = () => {
    setIsPasswordRecovery(false);
  };

  const cancelPasswordRecovery = async () => {
    setIsPasswordRecovery(false);
    await logOut();
  };

  const updatePassword = async (password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    }
    if (user && isDemoMode) {
      const usersDbStr = localStorage.getItem(LOCAL_USERS_DB_KEY);
      if (usersDbStr) {
        const usersDb = JSON.parse(usersDbStr);
        if (usersDb[user.email]) {
          usersDb[user.email].password = password;
          localStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(usersDb));
        }
      }
    }
  };

  const completeOnboarding = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = await dataService.updateProfile(user.id, {
      ...data,
      onboarding_completed: true
    });
    setProfile(updated);
    setNeedsOnboarding(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        needsOnboarding,
        isPasswordRecovery,
        completePasswordRecovery,
        cancelPasswordRecovery,
        signUp,
        logIn,
        logOut,
        resetPassword,
        updatePassword,
        completeOnboarding,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
