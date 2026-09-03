import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CalendarEvent, CalendarEventInput, CalendarEventUpdate } from '../types';
import { dataService } from '../lib/dataService';
import { useAuth } from './AuthContext';

interface CalendarContextType {
  events: CalendarEvent[];
  loading: boolean;
  /** Set when the initial load failed, so the view can show a real error state. */
  error: string | null;
  /** True once a load has completed, so an empty state is not shown prematurely. */
  loaded: boolean;
  refresh: () => Promise<void>;
  createEvent: (data: CalendarEventInput) => Promise<CalendarEvent>;
  updateEvent: (id: string, updates: CalendarEventUpdate) => Promise<CalendarEvent>;
  removeEvent: (id: string) => Promise<void>;
  getById: (id: string) => CalendarEvent | undefined;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

/**
 * Single source of truth for the signed-in user's calendar events.
 *
 * Deliberately shaped like ApplicationsContext: the calendar screen, the
 * dashboard's "Upcoming This Week" widget and the notifications bell all read
 * the same list, so holding it once here keeps them consistent and means
 * moving between those screens issues no extra requests.
 *
 * Every read is scoped to the authenticated user id and additionally enforced
 * server-side by RLS — this cache is a convenience, never a security boundary.
 */
export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, needsOnboarding } = useAuth();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await dataService.getCalendarEvents(user.id);
      setEvents(data);
      setLoaded(true);
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
      setError(err?.message || 'Your calendar could not be loaded.');
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
      setEvents([]);
      setLoaded(false);
      setError(null);
    }
  }, [user, needsOnboarding, refresh]);

  const createEvent = useCallback(
    async (data: CalendarEventInput) => {
      if (!user) throw new Error('You must be signed in to add an event.');
      const created = await dataService.createCalendarEvent(user.id, data);
      await refresh();
      return created;
    },
    [user, refresh]
  );

  const updateEvent = useCallback(
    async (id: string, updates: CalendarEventUpdate) => {
      if (!user) throw new Error('You must be signed in to edit an event.');
      const updated = await dataService.updateCalendarEvent(user.id, id, updates);
      await refresh();
      return updated;
    },
    [user, refresh]
  );

  const removeEvent = useCallback(
    async (id: string) => {
      if (!user) throw new Error('You must be signed in to delete an event.');
      await dataService.deleteCalendarEvent(user.id, id);
      await refresh();
    },
    [user, refresh]
  );

  const getById = useCallback(
    (id: string) => events.find(e => e.id === id),
    [events]
  );

  return (
    <CalendarContext.Provider
      value={{
        events,
        loading,
        loaded,
        error,
        refresh,
        createEvent,
        updateEvent,
        removeEvent,
        getById
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
