import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Calendar, 
  FileText, 
  User, 
  Settings, 
  LogOut,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab = 'dashboard' | 'applications' | 'calendar' | 'documents' | 'profile' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile
}) => {
  const { logOut, profile, user } = useAuth();

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: any;
    comingSoon?: boolean;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'applications', label: 'Applications', icon: Briefcase },
    { id: 'calendar', label: 'Calendar', icon: Calendar, comingSoon: true },
    { id: 'documents', label: 'Documents', icon: FileText, comingSoon: true },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: NavTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const content = (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        width: 'var(--sidebar-width)',
        padding: '1.25rem 1rem'
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingLeft: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div 
            style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '10px', 
              backgroundColor: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Briefcase size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1.1 }}>
              JobTrack
            </h2>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Career Hub
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        <button 
          className="btn btn-ghost btn-sm mobile-only" 
          onClick={onCloseMobile}
          style={{ padding: '4px', borderRadius: '50%' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                color: isActive ? 'var(--primary-600)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon size={20} color={isActive ? 'var(--primary-600)' : 'var(--text-subtle)'} />
                <span>{item.label}</span>
              </div>
              {item.comingSoon && (
                <span 
                  style={{ 
                    fontSize: '0.6875rem', 
                    fontWeight: 700, 
                    backgroundColor: 'var(--bg-subtle)', 
                    color: 'var(--text-subtle)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Career Vision Teaser Box */}
      <div 
        style={{ 
          margin: '1rem 0',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--purple-50) 100%)',
          border: '1px solid var(--primary-100)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-600)' }}>
          <Sparkles size={16} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Career Management
          </span>
        </div>
        <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Track applications, monitor stats, and advance your professional journey.
        </p>
      </div>

      {/* User Footer Profile & Log Out */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
          <div 
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
              flexShrink: 0
            }}
          >
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'Job Tracker User'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={logOut}
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--rose-500)' }}
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="desktop-sidebar-container" style={{ height: '100vh', position: 'sticky', top: 0, zIndex: 10 }}>
        {content}
      </div>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div 
          className="mobile-backdrop"
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 13, 22, 0.6)',
            zIndex: 999
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ height: '100%', width: 'var(--sidebar-width)' }}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
};
