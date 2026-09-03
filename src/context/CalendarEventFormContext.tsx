import React, { createContext, useContext, useState, useCallback } from 'react';
import { CalendarEvent, CalendarEventInput } from '../types';
import {
  CalendarEventFormModal,
  CalendarEventPrefill
} from '../components/calendar/CalendarEventFormModal';
import { useCalendar } from './CalendarContext';
import { useApplications } from './ApplicationsContext';
import { useToast } from './ToastContext';

interface CalendarEventFormContextType {
  /** Opens the blank form, optionally pre-filled (e.g. from a status change). */
  openCreateEvent: (prefill?: CalendarEventPrefill) => void;
  openEditEvent: (event: CalendarEvent) => void;
}

const CalendarEventFormContext = createContext<CalendarEventFormContextType | undefined>(undefined);

/**
 * Owns the single add/edit calendar event modal and its save logic.
 *
 * Mirrors ApplicationFormProvider, and for the same reason: the calendar
 * screen, the dashboard widget and the application detail modal's "Add to
 * Calendar" prompt all need to open this form. One instance for the whole
 * authenticated area means no competing copies and no callbacks threaded
 * through the router's <Outlet />.
 */
export const CalendarEventFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { createEvent, updateEvent, removeEvent } = useCalendar();
  const { applications } = useApplications();
  const { addToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [prefill, setPrefill] = useState<CalendarEventPrefill | null>(null);

  const openCreateEvent = useCallback((next?: CalendarEventPrefill) => {
    setEditing(null);
    setPrefill(next ?? null);
    setIsOpen(true);
  }, []);

  const openEditEvent = useCallback((event: CalendarEvent) => {
    setEditing(event);
    setPrefill(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditing(null);
    setPrefill(null);
  }, []);

  const handleSave = async (data: CalendarEventInput) => {
    try {
      if (editing) {
        const updated = await updateEvent(editing.id, data);
        addToast('success', 'Event Updated', `Updated "${updated.title}".`);
      } else {
        const created = await createEvent(data);
        addToast('success', 'Event Added', `"${created.title}" is on your calendar.`);
      }
      close();
    } catch (err: any) {
      addToast('error', 'Save Error', err?.message || 'Could not save this event.');
      // Rethrown so the form stays open and shows the inline error.
      throw err;
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    try {
      await removeEvent(event.id);
      addToast('success', 'Event Deleted', `"${event.title}" was removed from your calendar.`);
      close();
    } catch (err: any) {
      addToast('error', 'Delete Error', err?.message || 'Could not delete this event.');
      throw err;
    }
  };

  return (
    <CalendarEventFormContext.Provider value={{ openCreateEvent, openEditEvent }}>
      {children}
      <CalendarEventFormModal
        isOpen={isOpen}
        onClose={close}
        initialData={editing}
        prefill={prefill}
        applications={applications}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </CalendarEventFormContext.Provider>
  );
};

export const useCalendarEventForm = () => {
  const context = useContext(CalendarEventFormContext);
  if (!context) {
    throw new Error('useCalendarEventForm must be used within a CalendarEventFormProvider');
  }
  return context;
};
