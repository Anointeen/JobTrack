import React, { useState } from 'react';
import { Menu, Plus, Bell, Search, User as UserIcon, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NavTab } from './Sidebar';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenAddApplication: () => void;
  onSelectTab: (tab: NavTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  onOpenAddApplication,
  onSelectTab,
  searchQuery,
  onSearchChange
}) => {
  const { profile } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header 
      style={{ 
        height: 'var(--header-height)', 
        backgroundColor: 'var(--bg-surface)', 
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 5
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <button 
          className="btn btn-ghost btn-sm mobile-only" 
          onClick={onOpenMobileSidebar}
          style={{ padding: '6px' }}
        >
          <Menu size={22} />
        </button>

        {/* Quick Search */}
        <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input
            type="text"
            className="input-control"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={e => {
              onSearchChange(e.target.value);
              onSelectTab('applications');
            }}
            style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Quick Add CTA */}
        <button
          onClick={onOpenAddApplication}
          className="btn btn-primary btn-sm"
          style={{ gap: '0.375rem' }}
        >
          <Plus size={16} />
          <span>Add Application</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleTheme}
          style={{ 
            padding: '8px', 
            borderRadius: '50%',
            color: 'var(--text-muted)'
          }}
          title={resolvedTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {resolvedTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Notifications Dropdown Toggle */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ padding: '8px', borderRadius: '50%', position: 'relative' }}
            title="Notifications"
          >
            <Bell size={20} color="var(--text-muted)" />
            <span 
              style={{ 
                position: 'absolute', 
                top: '6px', 
                right: '6px', 
                width: '8px', 
                height: '8px', 
                backgroundColor: 'var(--primary-600)', 
                borderRadius: '50%' 
              }} 
            />
          </button>

          {showNotifications && (
            <div 
              style={{ 
                position: 'absolute',
                right: 0,
                top: '120%',
                width: '320px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '1rem',
                zIndex: 20
              }}
            >
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
                Notifications & Reminders
              </h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Keep track of upcoming deadlines and scheduled interview reminders.
              </p>
              <div 
                style={{ 
                  marginTop: '0.75rem', 
                  padding: '0.625rem', 
                  backgroundColor: 'var(--primary-50)', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78125rem',
                  color: 'var(--primary-600)'
                }}
              >
                💡 Tip: Set application reminder preferences in your Settings page!
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Shortcut */}
        <button
          onClick={() => onSelectTab('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            borderRadius: 'var(--radius-full)'
          }}
          title="Go to Profile"
        >
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
              fontSize: '0.875rem'
            }}
          >
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <UserIcon size={18} />}
          </div>
        </button>
      </div>
    </header>
  );
};
