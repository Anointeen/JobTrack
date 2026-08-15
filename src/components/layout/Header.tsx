import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, Bell, Search, User as UserIcon, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApplicationForm } from '../../context/ApplicationFormContext';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileSidebar }) => {
  const { profile } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { openCreateForm } = useApplicationForm();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  /**
   * Quick search navigates to the applications list with the term in the URL,
   * so the result is bookmarkable and survives a refresh. Navigation happens on
   * submit only — typing never moves the user off the current screen.
   */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/applications?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header
      className="app-header"
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
      <div className="app-header-left">
        <button
          className="btn btn-ghost btn-sm mobile-only"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          style={{ padding: '6px' }}
        >
          <Menu size={22} />
        </button>

        <form className="header-search" onSubmit={handleSearchSubmit} role="search">
          <button
            type="submit"
            aria-label="Search applications"
            style={{
              position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '28px', height: '28px', padding: 0,
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)'
            }}
          >
            <Search size={16} />
          </button>
          <input
            type="search"
            className="input-control"
            placeholder="Search applications..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search applications"
            style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.875rem' }}
          />
        </form>
      </div>

      <div className="app-header-actions">
        {/* Quick Add CTA */}
        <button
          onClick={openCreateForm}
          className="btn btn-primary btn-sm"
          style={{ gap: '0.375rem' }}
        >
          <Plus size={16} />
          <span className="btn-label-md">Add Application</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleTheme}
          style={{ padding: '8px', borderRadius: '50%', color: 'var(--text-muted)' }}
          title={resolvedTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label={resolvedTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {resolvedTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Notifications Dropdown Toggle */}
        <div className="header-notifications" style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ padding: '8px', borderRadius: '50%', position: 'relative' }}
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={showNotifications}
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
                maxWidth: 'calc(100vw - 2rem)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '1rem',
                zIndex: 20
              }}
            >
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
                Notifications &amp; Reminders
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
          onClick={() => navigate('/profile')}
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
          aria-label="Go to your profile"
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
