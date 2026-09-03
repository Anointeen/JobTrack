import React from 'react';
import { CalendarPlus } from 'lucide-react';
import { Application, ApplicationStatus, CalendarEventType } from '../../types';
import { INTERVIEW_STAGE_EVENT_TYPE } from '../../lib/calendar';

interface AddToCalendarPromptProps {
  /** The interview stage the application has just moved into. */
  stage: ApplicationStatus;
  application: Application;
  onAdd: (prefill: {
    title: string;
    event_type: CalendarEventType;
    application_id: string;
  }) => void;
  onDismiss: () => void;
}

/**
 * The offer to schedule an interview stage the user has just moved an
 * application into.
 *
 * Shared by both routes that can change a status — the detail modal's status
 * panel and the edit form — so the wording, the pre-filled event and the
 * dismiss behaviour cannot drift apart between them. It was previously inline
 * in the detail modal only, which is why saving the edit form silently did
 * nothing.
 *
 * `role="status"` rather than `alert`: nothing has gone wrong. The status
 * change is already saved by the time this renders, and dismissing it changes
 * nothing.
 */
export const AddToCalendarPrompt: React.FC<AddToCalendarPromptProps> = ({
  stage,
  application,
  onAdd,
  onDismiss
}) => (
  <div className="calendar-prompt" role="status">
    <span className="calendar-prompt-icon" aria-hidden="true">
      <CalendarPlus size={18} />
    </span>

    <div className="calendar-prompt-body">
      <p className="calendar-prompt-title">
        Moved to {stage}. Put it on your calendar?
      </p>
      <p className="calendar-prompt-sub">
        We'll link the event to {application.job_title} at {application.company_name}.
      </p>
    </div>

    <div className="calendar-prompt-actions">
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() =>
          onAdd({
            title: `${stage} — ${application.company_name}`,
            event_type: INTERVIEW_STAGE_EVENT_TYPE[stage] ?? 'technical_interview',
            application_id: application.id
          })
        }
      >
        <CalendarPlus size={16} /> Add to Calendar
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss}>
        Not now
      </button>
    </div>
  </div>
);
