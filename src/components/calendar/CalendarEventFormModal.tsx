import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import {
  Application,
  CalendarEvent,
  CalendarEventInput,
  CalendarEventType,
  CALENDAR_EVENT_TYPES,
  DEFAULT_REMINDER_MINUTES,
  REMINDER_OPTIONS
} from '../../types';
import {
  defaultEventDateTimeValue,
  fromDateTimeLocalValue,
  toDateTimeLocalValue
} from '../../lib/calendar';
import { CalendarClock, Search, Trash2, Type as TypeIcon } from 'lucide-react';

/** What the caller can pre-fill when opening the form for a new event. */
export interface CalendarEventPrefill {
  title?: string;
  event_type?: CalendarEventType;
  application_id?: string | null;
  /** Full ISO timestamp. Defaults to the next round hour when omitted. */
  event_date?: string;
  notes?: string | null;
}

interface CalendarEventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CalendarEventInput) => Promise<void>;
  /** Present when editing; null when creating. */
  initialData?: CalendarEvent | null;
  /** Only consulted when creating. */
  prefill?: CalendarEventPrefill | null;
  /** Applications the event may be linked to. */
  applications: Application[];
  /** Omitted when creating — there is nothing to delete yet. */
  onDelete?: (event: CalendarEvent) => Promise<void>;
}

/**
 * Add/edit form for a calendar event, and the delete affordance for an
 * existing one.
 *
 * Follows ApplicationFormModal: native controls throughout, a `validate()` that
 * mirrors the database CHECK constraints so the user reads a sentence rather
 * than a raw PostgreSQL error, and `onSave` rethrowing so the modal stays open
 * and shows the failure inline.
 */
export const CalendarEventFormModal: React.FC<CalendarEventFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  prefill,
  applications,
  onDelete
}) => {
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('phone_screen');
  const [eventDate, setEventDate] = useState('');
  const [applicationId, setApplicationId] = useState<string>('');
  const [applicationQuery, setApplicationQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [remindEnabled, setRemindEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState<number>(DEFAULT_REMINDER_MINUTES);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setEventType(initialData.event_type);
      setEventDate(toDateTimeLocalValue(initialData.event_date));
      setApplicationId(initialData.application_id || '');
      setNotes(initialData.notes || '');
      // null means "no reminder"; 0 is a real value meaning "at the start", so
      // the two must not be collapsed with a falsy check.
      const minutes = initialData.reminder_minutes_before;
      setRemindEnabled(minutes !== null && minutes !== undefined);
      setReminderMinutes(minutes ?? DEFAULT_REMINDER_MINUTES);
    } else {
      setTitle(prefill?.title || '');
      setEventType(prefill?.event_type || 'phone_screen');
      setEventDate(
        prefill?.event_date
          ? toDateTimeLocalValue(prefill.event_date)
          : defaultEventDateTimeValue()
      );
      setApplicationId(prefill?.application_id || '');
      setNotes(prefill?.notes || '');
      setRemindEnabled(true);
      setReminderMinutes(DEFAULT_REMINDER_MINUTES);
    }
    setApplicationQuery('');
    setErrors({});
    setConfirmingDelete(false);
  }, [initialData, prefill, isOpen]);

  /**
   * Applications offered by the picker, narrowed by the filter box.
   *
   * The currently linked application is always kept in the list even when it
   * does not match the filter — otherwise typing in the filter would silently
   * blank a link the user had already made.
   */
  const visibleApplications = useMemo(() => {
    const q = applicationQuery.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(
      a =>
        a.id === applicationId ||
        `${a.job_title} ${a.company_name}`.toLowerCase().includes(q)
    );
  }, [applications, applicationQuery, applicationId]);

  const validate = () => {
    const errs: Record<string, string> = {};

    // Mirrors the length(trim(title)) > 0 CHECK from migration 0004.
    if (!title.trim()) errs.title = 'Give the event a title.';

    if (!eventDate.trim()) {
      errs.eventDate = 'Choose a date and time for this event.';
    } else if (!fromDateTimeLocalValue(eventDate)) {
      errs.eventDate = 'That date and time could not be read. Please re-enter it.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const iso = fromDateTimeLocalValue(eventDate);
    if (!iso) return;

    try {
      setSubmitting(true);
      await onSave({
        title: title.trim(),
        event_type: eventType,
        event_date: iso,
        // null, not undefined: undefined keys are dropped before reaching
        // PostgREST, so clearing a link or a note has to be explicit.
        application_id: applicationId || null,
        notes: notes.trim() || null,
        reminder_minutes_before: remindEnabled ? reminderMinutes : null
      });
      onClose();
    } catch (err: any) {
      setErrors({
        form: err?.message || 'We couldn\'t save this event. Please check your connection and try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    try {
      setSubmitting(true);
      await onDelete(initialData);
      onClose();
    } catch (err: any) {
      setErrors({ form: err?.message || 'This event could not be deleted.' });
      setConfirmingDelete(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Event' : 'Add Calendar Event'}
      maxWidth="620px"
    >
      {errors.form && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--meta-danger-bg)',
            border: '1px solid var(--rose-200)',
            color: 'var(--meta-danger-text)',
            fontSize: '0.84375rem',
            marginBottom: '1rem'
          }}
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="event-title">
            Title <span className="required">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <TypeIcon
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
            />
            <input
              id="event-title"
              type="text"
              className={`input-control ${errors.title ? 'input-error' : ''}`}
              placeholder="e.g. Technical interview with the platform team"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ paddingLeft: '2.375rem' }}
              required
            />
          </div>
          {errors.title && <span className="form-error">{errors.title}</span>}
        </div>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="event-type">
              Event Type <span className="required">*</span>
            </label>
            <select
              id="event-type"
              className="input-control"
              value={eventType}
              onChange={e => setEventType(e.target.value as CalendarEventType)}
            >
              {CALENDAR_EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-date">
              Date &amp; Time <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <CalendarClock
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
              />
              <input
                id="event-date"
                type="datetime-local"
                className={`input-control ${errors.eventDate ? 'input-error' : ''}`}
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
                required
              />
            </div>
            {errors.eventDate && <span className="form-error">{errors.eventDate}</span>}
          </div>
        </div>

        {/* Linked application. A filter box narrows a native select rather than
            pulling in a combobox dependency — the same reasoning that kept the
            tag editor hand-rolled. */}
        <fieldset className="event-link-fieldset">
          <legend className="form-label">
            Linked Application{' '}
            <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span>
          </legend>

          {applications.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
              You have no applications yet, so there is nothing to link this event to.
            </p>
          ) : (
            <>
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
                />
                <input
                  id="event-application-search"
                  type="search"
                  className="input-control"
                  placeholder="Search your applications..."
                  value={applicationQuery}
                  onChange={e => setApplicationQuery(e.target.value)}
                  aria-label="Search applications"
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>

              <label className="sr-only" htmlFor="event-application">Linked application</label>
              <select
                id="event-application"
                className="input-control"
                value={applicationId}
                onChange={e => setApplicationId(e.target.value)}
              >
                <option value="">Not linked to an application</option>
                {visibleApplications.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.job_title} at {a.company_name}
                  </option>
                ))}
              </select>

              {applicationQuery.trim() && visibleApplications.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  No applications match "{applicationQuery.trim()}".
                </span>
              )}
            </>
          )}
        </fieldset>

        {/* Reminder */}
        <fieldset className="event-link-fieldset">
          <legend className="form-label">Reminder</legend>

          <label className="event-reminder-toggle" htmlFor="event-reminder-enabled">
            <input
              id="event-reminder-enabled"
              type="checkbox"
              checked={remindEnabled}
              onChange={e => setRemindEnabled(e.target.checked)}
            />
            <span>Remind me before this event</span>
          </label>

          {remindEnabled && (
            <>
              <label className="sr-only" htmlFor="event-reminder-minutes">Remind me</label>
              <select
                id="event-reminder-minutes"
                className="input-control"
                value={reminderMinutes}
                onChange={e => setReminderMinutes(Number(e.target.value))}
                style={{ marginTop: '0.5rem' }}
              >
                {REMINDER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </>
          )}

          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.375rem' }}>
            Reminders appear in the notifications menu in the header once the
            event comes due.
          </span>
        </fieldset>

        <div className="form-group">
          <label className="form-label" htmlFor="event-notes">Notes</label>
          <textarea
            id="event-notes"
            className="input-control"
            rows={4}
            placeholder={'Interviewer names, dial-in details, what to prepare.\n\nLine breaks are preserved.'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical', minHeight: '96px', lineHeight: 1.5 }}
          />
        </div>

        <div
          style={{
            display: 'flex', gap: '0.75rem', alignItems: 'center',
            justifyContent: 'flex-end', marginTop: '1.5rem', flexWrap: 'wrap'
          }}
        >
          {initialData && onDelete && (
            confirmingDelete ? (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  marginRight: 'auto', flexWrap: 'wrap'
                }}
              >
                <span style={{ fontSize: '0.8125rem', color: 'var(--meta-danger-text)' }}>
                  Delete this event?
                </span>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={submitting}
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmingDelete(true)}
                disabled={submitting}
                style={{ marginRight: 'auto', color: 'var(--meta-danger-text)' }}
              >
                <Trash2 size={16} /> Delete event
              </button>
            )
          )}

          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : (initialData ? 'Update Event' : 'Save Event')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
