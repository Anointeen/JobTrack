import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicationStatus, ApplicationStatusHistory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useApplications } from '../../context/ApplicationsContext';
import { useApplicationForm } from '../../context/ApplicationFormContext';
import { StatCard } from '../common/StatCard';
import { SuccessRateCard } from './SuccessRateCard';
import { StatusPipeline } from './StatusPipeline';
import { RecentApplications } from './RecentApplications';
import { UpcomingDeadlines } from './UpcomingDeadlines';
import { InsightsPanel } from './InsightsPanel';
import { Briefcase, Activity, CalendarCheck, Award, XCircle } from 'lucide-react';
import { Skeleton } from '../common/Skeleton';
import { dataService } from '../../lib/dataService';
import { statusToSlug } from '../../lib/applicationFilters';
import { computeDashboardMetrics, computeAverageDaysToInterview } from '../../lib/dashboardMetrics';

export const DashboardView: React.FC = () => {
  const { profile, user } = useAuth();
  const { applications, loading } = useApplications();
  const { openCreateForm } = useApplicationForm();
  const navigate = useNavigate();

  // Status history powers the time-to-interview insight. Fetched once here, on
  // the only screen that needs it, rather than for the whole app.
  const [history, setHistory] = useState<ApplicationStatusHistory[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user || applications.length === 0) {
      setHistory([]);
      setHistoryLoaded(applications.length === 0);
      return;
    }
    void (async () => {
      try {
        const logs = await dataService.getAllStatusHistory(user.id);
        if (!cancelled) setHistory(logs);
      } catch (err) {
        console.error('Could not load status history for insights:', err);
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, applications.length]);

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Job Tracker';

  const metrics = useMemo(() => computeDashboardMetrics(applications), [applications]);
  const timeToInterview = useMemo(
    () => computeAverageDaysToInterview(applications, history),
    [applications, history]
  );

  /** Status pipeline and stat cards deep-link into the filtered list. */
  const goToApplications = (status?: ApplicationStatus | 'All') => {
    if (!status || status === 'All') {
      navigate('/applications');
      return;
    }
    navigate(`/applications?status=${statusToSlug(status)}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Welcome Banner */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>
          Welcome back, {userName} 👋
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Here's an overview of your job search.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard
            title="Total Applications"
            value={metrics.total}
            icon={Briefcase}
            color="indigo"
            subtitle="All tracked positions"
            onClick={() => goToApplications('All')}
          />
          <StatCard
            title="Active Applications"
            value={metrics.active}
            icon={Activity}
            color="sky"
            subtitle="Applied, Assessment & Interview"
            onClick={() => goToApplications('Applied')}
          />
          <StatCard
            title="Interviews"
            value={metrics.interviews}
            icon={CalendarCheck}
            color="amber"
            subtitle="Scheduled or in-progress"
            onClick={() => goToApplications('Interview')}
          />
          <StatCard
            title="Offers"
            value={metrics.offers}
            icon={Award}
            color="emerald"
            subtitle="Job offers received"
            onClick={() => goToApplications('Offer')}
          />
          <StatCard
            title="Rejected"
            value={metrics.rejected}
            icon={XCircle}
            color="rose"
            subtitle="Closed opportunities"
            onClick={() => goToApplications('Rejected')}
          />
        </div>
      )}

      {/* Derived insights — every value computed from the user's own records. */}
      <InsightsPanel
        metrics={metrics}
        averageDaysToInterview={timeToInterview.averageDays}
        interviewSampleSize={timeToInterview.sampleSize}
        historyLoaded={historyLoaded}
      />

      {/* Grid: Success Rate & Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <SuccessRateCard totalApplications={metrics.total} totalOffers={metrics.offers} />
        <StatusPipeline
          statusCounts={metrics.statusCounts}
          onSelectStatusFilter={st => goToApplications(st)}
        />
      </div>

      {/* Upcoming deadlines, only for opportunities still in play. */}
      <UpcomingDeadlines applications={metrics.upcomingDeadlines} />

      <RecentApplications
        applications={applications}
        onViewAll={() => goToApplications('All')}
        onAddApplication={openCreateForm}
      />
    </div>
  );
};
