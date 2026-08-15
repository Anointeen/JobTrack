import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { OnboardingModal } from './components/auth/OnboardingModal';
import { AppLayout } from './components/layout/AppLayout';
import { NavTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ApplicationsView } from './components/applications/ApplicationsView';
import { ProfileView } from './components/profile/ProfileView';
import { SettingsView } from './components/settings/SettingsView';
import { CalendarView } from './components/placeholder/CalendarView';
import { DocumentsView } from './components/placeholder/DocumentsView';
import { ApplicationFormModal } from './components/applications/ApplicationFormModal';
import { ApplicationDetailModal } from './components/applications/ApplicationDetailModal';
import { Application, ApplicationStatus } from './types';
import { dataService } from './lib/dataService';
import { Skeleton } from './components/common/Skeleton';

const MainAppContent: React.FC = () => {
  const { user, loading, needsOnboarding } = useAuth();

  // Landing & Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Application Data & State
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Filter & Active Modal State
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [selectedDetailApplication, setSelectedDetailApplication] = useState<Application | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load User Applications
  const fetchApplications = useCallback(async () => {
    if (!user) return;
    setLoadingApps(true);
    try {
      const data = await dataService.getApplications(user.id);
      setApplications(data);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoadingApps(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !needsOnboarding) {
      fetchApplications();
    }
  }, [user, needsOnboarding, fetchApplications]);

  // Loading Screen
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--slate-50)', padding: '2rem' }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <Skeleton height="40px" width="180px" borderRadius="10px" className="mb-4" />
          <Skeleton height="20px" width="100%" borderRadius="6px" />
        </div>
      </div>
    );
  }

  // Unauthenticated State -> Landing Page
  if (!user) {
    return (
      <>
        <LandingPage
          onOpenSignup={() => {
            setAuthMode('signup');
            setShowAuthModal(true);
          }}
          onOpenLogin={() => {
            setAuthMode('login');
            setShowAuthModal(true);
          }}
        />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
          onOpenForgotPassword={() => setShowForgotPasswordModal(true)}
        />

        <ForgotPasswordModal
          isOpen={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
          onBackToLogin={() => {
            setAuthMode('login');
            setShowAuthModal(true);
          }}
        />
      </>
    );
  }

  // Onboarding Screen for new users
  if (needsOnboarding) {
    return (
      <OnboardingModal
        isOpen={true}
        onComplete={() => {
          fetchApplications();
        }}
      />
    );
  }

  // CRUD Handlers
  const handleSaveApplication = async (
    appData: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    addToast: (type: 'success' | 'error', title: string, msg: string) => void
  ) => {
    if (!user) return;
    try {
      if (editingApplication) {
        const updated = await dataService.updateApplication(user.id, editingApplication.id, appData);
        addToast('success', 'Application Updated', `Updated ${updated.job_title} at ${updated.company_name}.`);
      } else {
        const created = await dataService.createApplication(user.id, appData);
        addToast('success', 'Application Added', `Successfully saved application for ${created.job_title} at ${created.company_name}.`);
      }
      setShowFormModal(false);
      setEditingApplication(null);
      await fetchApplications();
    } catch (err: any) {
      addToast('error', 'Save Error', err.message || 'Could not save application.');
      throw err;
    }
  };

  const handleDeleteApplication = async (
    id: string,
    addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, msg: string) => void
  ) => {
    if (!user) return;
    try {
      await dataService.deleteApplication(user.id, id);
      addToast('info', 'Application Deleted', 'The job application has been removed.');
      setShowDetailModal(false);
      setSelectedDetailApplication(null);
      await fetchApplications();
    } catch (err: any) {
      addToast('error', 'Delete Error', err.message || 'Could not delete application.');
    }
  };

  return (
    <AppLayout
      onOpenAddApplication={() => {
        setEditingApplication(null);
        setShowFormModal(true);
      }}
    >
      {({ activeTab, onSelectTab, searchQuery, onSearchChange, addToast }) => (
        <>
          {activeTab === 'dashboard' && (
            <DashboardView
              applications={applications}
              loading={loadingApps}
              onNavigateToApplications={(st) => {
                setStatusFilter(st || 'All');
                onSelectTab('applications');
              }}
              onOpenAddApplication={() => {
                setEditingApplication(null);
                setShowFormModal(true);
              }}
              onSelectApplication={(app) => {
                setSelectedDetailApplication(app);
                setShowDetailModal(true);
              }}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsView
              applications={applications}
              loading={loadingApps}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onOpenAddApplication={() => {
                setEditingApplication(null);
                setShowFormModal(true);
              }}
              onSelectApplication={(app) => {
                setSelectedDetailApplication(app);
                setShowDetailModal(true);
              }}
              onEditApplication={(app) => {
                setEditingApplication(app);
                setShowFormModal(true);
              }}
              onDeleteApplication={(id) => handleDeleteApplication(id, addToast)}
            />
          )}

          {activeTab === 'calendar' && <CalendarView />}

          {activeTab === 'documents' && <DocumentsView />}

          {activeTab === 'profile' && (
            <ProfileView onShowToast={(type, title, msg) => addToast(type, title, msg)} />
          )}

          {activeTab === 'settings' && (
            <SettingsView onShowToast={(type, title, msg) => addToast(type, title, msg)} />
          )}

          {/* Form Modal (Add / Edit) */}
          <ApplicationFormModal
            isOpen={showFormModal}
            onClose={() => {
              setShowFormModal(false);
              setEditingApplication(null);
            }}
            initialData={editingApplication}
            onSave={(data) => handleSaveApplication(data, addToast)}
          />

          {/* Detail Modal */}
          <ApplicationDetailModal
            application={selectedDetailApplication}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedDetailApplication(null);
            }}
            onEdit={(app) => {
              setEditingApplication(app);
              setShowFormModal(true);
            }}
            onDelete={(id) => handleDeleteApplication(id, addToast)}
            onStatusChanged={(updatedApp) => {
              setSelectedDetailApplication(updatedApp);
              fetchApplications();
              addToast('success', 'Status Updated', `Status changed to ${updatedApp.status}.`);
            }}
          />
        </>
      )}
    </AppLayout>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
