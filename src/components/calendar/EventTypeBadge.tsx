import React from 'react';
import { CalendarEventType } from '../../types';
import { EVENT_TYPE_LABEL, EVENT_TYPE_TONE } from '../../lib/calendar';

interface EventTypeBadgeProps {
  eventType: CalendarEventType;
  /** Drops the label to a dot-and-tooltip where space is tight. */
  compact?: boolean;
}

/**
 * The coloured badge identifying an event's type.
 *
 * Built on the shared `.chip` class so it inherits the same shape, padding and
 * ellipsis behaviour as the priority and tag chips elsewhere; only the colour
 * role differs. Colour is never the sole carrier of meaning — the label is
 * always present, and in compact mode it survives as the accessible name.
 */
export const EventTypeBadge: React.FC<EventTypeBadgeProps> = ({ eventType, compact = false }) => {
  const label = EVENT_TYPE_LABEL[eventType] ?? EVENT_TYPE_LABEL.other;
  const tone = EVENT_TYPE_TONE[eventType] ?? EVENT_TYPE_TONE.other;

  if (compact) {
    return (
      <span className={`evt-dot ${tone}`} title={label}>
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <span className={`chip ${tone}`}>
      <span className="chip-text">{label}</span>
    </span>
  );
};
