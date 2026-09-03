import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, CalendarClock, CalendarCheck, MessageSquare, CalendarDays, Settings as SettingsIcon,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApplications } from '../../context/ApplicationsContext';
import { useCalendar } from '../../context/CalendarContext';
import { dataService } from '../../lib/dataService';
import {
  AppNotification,
  NotificationKind,
  allRemindersDisabled,
  buildNotifications
} from '../../lib/notifications';
import { NotificationPreferences } from '../../types';

/**
 * The header's notifications control.
 *
 * Previously this was a bell that opened a fixed block of marketing copy, and
 * `display: none` removed it entirely below 480px — so on a phone the control
 * was not merely hard to reach, it did not exist. It also showed an unread dot
 * unconditionally, which meant the one thing it did communicate was wrong.
 *
 * It is now a disclosure button (WAI-ARIA disclosure pattern) whose panel lists
 * reminders derived from the user's own applications. See src/lib/notifications
 * for why no new table was needed.
 */

const DEFAULT_PREFS: Pick<
  NotificationPreferences,
  'deadline_reminders' | 'interview_reminders' | 'follow_up_reminders'
> = {
  deadline_reminders: true,
  interview_reminders: true,
  follow_up_reminders: true
};

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  deadline: CalendarClock,
  interview: CalendarCheck,
  follow_up: MessageSquare,
  calendar_event: CalendarDays
};

/** Colour roles already defined for meta chips, so both themes are covered. */
const URGENCY_TOKENS: Record<AppNotification['urgency'], { fg: string; bg: string }> = {
  overdue: { fg: 'var(--meta-danger-text)', bg: 'var(--meta-danger-bg)' },
  today: { fg: 'var(--meta-warn-text)', bg: 'var(--meta-warn-bg)' },
  soon: { fg: 'var(--meta-neutral-text)', bg: 'var(--meta-neutral-bg)' }
};

export const NotificationsMenu: React.FC = () => {
  const { user } = useAuth();
  const { applications } = useApplications();
  const { events } = useCalendar();

  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  /**
   * Preferences are read once per signed-in user. A failure is not surfaced:
   * the switches only decide which reminders to show, so falling back to "show
   * them all" is strictly better than an error banner in the header.
   */
  // Keyed on the user *id*, not the user object: a provider that rebuilds its
  // value each render would otherwise refetch on every render.
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setPrefs(DEFAULT_PREFS);
      return;
    }
    let cancelled = false;
    dataService
      .getNotificationPreferences(userId)
      .then(loaded => {
        if (cancelled) return;
        setPrefs({
          deadline_reminders: loaded.deadline_reminders,
          interview_reminders: loaded.interview_reminders,
          follow_up_reminders: loaded.follow_up_reminders
        });
      })
      .catch(() => { /* keep the permissive defaults */ });
    return () => { cancelled = true; };
  }, [userId]);

  const notifications = useMemo(
    () => buildNotifications(applications, prefs, events),
    [applications, prefs, events]
  );
  const count = notifications.length;

  // --- Close behaviour ------------------------------------------------------
  // Escape returns focus to the button, because focus moved into the panel when
  // it opened; leaving it on a removed node would strand a keyboard user.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // The panel is absolutely positioned and visually detached from the button,
  // so focus is moved into it rather than left behind.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const label = count > 0
    ? `Notifications, ${count} ${count === 1 ? 'reminder' : 'reminders'} needing attention`
    : 'Notifications, nothing needs attention';

  return (
    <div className="header-notifications" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-ghost btn-sm notifications-toggle"
        onClick={() => setOpen(v => !v)}
        aria-label={label}
        aria-expanded={open}
        aria-controls="notifications-panel"
      >
        <Bell size={20} aria-hidden="true" />
        {count > 0 && (
          // Presentational only: the count is already in the button's name, so
          // announcing it twice would be noise.
          <span className="notifications-badge" aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notifications-panel"
          ref={panelRef}
          tabIndex={-1}
          className="notifications-panel"
          aria-labelledby="notifications-panel-heading"
        >
          <div className="notifications-panel-header">
            <h2 id="notifications-panel-heading" className="notifications-panel-title">
              Notifications
            </h2>
            <Link
              to="/settings"
              className="notifications-panel-settings"
              onClick={() => setOpen(false)}
            >
              <SettingsIcon size={14} aria-hidden="true" /> Settings
            </Link>
          </div>

          {count === 0 ? (
            <div className="notifications-empty">
              <p className="notifications-empty-title">You're all caught up</p>
              <p className="notifications-empty-body">
                {allRemindersDisabled(prefs)
                  ? 'All reminders are switched off. Turn them back on in Settings to see deadlines and follow-ups here.'
                  : 'Deadlines and follow-ups appear here in the week before and after they are due.'}
              </p>
            </div>
          ) : (
            <ul className="notifications-list">
              {notifications.map(item => {
                const Icon = KIND_ICON[item.kind];
                const tone = URGENCY_TOKENS[item.urgency];
                return (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className="notifications-item"
                      onClick={() => setOpen(false)}
                    >
                      <span
                        className="notifications-item-icon"
                        style={{ color: tone.fg, backgroundColor: tone.bg }}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="notifications-item-body">
                        <span className="notifications-item-title" style={{ color: tone.fg }}>
                          {item.title}
                        </span>
                        <span className="notifications-item-detail">{item.detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
