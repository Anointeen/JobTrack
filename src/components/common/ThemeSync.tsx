import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { dataService } from '../../lib/dataService';
import { ThemeMode } from '../../types';

/**
 * Reconciles the device theme with the signed-in account's `theme_preference`.
 *
 * Renders nothing. It sits inside both providers so it stays mounted for the
 * whole session, independent of which view is showing.
 *
 * Ordering, and why it cannot race:
 *
 *   1. index.html applies the localStorage theme before React mounts, so the
 *      first paint is already correct and the anti-flash behaviour is intact.
 *   2. ThemeProvider initialises from that same localStorage value.
 *   3. Once — and only once — per authenticated user, the account preference is
 *      adopted. A ref keyed on the user id guards this, so a later profile
 *      refresh can never reach back and clobber a newer local choice.
 *   4. After that first reconciliation, changes made on this device are pushed
 *      up to the profile. This covers the header toggle as well as the Settings
 *      picker, which previously did not persist.
 *
 * 'system' is stored and restored like any other value, so following the OS
 * remains a real, persistable choice rather than just the absence of one.
 */
export const ThemeSync: React.FC = () => {
  const { user, profile } = useAuth();
  const { themeMode, setThemeMode } = useTheme();

  // Which user id we have already adopted the remote preference for.
  const syncedUserRef = useRef<string | null>(null);
  // Last value known to match the stored profile, to avoid redundant writes.
  const lastPersistedRef = useRef<ThemeMode | null>(null);

  useEffect(() => {
    if (!user) {
      // Signed out: allow the next sign-in to re-adopt its account preference.
      syncedUserRef.current = null;
      lastPersistedRef.current = null;
      return;
    }

    // Wait for the profile; without it there is nothing to reconcile against.
    if (!profile) return;

    // Step 3 — adopt the account preference exactly once per user.
    if (syncedUserRef.current !== user.id) {
      syncedUserRef.current = user.id;
      const remote: ThemeMode = profile.theme_preference ?? 'system';
      lastPersistedRef.current = remote;
      if (remote !== themeMode) {
        setThemeMode(remote);
      }
      return;
    }

    // Step 4 — push subsequent local changes up to the account.
    if (themeMode !== lastPersistedRef.current) {
      lastPersistedRef.current = themeMode;
      dataService
        .updateProfile(user.id, { theme_preference: themeMode })
        .catch(err => {
          // Non-fatal: the device keeps the chosen theme via localStorage.
          console.error('Failed to persist theme preference:', err);
        });
    }
  }, [user, profile, themeMode, setThemeMode]);

  return null;
};
