import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

/**
 * Chrome for the authenticated area.
 *
 * Previously this took a render-prop child and owned activeTab/search/toast
 * state. Routed screens render through <Outlet /> now, so navigation state
 * comes from the URL and toasts come from ToastContext. The only state left
 * here is the mobile drawer, which is genuinely local UI.
 */
export const AppLayout: React.FC = () => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  return (
    <div className="app-container">
      <Sidebar
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      <div className="main-wrapper">
        <Header onOpenMobileSidebar={() => setIsOpenMobile(true)} />

        <main className="main-content" id="main-content">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
};
