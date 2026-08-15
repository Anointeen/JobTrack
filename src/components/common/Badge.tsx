import React from 'react';
import { ApplicationStatus } from '../../types';

interface BadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const getStatusClass = (st: ApplicationStatus) => {
    switch (st) {
      case 'Saved': return 'badge-saved';
      case 'Applied': return 'badge-applied';
      case 'Assessment': return 'badge-assessment';
      case 'Interview': return 'badge-interview';
      case 'Offer': return 'badge-offer';
      case 'Rejected': return 'badge-rejected';
      case 'Withdrawn': return 'badge-withdrawn';
      default: return 'badge-saved';
    }
  };

  return (
    <span className={`badge ${getStatusClass(status)} ${size === 'sm' ? 'text-xs' : ''}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
};
