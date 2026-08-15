import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Application, ApplicationStatus, ApplicationStatusHistory } from '../../types';
import { Badge } from '../common/Badge';
import { StatusHistoryTimeline } from './StatusHistoryTimeline';
import { dataService } from '../../lib/dataService';
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  ExternalLink, 
  DollarSign, 
  Calendar, 
  User, 
  Mail, 
  FileText, 
  Edit3, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface ApplicationDetailModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onStatusChanged: (updatedApp: Application) => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChanged
}) => {
  if (!application) return null;

  const [history, setHistory] = useState<ApplicationStatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>(application.status);
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (application && isOpen) {
      setNewStatus(application.status);
      setShowStatusChange(false);
      setShowDeleteConfirm(false);
      loadHistory();
    }
  }, [application, isOpen]);

  const loadHistory = async () => {
    if (!application) return;
    setLoadingHistory(true);
    try {
      const logs = await dataService.getStatusHistory(application.user_id, application.id);
      setHistory(logs);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!application || newStatus === application.status) return;
    setUpdatingStatus(true);
    try {
      const updated = await dataService.updateApplication(application.user_id, application.id, {
        status: newStatus
      });
      if (statusNote) {
        await dataService.recordStatusHistory(application.user_id, {
          application_id: application.id,
          previous_status: application.status,
          new_status: newStatus,
          note: statusNote
        });
      }
      onStatusChanged(updated);
      setShowStatusChange(false);
      setStatusNote('');
      await loadHistory();
    } catch (err) {
      console.error('Status change error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()} / year`;
    if (min) return `From $${min.toLocaleString()} / year`;
    return `Up to $${max?.toLocaleString()} / year`;
  };

  const allStatuses: ApplicationStatus[] = [
    'Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={application.job_title}
      maxWidth="720px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={16} /> Delete
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                onClose();
                onEdit(application);
              }}
            >
              <Edit3 size={16} /> Edit Application
            </button>
          </div>
        </div>
      }
    >
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {application.job_title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
            <Building2 size={18} color="var(--primary-600)" />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-600)' }}>
              {application.company_name}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <Badge status={application.status} size="md" />
          <button
            onClick={() => setShowStatusChange(!showStatusChange)}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.78125rem', padding: '2px 8px' }}
          >
            Change Status
          </button>
        </div>
      </div>

      {/* Status Change Drawer Form */}
      {showStatusChange && (
        <div 
          style={{ 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--primary-50)', 
            border: '1px solid var(--primary-200)',
            marginBottom: '1.5rem'
          }}
        >
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-700)', marginBottom: '0.75rem' }}>
            Update Application Status
          </h4>
          <div className="form-group">
            <label className="form-label">New Status</label>
            <select
              className="input-control"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as ApplicationStatus)}
            >
              {allStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status Change Note <span style={{ color: 'var(--slate-400)', fontWeight: 400 }}>(Optional)</span></label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Completed technical round with engineering team."
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowStatusChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleUpdateStatus}
              disabled={updatingStatus || newStatus === application.status}
            >
              {updatingStatus ? 'Updating...' : 'Save New Status'}
            </button>
          </div>
        </div>
      )}

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ padding: '1rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.8125rem', marginBottom: '4px' }}>
            <MapPin size={16} /> Location
          </div>
          <p style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{application.location || 'Remote / Unspecified'}</p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.8125rem', marginBottom: '4px' }}>
            <Briefcase size={16} /> Job Type
          </div>
          <p style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{application.job_type}</p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.8125rem', marginBottom: '4px' }}>
            <DollarSign size={16} /> Salary Range
          </div>
          <p style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{formatSalary(application.salary_min, application.salary_max)}</p>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.8125rem', marginBottom: '4px' }}>
            <Calendar size={16} /> Application Date
          </div>
          <p style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{formatDate(application.application_date)}</p>
        </div>
      </div>

      {/* Posting Link & Recruiter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {application.job_posting_url && (
          <div style={{ padding: '0.875rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--slate-500)' }}>Job Posting URL</span>
            <div style={{ marginTop: '4px' }}>
              <a 
                href={application.job_posting_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600 }}
              >
                View Listing <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}

        {(application.recruiter_name || application.recruiter_email) && (
          <div style={{ padding: '0.875rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
            <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--slate-500)' }}>Recruiter Contact</span>
            <div style={{ marginTop: '4px', fontSize: '0.875rem', color: 'var(--slate-900)' }}>
              {application.recruiter_name && <div><strong>{application.recruiter_name}</strong></div>}
              {application.recruiter_email && (
                <a href={`mailto:${application.recruiter_email}`} style={{ fontSize: '0.8125rem', color: 'var(--primary-600)' }}>
                  {application.recruiter_email}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {application.notes && (
        <div style={{ marginBottom: '1.75rem' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--slate-500)" /> Application Notes
          </h4>
          <div 
            style={{ 
              padding: '1rem', 
              borderRadius: 'var(--radius-md)', 
              backgroundColor: 'var(--slate-50)', 
              border: '1px solid var(--slate-200)',
              fontSize: '0.875rem',
              color: 'var(--slate-700)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6
            }}
          >
            {application.notes}
          </div>
        </div>
      )}

      {/* Status History Section */}
      <div>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--slate-500)" /> Status Progression & History Log
        </h4>
        <StatusHistoryTimeline history={history} />
      </div>

      {/* Delete Confirmation Sub-Modal */}
      {showDeleteConfirm && (
        <div 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.75)', 
            backdropFilter: 'blur(2px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 10
          }}
        >
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--rose-50)', color: 'var(--rose-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertTriangle size={24} />
            </div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Delete Application?</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
              Are you sure you want to delete this application for <strong>{application.job_title}</strong> at <strong>{application.company_name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => {
                  onDelete(application.id);
                  onClose();
                }}
                style={{ flex: 1 }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
