import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Application, ApplicationStatus, JobType } from '../../types';
import { Building2, Briefcase, MapPin, Calendar, Link as LinkIcon, User, Mail } from 'lucide-react';

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  initialData?: Application | null;
}

export const ApplicationFormModal: React.FC<ApplicationFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [applicationDate, setApplicationDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState<JobType>('Full-time');
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');
  const [deadline, setDeadline] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCompanyName(initialData.company_name);
      setJobTitle(initialData.job_title);
      setStatus(initialData.status);
      setApplicationDate(initialData.application_date || new Date().toISOString().split('T')[0]);
      setLocation(initialData.location || '');
      setJobType(initialData.job_type || 'Full-time');
      setJobPostingUrl(initialData.job_posting_url || '');
      setSalaryMin(initialData.salary_min ? String(initialData.salary_min) : '');
      setSalaryMax(initialData.salary_max ? String(initialData.salary_max) : '');
      setDeadline(initialData.deadline || '');
      setRecruiterName(initialData.recruiter_name || '');
      setRecruiterEmail(initialData.recruiter_email || '');
      setNotes(initialData.notes || '');
    } else {
      // Reset form
      setCompanyName('');
      setJobTitle('');
      setStatus('Applied');
      setApplicationDate(new Date().toISOString().split('T')[0]);
      setLocation('');
      setJobType('Full-time');
      setJobPostingUrl('');
      setSalaryMin('');
      setSalaryMax('');
      setDeadline('');
      setRecruiterName('');
      setRecruiterEmail('');
      setNotes('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!companyName.trim()) errs.companyName = 'Company name is required.';
    if (!jobTitle.trim()) errs.jobTitle = 'Job title is required.';
    if (!applicationDate) errs.applicationDate = 'Application date is required.';

    if (jobPostingUrl.trim()) {
      try {
        new URL(jobPostingUrl);
      } catch {
        errs.jobPostingUrl = 'Please enter a valid URL (e.g. https://company.com/job).';
      }
    }

    if (recruiterEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recruiterEmail)) {
        errs.recruiterEmail = 'Please enter a valid email address.';
      }
    }

    // The checks below mirror the database CHECK constraints added in migration
    // 0001 (applications_salary_range_check and
    // applications_deadline_after_application_date_check). Catching them here
    // gives a readable message instead of a raw Postgres 23514 error; the
    // constraints remain the authoritative integrity layer.
    const min = salaryMin.trim() ? parseFloat(salaryMin) : null;
    const max = salaryMax.trim() ? parseFloat(salaryMax) : null;

    if (min !== null && (Number.isNaN(min) || min < 0)) {
      errs.salaryMin = 'Minimum salary must be a number of 0 or more.';
    }
    if (max !== null && (Number.isNaN(max) || max < 0)) {
      errs.salaryMax = 'Maximum salary must be a number of 0 or more.';
    }
    if (
      min !== null && max !== null &&
      !Number.isNaN(min) && !Number.isNaN(max) &&
      min >= 0 && max >= 0 && max < min
    ) {
      errs.salaryMax = 'Maximum salary cannot be lower than minimum salary.';
    }

    // Both are ISO YYYY-MM-DD strings, so a string comparison is a correct
    // date comparison and avoids timezone drift from Date parsing.
    if (deadline && applicationDate && deadline < applicationDate) {
      errs.deadline = 'Deadline cannot be earlier than the application date.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      await onSave({
        company_name: companyName.trim(),
        job_title: jobTitle.trim(),
        status,
        application_date: applicationDate,
        location: location.trim() || undefined,
        job_type: jobType,
        job_posting_url: jobPostingUrl.trim() || undefined,
        salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
        salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
        deadline: deadline || undefined,
        recruiter_name: recruiterName.trim() || undefined,
        recruiter_email: recruiterEmail.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'We couldn\'t save your application. Please check your internet connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions: ApplicationStatus[] = [
    'Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'
  ];

  const jobTypeOptions: JobType[] = [
    'Full-time', 'Part-time', 'Contract', 'Internship', 'Graduate Program', 'Temporary', 'Freelance', 'Other'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Job Application' : 'Add New Application'}
      maxWidth="680px"
    >
      {errors.form && (
        <div 
          style={{ 
            padding: '0.75rem 1rem', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--rose-50)', 
            border: '1px solid var(--rose-200)',
            color: 'var(--rose-700)',
            fontSize: '0.84375rem',
            marginBottom: '1rem'
          }}
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Required Fields Section */}
        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label">
              Company Name <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="text"
                className={`input-control ${errors.companyName ? 'input-error' : ''}`}
                placeholder="e.g. Stripe"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
                required
              />
            </div>
            {errors.companyName && <span className="form-error">{errors.companyName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Job Title <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="text"
                className={`input-control ${errors.jobTitle ? 'input-error' : ''}`}
                placeholder="e.g. Senior Frontend Engineer"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
                required
              />
            </div>
            {errors.jobTitle && <span className="form-error">{errors.jobTitle}</span>}
          </div>
        </div>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label">
              Status <span className="required">*</span>
            </label>
            <select
              className="input-control"
              value={status}
              onChange={e => setStatus(e.target.value as ApplicationStatus)}
            >
              {statusOptions.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Application Date <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="date"
                className="input-control"
                value={applicationDate}
                onChange={e => setApplicationDate(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
                required
              />
            </div>
          </div>
        </div>

        {/* Optional Job Information */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--slate-200)', margin: '1.25rem 0' }} />
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
          Job & Location Details (Optional)
        </h4>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label">Location</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="text"
                className="input-control"
                placeholder="e.g. San Francisco, CA (Remote)"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Job Type</label>
            <select
              className="input-control"
              value={jobType}
              onChange={e => setJobType(e.target.value as JobType)}
            >
              {jobTypeOptions.map(jt => (
                <option key={jt} value={jt}>{jt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Job Posting URL</label>
          <div style={{ position: 'relative' }}>
            <LinkIcon size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
            <input
              type="url"
              className={`input-control ${errors.jobPostingUrl ? 'input-error' : ''}`}
              placeholder="https://company.com/careers/job-id"
              value={jobPostingUrl}
              onChange={e => setJobPostingUrl(e.target.value)}
              style={{ paddingLeft: '2.375rem' }}
            />
          </div>
          {errors.jobPostingUrl && <span className="form-error">{errors.jobPostingUrl}</span>}
        </div>

        <div className="form-row form-row-3">
          <div className="form-group">
            <label className="form-label">Salary Min ($/yr)</label>
            <input
              type="number"
              min="0"
              className={`input-control ${errors.salaryMin ? 'input-error' : ''}`}
              placeholder="e.g. 140000"
              value={salaryMin}
              onChange={e => setSalaryMin(e.target.value)}
            />
            {errors.salaryMin && <span className="form-error">{errors.salaryMin}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Salary Max ($/yr)</label>
            <input
              type="number"
              min="0"
              className={`input-control ${errors.salaryMax ? 'input-error' : ''}`}
              placeholder="e.g. 180000"
              value={salaryMax}
              onChange={e => setSalaryMax(e.target.value)}
            />
            {errors.salaryMax && <span className="form-error">{errors.salaryMax}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Application Deadline</label>
            <input
              type="date"
              className={`input-control ${errors.deadline ? 'input-error' : ''}`}
              value={deadline}
              min={applicationDate || undefined}
              onChange={e => setDeadline(e.target.value)}
            />
            {errors.deadline && <span className="form-error">{errors.deadline}</span>}
          </div>
        </div>

        {/* Recruiter Details */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--slate-200)', margin: '1.25rem 0' }} />
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
          Recruiter Contact Info (Optional)
        </h4>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label">Recruiter Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Sarah Jenkins"
                value={recruiterName}
                onChange={e => setRecruiterName(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Recruiter Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="email"
                className={`input-control ${errors.recruiterEmail ? 'input-error' : ''}`}
                placeholder="recruiter@company.com"
                value={recruiterEmail}
                onChange={e => setRecruiterEmail(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>
            {errors.recruiterEmail && <span className="form-error">{errors.recruiterEmail}</span>}
          </div>
        </div>

        {/* Notes */}
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="form-label">Notes & Prep Remarks</label>
          <textarea
            className="input-control"
            rows={3}
            placeholder="Add interview preparation notes, referral contact info, or assessment details..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Saving Application...' : (initialData ? 'Update Application' : 'Save Application')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
