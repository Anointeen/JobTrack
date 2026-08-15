import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Application } from '../types';
import { dataService } from '../lib/dataService';
import { useAuth } from './AuthContext';

interface ApplicationsContextType {
  applications: Application[];
  loading: boolean;
  /** Set when the initial load failed, so views can show a real error state. */
  error: string | null;
  /** True once a load has completed, so "not found" is not shown prematurely. */
  loaded: boolean;
  refresh: () => Promise<void>;
  createApplication: (
    data: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<Application>;
  updateApplication: (
    id: string,
    updates: Partial<Omit<Application, 'id' | 'user_id' | 'created_at'>>
  ) => Promise<Application>;
  removeApplication: (id: string) => Promise<void>;
  getById: (id: string) => Application | undefined;
}

const ApplicationsContext = createContext<ApplicationsContextType | undefined>(undefined);

/**
 * Single source of truth for the signed-in user's applications.
 *
 * The list was previously owned by App.tsx and passed down. Routed screens are
 * siblings under an <Outlet />, so dashboard, list and detail would each have
 * had to fetch independently. Holding it once here keeps the data consistent
 * across routes and means navigating between them issues no extra requests.
 *
 * Every read is scoped to the authenticated user id and additionally enforced
 * server-side by RLS — this cache is a convenience, never a security boundary.
 */
export const ApplicationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, needsOnboarding } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await dataService.getApplications(user.id);
      setApplications(data);
      setLoaded(true);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err?.message || 'Your applications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !needsOnboarding) {
      void refresh();
    }
    if (!user) {
      // Clear on sign-out so a different account never sees stale rows.
      setApplications([]);
      setLoaded(false);
      setError(null);
    }
  }, [user, needsOnboarding, refresh]);

  const createApplication = useCallback(
    async (data: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('You must be signed in to add an application.');
      const created = await dataService.createApplication(user.id, data);
      await refresh();
      return created;
    },
    [user, refresh]
  );

  const updateApplication = useCallback(
    async (id: string, updates: Partial<Omit<Application, 'id' | 'user_id' | 'created_at'>>) => {
      if (!user) throw new Error('You must be signed in to edit an application.');
      const updated = await dataService.updateApplication(user.id, id, updates);
      await refresh();
      return updated;
    },
    [user, refresh]
  );

  const removeApplication = useCallback(
    async (id: string) => {
      if (!user) throw new Error('You must be signed in to delete an application.');
      await dataService.deleteApplication(user.id, id);
      await refresh();
    },
    [user, refresh]
  );

  const getById = useCallback(
    (id: string) => applications.find(a => a.id === id),
    [applications]
  );

  return (
    <ApplicationsContext.Provider
      value={{
        applications,
        loading,
        loaded,
        error,
        refresh,
        createApplication,
        updateApplication,
        removeApplication,
        getById
      }}
    >
      {children}
    </ApplicationsContext.Provider>
  );
};

export const useApplications = () => {
  const context = useContext(ApplicationsContext);
  if (!context) {
    throw new Error('useApplications must be used within an ApplicationsProvider');
  }
  return context;
};
