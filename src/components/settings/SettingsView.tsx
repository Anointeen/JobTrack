import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { dataService } from '../../lib/dataService';
import { ThemeMode } from '../../types';
import { Lock, Bell, Trash2, ShieldAlert, Save, AlertTriangle, Sun, Moon, Monitor, Palette } from 'lucide-react';

interface SettingsViewProps {
  onShowToast: (type: 'success' | 'error', title: string, message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onShowToast }) => {
  const { user, updatePassword, logOut } = useAuth();
  const { themeMode, setThemeMode, resolvedTheme } = useTheme();

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);

  // Notification Preferences State
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [followUpReminders, setFollowUpReminders] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Delete Account Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotificationPrefs();
    }
  }, [user]);

  const loadNotificationPrefs = async () => {
    if (!user) return;
    try {
      const prefs = await dataService.getNotificationPreferences(user.id);
      setDeadlineReminders(prefs.deadline_reminders);
      setInterviewReminders(prefs.interview_reminders);
      setFollowUpReminders(prefs.follow_up_reminders);
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;

    if (newPassword.length < 6) {
      onShowToast('error', 'Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      onShowToast('error', 'Password Mismatch', 'New password and confirm password do not match.');
      return;
    }

    try {
      setUpdatingPass(true);
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      onShowToast('success', 'Password Updated', 'Your account password has been updated.');
    } catch (err: any) {
      onShowToast('error', 'Update Failed', err.message || 'Failed to update password.');
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    setThemeMode(mode);
    // Persist to user profile if logged in
    if (user) {
      try {
        await dataService.updateProfile(user.id, { theme_preference: mode });
      } catch (err) {
        console.error('Failed to save theme preference:', err);
      }
    }
    onShowToast('success', 'Appearance Updated', `Theme set to ${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'} mode.`);
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    try {
      setSavingPrefs(true);
      await dataService.updateNotificationPreferences(user.id, {
        deadline_reminders: deadlineReminders,
        interview_reminders: interviewReminders,
        follow_up_reminders: followUpReminders
      });
      onShowToast('success', 'Preferences Saved', 'Your notification settings have been updated.');
    } catch (err: any) {
      onShowToast('error', 'Save Failed', 'Could not save notification preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || confirmDeleteText.toUpperCase() !== 'DELETE') return;

    try {
      setDeleting(true);
      await dataService.deleteAccount(user.id);
      await logOut();
    } catch (err: any) {
      onShowToast('error', 'Deletion Failed', err.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: any; desc: string }[] = [
    { mode: 'light', label: 'Light', icon: Sun, desc: 'Clean, bright professional interface' },
    { mode: 'dark', label: 'Dark', icon: Moon, desc: 'Modern dark SaaS interface' },
    { mode: 'system', label: 'System', icon: Monitor, desc: 'Follow your OS preference' },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>
          Account Settings
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Manage your security settings, notification preferences, and account privacy.
        </p>
      </div>

      {/* Appearance / Theme Card */}
      <div className="card">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Palette size={20} color="var(--primary-600)" /> Appearance
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Choose how JobTrack looks on your device.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {themeOptions.map(opt => {
            const Icon = opt.icon;
            const isSelected = themeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => handleThemeChange(opt.mode)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1.25rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--primary-600)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'var(--primary-50)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  textAlign: 'center'
                }}
              >
                <div 
                  style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '50%', 
                    backgroundColor: isSelected ? 'var(--primary-100)' : 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? 'var(--primary-600)' : 'var(--text-muted)'
                  }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: isSelected ? 'var(--primary-600)' : 'var(--text-heading)' }}>
                    {opt.label}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {opt.desc}
                  </p>
                </div>
                {isSelected && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-600)' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Account Security Card */}
      <div className="card">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={20} color="var(--primary-600)" /> Security & Password Management
        </h3>

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="input-control"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button
              type="submit"
              className="btn btn-outline"
              disabled={updatingPass || !newPassword}
            >
              {updatingPass ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Notifications Preferences Card */}
      <div className="card">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={20} color="var(--primary-600)" /> Notification Preferences
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Choose which automatic alerts and application reminders you want to receive.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9375rem' }}>Application Deadline Reminders</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Receive reminders 48 hours before job submission deadlines expire</div>
            </div>
            <input
              type="checkbox"
              checked={deadlineReminders}
              onChange={e => setDeadlineReminders(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9375rem' }}>Interview & Assessment Alerts</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Get upcoming calendar alerts for technical tests and interviews</div>
            </div>
            <input
              type="checkbox"
              checked={interviewReminders}
              onChange={e => setInterviewReminders(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.75rem 0' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9375rem' }}>Application Follow-Up Nudges</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Automatic suggestions to follow up with recruiters after 7 days</div>
            </div>
            <input
              type="checkbox"
              checked={followUpReminders}
              onChange={e => setFollowUpReminders(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button
            onClick={handleSaveNotifications}
            className="btn btn-primary"
            disabled={savingPrefs}
          >
            <Save size={18} />
            <span>{savingPrefs ? 'Saving Settings...' : 'Save Notification Preferences'}</span>
          </button>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="card" style={{ borderColor: 'var(--rose-500)', backgroundColor: 'var(--rose-50)' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--rose-500)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={20} /> Danger Zone
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Permanently delete your JobTrack account and clear all stored job applications and status history.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-danger"
          >
            <Trash2 size={18} />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Account Modal Dialog */}
      {showDeleteModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(9, 13, 22, 0.75)', 
            backdropFilter: 'blur(3px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999
          }}
        >
          <div style={{ background: 'var(--bg-surface)', padding: '1.75rem', borderRadius: '16px', maxWidth: '440px', width: '100%', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--rose-50)', color: 'var(--rose-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertTriangle size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
              Delete Account Permanently?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
              This will permanently wipe your profile, all tracked applications, and status logs. Type <strong>DELETE</strong> below to confirm.
            </p>

            <input
              type="text"
              className="input-control"
              placeholder="Type DELETE to confirm"
              value={confirmDeleteText}
              onChange={e => setConfirmDeleteText(e.target.value)}
              style={{ marginBottom: '1.25rem' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmDeleteText('');
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                disabled={confirmDeleteText.toUpperCase() !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
                style={{ flex: 1 }}
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
