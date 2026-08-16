import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { Skeleton } from '../common/Skeleton';

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
          {/* Routed screens are lazy-loaded. Falling back inside <main> keeps
              the sidebar and header on screen while a chunk arrives, so
              navigation never flashes a full-page loader. */}
          <Suspense
            fallback={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Skeleton height="40px" width="220px" borderRadius="var(--radius-md)" />
                <Skeleton height="110px" borderRadius="var(--radius-lg)" />
                <Skeleton height="220px" borderRadius="var(--radius-lg)" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        <Footer />
      </div>
    </div>
  );
};
