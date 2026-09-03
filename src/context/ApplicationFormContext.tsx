import React, { createContext, useContext, useState, useCallback } from 'react';
import { Application, ApplicationInput, ApplicationStatus } from '../types';
import { ApplicationFormModal } from '../components/applications/ApplicationFormModal';
import { AddToCalendarPrompt } from '../components/calendar/AddToCalendarPrompt';
import { Modal } from '../components/common/Modal';
import { isInterviewStage } from '../lib/calendar';
import { useApplications } from './ApplicationsContext';
import { useCalendarEventForm } from './CalendarEventFormContext';
import { useToast } from './ToastContext';

interface ApplicationFormContextType {
  openCreateForm: () => void;
  openEditForm: (application: Application) => void;
}

const ApplicationFormContext = createContext<ApplicationFormContextType | undefined>(undefined);

/**
 * Owns the single add/edit application modal and its save logic.
 *
 * The header, the dashboard and the applications list all need to open this
 * form. Rendering it once here keeps one instance for the whole authenticated
 * area, so there is no chance of two competing copies and no need to pass
 * callbacks through the router's <Outlet />.
 */
export const ApplicationFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { createApplication, updateApplication } = useApplications();
  const { openCreateEvent } = useCalendarEventForm();
  const { addToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);

  /**
   * The application that has just moved into an interview stage, if any.
   *
   * The form closes on save, so unlike the detail modal there is nowhere
   * inline to put the offer — it is shown as its own small dialog instead,
   * after the form has gone. Same component, same wording, same result.
   */
  const [calendarPrompt, setCalendarPrompt] = useState<
    { application: Application; stage: ApplicationStatus } | null
  >(null);

  const openCreateForm = useCallback(() => {
    setEditing(null);
    setIsOpen(true);
  }, []);

  const openEditForm = useCallback((application: Application) => {
    setEditing(application);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditing(null);
  }, []);

  const handleSave = async (
    data: ApplicationInput
  ) => {
    try {
      if (editing) {
        const previousStatus = editing.status;
        const updated = await updateApplication(editing.id, data);
        addToast(
          'success',
          'Application Updated',
          `Updated ${updated.job_title} at ${updated.company_name}.`
        );
        // Offer the calendar when this save *moved* the application into an
        // interview stage. Only on a transition: re-prompting every time an
        // application already at Interview is edited would be nagging, not
        // helping.
        if (updated.status !== previousStatus && isInterviewStage(updated.status)) {
          setCalendarPrompt({ application: updated, stage: updated.status });
        }
      } else {
        const created = await createApplication(data);
        addToast(
          'success',
          'Application Added',
          `Successfully saved application for ${created.job_title} at ${created.company_name}.`
        );
        // An application added directly at an interview stage is the same
        // moment of intent as moving one there.
        if (isInterviewStage(created.status)) {
          setCalendarPrompt({ application: created, stage: created.status });
        }
      }
      close();
    } catch (err: any) {
      addToast('error', 'Save Error', err?.message || 'Could not save application.');
      // Rethrown so the form keeps itself open and shows the inline error.
      throw err;
    }
  };

  return (
    <ApplicationFormContext.Provider value={{ openCreateForm, openEditForm }}>
      {children}
      <ApplicationFormModal
        isOpen={isOpen}
        onClose={close}
        initialData={editing}
        onSave={handleSave}
      />

      {/* Shown after the form closes, so the two dialogs never overlap. */}
      <Modal
        isOpen={calendarPrompt !== null}
        onClose={() => setCalendarPrompt(null)}
        title="Schedule this stage?"
        maxWidth="520px"
      >
        {calendarPrompt && (
          <AddToCalendarPrompt
            stage={calendarPrompt.stage}
            application={calendarPrompt.application}
            onAdd={prefill => {
              setCalendarPrompt(null);
              openCreateEvent(prefill);
            }}
            onDismiss={() => setCalendarPrompt(null)}
          />
        )}
      </Modal>
    </ApplicationFormContext.Provider>
  );
};

export const useApplicationForm = () => {
  const context = useContext(ApplicationFormContext);
  if (!context) {
    throw new Error('useApplicationForm must be used within an ApplicationFormProvider');
  }
  return context;
};
