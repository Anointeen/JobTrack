import React from 'react';
import { Application, ApplicationStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../common/StatCard';
import { SuccessRateCard } from './SuccessRateCard';
import { StatusPipeline } from './StatusPipeline';
import { RecentApplications } from './RecentApplications';
import { Briefcase, Activity, CalendarCheck, Award, XCircle } from 'lucide-react';
import { Skeleton } from '../common/Skeleton';

interface DashboardViewProps {
  applications: Application[];
  loading: boolean;
  onNavigateToApplications: (statusFilter?: ApplicationStatus | 'All') => void;
  onOpenAddApplication: () => void;
  onSelectApplication: (app: Application) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  applications,
  loading,
  onNavigateToApplications,
  onOpenAddApplication,
  onSelectApplication
}) => {
  const { profile, user } = useAuth();

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Job Tracker';

  // Calculate dynamic stats
  const totalApps = applications.length;

  const activeApps = applications.filter(a => 
    a.status === 'Applied' || a.status === 'Assessment' || a.status === 'Interview'
  ).length;

  const interviewApps = applications.filter(a => a.status === 'Interview').length;
  const offerApps = applications.filter(a => a.status === 'Offer').length;
  const rejectedApps = applications.filter(a => a.status === 'Rejected').length;

  // Status counts record
  const statusCounts: Record<ApplicationStatus, number> = {
    Saved: 0,
    Applied: 0,
    Assessment: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
    Withdrawn: 0
  };

  applications.forEach(a => {
    if (statusCounts[a.status] !== undefined) {
      statusCounts[a.status] += 1;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Welcome Banner */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
          Welcome back, {userName} 👋
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--slate-600)', marginTop: '4px' }}>
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
        /* Statistics Cards Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard
            title="Total Applications"
            value={totalApps}
            icon={Briefcase}
            color="indigo"
            subtitle="All tracked positions"
            onClick={() => onNavigateToApplications('All')}
          />
          <StatCard
            title="Active Applications"
            value={activeApps}
            icon={Activity}
            color="sky"
            subtitle="Applied, Assessment & Interview"
            onClick={() => onNavigateToApplications('Applied')}
          />
          <StatCard
            title="Interviews"
            value={interviewApps}
            icon={CalendarCheck}
            color="amber"
            subtitle="Scheduled or in-progress"
            onClick={() => onNavigateToApplications('Interview')}
          />
          <StatCard
            title="Offers"
            value={offerApps}
            icon={Award}
            color="emerald"
            subtitle="Job offers received"
            onClick={() => onNavigateToApplications('Offer')}
          />
          <StatCard
            title="Rejected"
            value={rejectedApps}
            icon={XCircle}
            color="rose"
            subtitle="Closed opportunities"
            onClick={() => onNavigateToApplications('Rejected')}
          />
        </div>
      )}

      {/* Grid: Success Rate & Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <SuccessRateCard
          totalApplications={totalApps}
          totalOffers={offerApps}
        />
        <StatusPipeline
          statusCounts={statusCounts}
          onSelectStatusFilter={st => onNavigateToApplications(st)}
        />
      </div>

      {/* Recent Applications Section */}
      <RecentApplications
        applications={applications}
        onViewAll={() => onNavigateToApplications('All')}
        onAddApplication={onOpenAddApplication}
        onSelectApplication={onSelectApplication}
      />
    </div>
  );
};
