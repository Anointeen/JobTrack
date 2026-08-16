import React from 'react';
import { TrendingUp, CalendarDays, Timer, Reply } from 'lucide-react';
import { DashboardMetrics } from '../../lib/dashboardMetrics';

interface InsightsPanelProps {
  metrics: DashboardMetrics;
  averageDaysToInterview: number | null;
  interviewSampleSize: number;
  historyLoaded: boolean;
}

interface Insight {
  icon: any;
  label: string;
  /** null renders the insufficient-data note instead of a value. */
  value: string | null;
  hint: string;
  unavailable: string;
}

/**
 * Derived job-search insights.
 *
 * Every figure is computed from the user's own applications and status history.
 * Where there is not enough data to compute a figure honestly, the card says so
 * instead of showing a zero that would read as a real result.
 */
export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  metrics,
  averageDaysToInterview,
  interviewSampleSize,
  historyLoaded
}) => {
  const pct = (value: number | null) => (value === null ? null : `${value}%`);

  const insights: Insight[] = [
    {
      icon: CalendarDays,
      label: 'Applications sent',
      value: `${metrics.lastSevenDays}`,
      hint: `in the last 7 days · ${metrics.lastThirtyDays} in the last 30`,
      unavailable: ''
    },
    {
      icon: Reply,
      label: 'Response rate',
      value: pct(metrics.responseRate),
      hint: `${metrics.responded} of ${metrics.submitted} submitted applications got a reply`,
      unavailable: 'Available once you have submitted an application'
    },
    {
      icon: TrendingUp,
      label: 'Interview rate',
      value: pct(metrics.interviewRate),
      hint: `${metrics.interviews} of ${metrics.submitted} reached interview stage`,
      unavailable: 'Available once you have submitted an application'
    },
    {
      icon: Timer,
      label: 'Avg. days to interview',
      value:
        !historyLoaded
          ? null
          : averageDaysToInterview === null
            ? null
            : `${averageDaysToInterview}`,
      hint:
        interviewSampleSize > 0
          ? `based on ${interviewSampleSize} application${interviewSampleSize === 1 ? '' : 's'}`
          : '',
      unavailable: historyLoaded
        ? 'Available once an application reaches interview'
        : 'Loading…'
    }
  ];

  return (
    <section aria-label="Job search insights">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1rem'
        }}
      >
        {insights.map(insight => {
          const Icon = insight.icon;
          const hasValue = insight.value !== null;
          return (
            <div key={insight.label} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <span
                  style={{
                    width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--primary-50)', color: 'var(--primary-text)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon size={17} />
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {insight.label}
                </span>
              </div>

              {hasValue ? (
                <>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1.1 }}>
                    {insight.value}
                  </p>
                  {insight.hint && (
                    <p style={{ fontSize: '0.78125rem', color: 'var(--text-subtle)', marginTop: '0.375rem', lineHeight: 1.4 }}>
                      {insight.hint}
                    </p>
                  )}
                </>
              ) : (
                <p style={{ fontSize: '0.84375rem', color: 'var(--text-subtle)', lineHeight: 1.45, fontStyle: 'italic' }}>
                  {insight.unavailable}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
