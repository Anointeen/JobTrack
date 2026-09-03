import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowRight, Plus } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';
import { useApplications } from '../../context/ApplicationsContext';
import { useCalendarEventForm } from '../../context/CalendarEventFormContext';
import { EventTypeBadge } from '../calendar/EventTypeBadge';
import {
  eventsWithinDays,
  formatEventDate,
  formatEventTime,
  linkedApplicationLabel,
  relativeDayLabel
} from '../../lib/calendar';

/** The window the widget covers, and how many events it will list. */
const WINDOW_DAYS = 7;
const LIMIT = 5;

/**
 * The next few calendar events, on the dashboard.
 *
 * Reads the same CalendarProvider the calendar screen does, so the two can
 * never disagree, and shows only what is still ahead — a past interview is
 * history, not an upcoming commitment.
 */
export const UpcomingThisWeek: React.FC = () => {
  const { events, loaded } = useCalendar();
  const { applications } = useApplications();
  const { openCreateEvent } = useCalendarEventForm();

  const withinWindow = useMemo(() => eventsWithinDays(events, WINDOW_DAYS), [events]);
  const shown = withinWindow.slice(0, LIMIT);

  return (
    <section className="card" aria-labelledby="upcoming-week-heading">
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '0.75rem', flexWrap: 'wrap', marginBottom: shown.length ? '1.25rem' : '0.75rem'
        }}
      >
        <div>
          <h3
            id="upcoming-week-heading"
            style={{
              fontSize: '1.125rem', color: 'var(--text-heading)',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <CalendarClock size={20} color="var(--primary-text)" />
            Upcoming This Week
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Interviews and deadlines in the next {WINDOW_DAYS} days
          </p>
        </div>

        <Link to="/calendar" className="btn btn-outline btn-sm">
          {withinWindow.length > LIMIT ? `View all ${withinWindow.length}` : 'Open calendar'}
          <ArrowRight size={14} />
        </Link>
      </div>

      {shown.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            {loaded
              ? 'Nothing scheduled in the next week. Add an interview or a deadline and it will appear here.'
              : 'Loading your calendar…'}
          </p>
          {loaded && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openCreateEvent()}>
              <Plus size={16} /> Add an event
            </button>
          )}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {shown.map(event => {
            const appLabel = linkedApplicationLabel(event, applications);
            return (
              <li key={event.id}>
                <Link to="/calendar" className="upcoming-week-item">
                  <span className="upcoming-week-when">
                    <span className="upcoming-week-rel">{relativeDayLabel(event.event_date)}</span>
                    <span className="upcoming-week-time">{formatEventTime(event.event_date)}</span>
                  </span>

                  <span className="upcoming-week-body">
                    <span className="upcoming-week-title">{event.title}</span>
                    <span className="upcoming-week-sub">
                      {formatEventDate(event.event_date)}
                      {appLabel ? ` · ${appLabel}` : ''}
                    </span>
                  </span>

                  <EventTypeBadge eventType={event.event_type} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
