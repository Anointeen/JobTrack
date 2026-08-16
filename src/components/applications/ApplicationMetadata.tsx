import React from 'react';
import { Flag, CalendarClock, X } from 'lucide-react';
import { ApplicationPriority } from '../../types';
import { daysUntil, followUpState, FollowUpState } from '../../lib/applicationFilters';

/** Priority maps onto the shared danger/warn/neutral chip tones. */
const PRIORITY_TONE: Record<ApplicationPriority, string> = {
  High: 'chip-danger',
  Medium: 'chip-warn',
  Low: 'chip-neutral'
};

interface PriorityChipProps {
  priority: ApplicationPriority;
  /** Hide the icon where space is tight, e.g. dense table cells. */
  showIcon?: boolean;
}

export const PriorityChip: React.FC<PriorityChipProps> = ({ priority, showIcon = true }) => (
  <span
    className={`chip ${PRIORITY_TONE[priority] ?? 'chip-neutral'}`}
    title={`${priority} priority`}
  >
    {showIcon && <Flag size={11} aria-hidden="true" />}
    <span className="chip-text">{priority}</span>
    <span className="sr-only"> priority</span>
  </span>
);

const FOLLOW_UP_TONE: Record<Exclude<FollowUpState, 'none'>, string> = {
  overdue: 'chip-danger',
  today: 'chip-warn',
  upcoming: 'chip-neutral'
};

/** Human wording for each follow-up state. Deterministic, no relative fuzz. */
export const followUpLabel = (date: string): string => {
  const state = followUpState(date);
  const days = daysUntil(date);
  if (state === 'none' || days === null) return '';
  if (state === 'overdue') {
    const overdueBy = Math.abs(days);
    return `Follow-up overdue by ${overdueBy} day${overdueBy === 1 ? '' : 's'}`;
  }
  if (state === 'today') return 'Follow up today';
  return `Follow up in ${days} day${days === 1 ? '' : 's'}`;
};

interface FollowUpChipProps {
  followUpDate?: string | null;
  /** Shortened wording for dense contexts such as the desktop table. */
  compact?: boolean;
}

/**
 * Renders nothing at all when no follow-up date is set — the absence of a
 * follow-up is not a state worth showing a placeholder for.
 */
export const FollowUpChip: React.FC<FollowUpChipProps> = ({ followUpDate, compact = false }) => {
  const state = followUpState(followUpDate);
  if (state === 'none' || !followUpDate) return null;

  const days = daysUntil(followUpDate) ?? 0;
  const full = followUpLabel(followUpDate);
  const short =
    state === 'overdue'
      ? `Overdue ${Math.abs(days)}d`
      : state === 'today'
        ? 'Today'
        : `In ${days}d`;

  return (
    <span className={`chip ${FOLLOW_UP_TONE[state]}`} title={full}>
      <CalendarClock size={11} aria-hidden="true" />
      <span className="chip-text">{compact ? short : full}</span>
    </span>
  );
};

interface TagListProps {
  tags: readonly string[];
  /** When provided each tag gains a remove control (form editing mode). */
  onRemove?: (tag: string) => void;
  /** Cap rendering and show a "+N" chip; used to keep list rows tidy. */
  max?: number;
}

export const TagList: React.FC<TagListProps> = ({ tags, onRemove, max }) => {
  if (!tags || tags.length === 0) return null;

  const shown = typeof max === 'number' ? tags.slice(0, max) : tags;
  const hidden = tags.length - shown.length;

  return (
    <span className="chip-list">
      {shown.map(tag => (
        <span key={tag} className="chip chip-tag">
          <span className="chip-text">{tag}</span>
          {onRemove && (
            <button
              type="button"
              className="chip-remove"
              onClick={() => onRemove(tag)}
              aria-label={`Remove tag ${tag}`}
              title={`Remove ${tag}`}
            >
              <X size={11} aria-hidden="true" />
            </button>
          )}
        </span>
      ))}
      {hidden > 0 && (
        <span className="chip chip-neutral" title={tags.slice(shown.length).join(', ')}>
          <span className="chip-text">+{hidden}</span>
        </span>
      )}
    </span>
  );
};
