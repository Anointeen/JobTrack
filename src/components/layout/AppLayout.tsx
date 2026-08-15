import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToastContainer } from '../common/Toast';
import { ToastMessage } from '../../types';

interface AppLayoutProps {
  children: (props: {
    activeTab: NavTab;
    onSelectTab: (tab: NavTab) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  }) => React.ReactNode;
  onOpenAddApplication: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, onOpenAddApplication }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const newToast: ToastMessage = {
      id: 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type,
      title,
      message
    };
    setToasts(prev => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      <div className="main-wrapper">
        <Header
          onOpenMobileSidebar={() => setIsOpenMobile(true)}
          onOpenAddApplication={onOpenAddApplication}
          onSelectTab={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="main-content">
          {children({
            activeTab,
            onSelectTab: setActiveTab,
            searchQuery,
            onSearchChange: setSearchQuery,
            addToast
          })}
        </main>

        <Footer />
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
