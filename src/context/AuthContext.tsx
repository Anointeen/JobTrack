import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, UserProfile } from '../types';
import { supabase, isSupabaseConfigured, isDemoMode } from '../lib/supabase';
import { dataService } from '../lib/dataService';

interface AuthContextType {
  user: UserSession | null;
  profile: UserProfile | null;
  loading: boolean;
  needsOnboarding: boolean;
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

  // Initialize Auth state
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userSession: UserSession = {
            id: session.user.id,
            email: session.user.email || '',
            email_verified: Boolean(session.user.email_confirmed_at)
          };
          setUser(userSession);
          await loadUserProfile(userSession.id);
        } else {
          setUser(null);
          setProfile(null);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const u: UserSession = {
              id: session.user.id,
              email: session.user.email || '',
              email_verified: Boolean(session.user.email_confirmed_at)
            };
            setUser(u);
            await loadUserProfile(u.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        });

        setLoading(false);
        return () => {
          authListener.subscription.unsubscribe();
        };
      } else if (isDemoMode) {
        // Local Demo Auth Persistence (development only)
        const savedUserStr = localStorage.getItem(LOCAL_USER_KEY);
        if (savedUserStr) {
          try {
            const savedUser: UserSession = JSON.parse(savedUserStr);
            setUser(savedUser);
            await loadUserProfile(savedUser.id);
          } catch {
            localStorage.removeItem(LOCAL_USER_KEY);
          }
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    initAuth();
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
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
    }
    // Simulation for demo mode
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
