import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, List, Plus, Briefcase, AlertCircle
} from 'lucide-react';
import { CalendarEvent, CalendarViewMode } from '../../types';
import { useCalendar } from '../../context/CalendarContext';
import { useApplications } from '../../context/ApplicationsContext';
import { useCalendarEventForm } from '../../context/CalendarEventFormContext';
import { EventTypeBadge } from './EventTypeBadge';
import { Skeleton } from '../common/Skeleton';
import {
  addMonths,
  buildMonthGrid,
  currentMonth,
  formatEventDate,
  formatEventTime,
  groupEventsByDay,
  linkedApplicationLabel,
  monthLabel,
  relativeDayLabel,
  upcomingEvents,
  WEEKDAY_NAMES
} from '../../lib/calendar';

/** How many events a month cell lists before collapsing into a "+N more". */
const MAX_EVENTS_PER_CELL = 3;

export const CalendarView: React.FC = () => {
  const { events, loading, loaded, error } = useCalendar();
  const { applications } = useApplications();
  const { openCreateEvent, openEditEvent } = useCalendarEventForm();

  const [mode, setMode] = useState<CalendarViewMode>('month');
  const [month, setMonth] = useState(currentMonth);

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);
  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const agenda = useMemo(() => upcomingEvents(events), [events]);

  const monthEventCount = useMemo(
    () => grid.filter(c => c.inMonth).reduce((n, c) => n + (eventsByDay.get(c.key)?.length ?? 0), 0),
    [grid, eventsByDay]
  );

  /** Opens the form for a new event on a specific day, at 9am local. */
  const addOnDay = (dayKey: string) => {
    const [y, m, d] = dayKey.split('-').map(Number);
    const at = new Date(y, m - 1, d, 9, 0, 0, 0);
    openCreateEvent({ event_date: at.toISOString() });
  };

  const renderLinkedApplication = (event: CalendarEvent) => {
    const label = linkedApplicationLabel(event, applications);
    if (!label) return null;
    return (
      <Link
        to={`/applications/${event.application_id}`}
        className="event-app-link"
      >
        <Briefcase size={12} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page header */}
      <div className="calendar-page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>
            Interview &amp; Deadline Calendar
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Schedule interviews, track technical assessments, and never miss an application deadline.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => openCreateEvent()}>
          <Plus size={18} /> Add Event
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="card"
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            borderColor: 'var(--rose-500)',
            backgroundColor: 'var(--meta-danger-bg)',
            color: 'var(--meta-danger-text)'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}

      {/* Toolbar: month stepper on the left, view toggle on the right */}
      <div className="calendar-toolbar">
        <div className="calendar-month-nav">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMonth(m => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>

          <h2 className="calendar-month-label" aria-live="polite">
            {monthLabel(month)}
          </h2>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMonth(m => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setMonth(currentMonth())}
          >
            Today
          </button>
        </div>

        {/* Radio group, not two buttons: these are two states of one setting,
            so arrow keys move between them and only the active one is tabbable. */}
        <div className="calendar-view-toggle" role="radiogroup" aria-label="Calendar view">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'month'}
            className={`calendar-view-option ${mode === 'month' ? 'is-active' : ''}`}
            onClick={() => setMode('month')}
          >
            <CalendarDays size={16} aria-hidden="true" /> Month
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'agenda'}
            className={`calendar-view-option ${mode === 'agenda' ? 'is-active' : ''}`}
            onClick={() => setMode('agenda')}
          >
            <List size={16} aria-hidden="true" /> Agenda
          </button>
        </div>
      </div>

      {loading && !loaded ? (
        <Skeleton height="520px" borderRadius="var(--radius-lg)" />
      ) : mode === 'month' ? (
        <section className="card calendar-card" aria-label={`${monthLabel(month)} calendar`}>
          <div className="calendar-weekdays" aria-hidden="true">
            {WEEKDAY_NAMES.map(d => (
              <div key={d} className="calendar-weekday">{d}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {grid.map(cell => {
              const dayEvents = eventsByDay.get(cell.key) ?? [];
              const shown = dayEvents.slice(0, MAX_EVENTS_PER_CELL);
              const overflow = dayEvents.length - shown.length;

              return (
                <div
                  key={cell.key}
                  className={`calendar-cell${cell.inMonth ? '' : ' is-outside'}${cell.isToday ? ' is-today' : ''}`}
                >
                  <div className="calendar-cell-head">
                    <span className="calendar-cell-day">
                      {cell.day}
                      {cell.isToday && <span className="sr-only"> (today)</span>}
                    </span>
                    <button
                      type="button"
                      className="calendar-cell-add"
                      onClick={() => addOnDay(cell.key)}
                      aria-label={`Add an event on ${formatEventDate(`${cell.key}T09:00:00`)}`}
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="calendar-cell-events">
                    {shown.map(event => (
                      <button
                        key={event.id}
                        type="button"
                        className="calendar-event-pill"
                        onClick={() => openEditEvent(event)}
                      >
                        <EventTypeBadge eventType={event.event_type} compact />
                        <span className="calendar-event-pill-time">
                          {formatEventTime(event.event_date)}
                        </span>
                        <span className="calendar-event-pill-title">{event.title}</span>
                      </button>
                    ))}

                    {overflow > 0 && (
                      <button
                        type="button"
                        className="calendar-cell-more"
                        onClick={() => setMode('agenda')}
                      >
                        +{overflow} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {loaded && monthEventCount === 0 && (
            <p className="calendar-month-empty">
              Nothing scheduled in {monthLabel(month)}. Use <strong>Add Event</strong>, or the
              + on any day, to put an interview or deadline on the calendar.
            </p>
          )}
        </section>
      ) : (
        <section className="card" aria-label="Upcoming events">
          <h2 style={{ fontSize: '1.125rem', color: 'var(--text-heading)', marginBottom: '0.25rem' }}>
            Upcoming events
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Everything still ahead of you, soonest first.
          </p>

          {agenda.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              No upcoming events. Anything you schedule will appear here, and past events stay
              visible in the month view.
            </p>
          ) : (
            <ul className="agenda-list">
              {agenda.map(event => (
                <li key={event.id}>
                  {/* The row is a container, not a control: it holds the "open
                      event" button *and* a link to the application, and one
                      interactive element may never nest inside another. */}
                  <div className="agenda-item">
                    <div className="agenda-when">
                      <span className="agenda-when-date">{formatEventDate(event.event_date)}</span>
                      <span className="agenda-when-time">{formatEventTime(event.event_date)}</span>
                      <span className="agenda-when-rel">{relativeDayLabel(event.event_date)}</span>
                    </div>

                    <div className="agenda-body">
                      <button
                        type="button"
                        className="agenda-title"
                        onClick={() => openEditEvent(event)}
                      >
                        {event.title}
                      </button>
                      <div className="agenda-meta">
                        <EventTypeBadge eventType={event.event_type} />
                        {renderLinkedApplication(event)}
                      </div>
                      {event.notes && <p className="agenda-notes">{event.notes}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
