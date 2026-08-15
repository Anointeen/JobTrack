import React, { createContext, useContext, useState, useCallback } from 'react';
import { Application } from '../types';
import { ApplicationFormModal } from '../components/applications/ApplicationFormModal';
import { useApplications } from './ApplicationsContext';
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
  const { addToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);

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
    data: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      if (editing) {
        const updated = await updateApplication(editing.id, data);
        addToast(
          'success',
          'Application Updated',
          `Updated ${updated.job_title} at ${updated.company_name}.`
        );
      } else {
        const created = await createApplication(data);
        addToast(
          'success',
          'Application Added',
          `Successfully saved application for ${created.job_title} at ${created.company_name}.`
        );
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
