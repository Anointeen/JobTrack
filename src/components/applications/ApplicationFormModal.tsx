import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  Application,
  ApplicationInput,
  ApplicationPriority,
  ApplicationSource,
  ApplicationStatus,
  APPLICATION_PRIORITIES,
  APPLICATION_SOURCES,
  JobType
} from '../../types';
import { normaliseTag, hasTag } from '../../lib/applicationFilters';
import { TagList } from './ApplicationMetadata';
import {
  Building2, Briefcase, MapPin, Calendar, Link as LinkIcon, User, Mail,
  Flag, Tag as TagIcon, CalendarClock, Plus
} from 'lucide-react';

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ApplicationInput) => Promise<void>;
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

  // --- Metadata (migration 0002) ---
  const [priority, setPriority] = useState<ApplicationPriority>('Medium');
  const [source, setSource] = useState<ApplicationSource | ''>('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [tagNotice, setTagNotice] = useState('');

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
      setPriority(initialData.priority || 'Medium');
      setSource(initialData.source || '');
      setFollowUpDate(initialData.follow_up_date || '');
      setFollowUpNote(initialData.follow_up_note || '');
      setTags(initialData.tags ? [...initialData.tags] : []);
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
      // Matches the database defaults from migration 0002.
      setPriority('Medium');
      setSource('');
      setFollowUpDate('');
      setFollowUpNote('');
      setTags([]);
    }
    setTagDraft('');
    setTagNotice('');
    setErrors({});
  }, [initialData, isOpen]);

  /**
   * Adds one or more tags from the draft input.
   *
   * Whitespace is trimmed and collapsed, commas split multiple tags at once,
   * and duplicates are rejected case-insensitively so "Remote" and "remote"
   * cannot both end up on the same application.
   */
  const commitTagDraft = () => {
    const candidates = tagDraft.split(',').map(normaliseTag).filter(Boolean);
    if (candidates.length === 0) {
      setTagDraft('');
      return;
    }

    const accepted: string[] = [];
    const rejected: string[] = [];
    const next = [...tags];

    for (const candidate of candidates) {
      if (hasTag(next, candidate)) {
        rejected.push(candidate);
        continue;
      }
      next.push(candidate);
      accepted.push(candidate);
    }

    setTags(next);
    setTagDraft('');
    setTagNotice(
      rejected.length > 0
        ? `Already added: ${rejected.join(', ')}`
        : accepted.length > 1
          ? `Added ${accepted.length} tags.`
          : ''
    );
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
    setTagNotice('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter and comma commit; Enter must not submit the surrounding form.
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTagDraft();
      return;
    }
    // Backspace on an empty input removes the last tag, a common chip idiom.
    if (e.key === 'Backspace' && tagDraft === '' && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  };

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

    // Mirrors applications_follow_up_after_application_date_check from
    // migration 0002, so the user sees this sentence rather than a raw
    // PostgreSQL 23514 constraint violation.
    if (followUpDate && applicationDate && followUpDate < applicationDate) {
      errs.followUpDate = 'Follow-up date cannot be earlier than the application date.';
    }

    // A note with no date would be silently unreachable: nothing surfaces a
    // follow-up note unless there is a date to attach it to.
    if (followUpNote.trim() && !followUpDate) {
      errs.followUpDate = 'Add a follow-up date so this note can be scheduled.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // A tag still sitting in the input is clearly intended — commit it rather
    // than silently discarding it on submit.
    const pendingTags = tagDraft.split(',').map(normaliseTag).filter(Boolean);
    const finalTags = [...tags];
    for (const candidate of pendingTags) {
      if (!hasTag(finalTags, candidate)) finalTags.push(candidate);
    }
    if (pendingTags.length > 0) {
      setTags(finalTags);
      setTagDraft('');
    }

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
        notes: notes.trim() || undefined,
        // Metadata. `null` (not undefined) clears an optional value on update,
        // since undefined keys are dropped before reaching PostgREST.
        priority,
        source: source || null,
        tags: finalTags,
        follow_up_date: followUpDate || null,
        follow_up_note: followUpNote.trim() || null
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
              <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
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
              <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
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
              <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
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
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.25rem 0' }} />
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          Job & Location Details (Optional)
        </h4>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label">Location</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
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
            <LinkIcon size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
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
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.25rem 0' }} />
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          Recruiter Contact Info (Optional)
        </h4>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label">Recruiter Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
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
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
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

        {/* Tracking metadata */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.25rem 0' }} />
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          Tracking &amp; Follow-up
        </h4>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="application-priority">Priority</label>
            <div style={{ position: 'relative' }}>
              <Flag size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <select
                id="application-priority"
                className="input-control"
                value={priority}
                onChange={e => setPriority(e.target.value as ApplicationPriority)}
                style={{ paddingLeft: '2.375rem' }}
              >
                {APPLICATION_PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="application-source">
              Source <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <select
              id="application-source"
              className="input-control"
              value={source}
              onChange={e => setSource(e.target.value as ApplicationSource | '')}
            >
              <option value="">Not specified</option>
              {APPLICATION_SOURCES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label" htmlFor="application-follow-up-date">
              Follow-up Date <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <CalendarClock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                id="application-follow-up-date"
                type="date"
                className={`input-control ${errors.followUpDate ? 'input-error' : ''}`}
                value={followUpDate}
                min={applicationDate || undefined}
                onChange={e => setFollowUpDate(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>
            {errors.followUpDate && <span className="form-error">{errors.followUpDate}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="application-follow-up-note">
              Follow-up Note <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              id="application-follow-up-note"
              type="text"
              className="input-control"
              placeholder="e.g. Email Sarah if there is no reply"
              value={followUpNote}
              onChange={e => setFollowUpNote(e.target.value)}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label className="form-label" htmlFor="application-tag-input">
            Tags <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span>
          </label>

          {tags.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <TagList tags={tags} onRemove={removeTag} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
              <TagIcon size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                id="application-tag-input"
                type="text"
                className="input-control"
                placeholder="e.g. Dream Job, Remote, Referral"
                value={tagDraft}
                onChange={e => { setTagDraft(e.target.value); setTagNotice(''); }}
                onKeyDown={handleTagKeyDown}
                onBlur={commitTagDraft}
                aria-describedby="application-tag-help"
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={commitTagDraft}
              disabled={!tagDraft.trim()}
            >
              <Plus size={16} /> Add
            </button>
          </div>

          <span id="application-tag-help" style={{ fontSize: '0.75rem', color: tagNotice ? 'var(--amber-600)' : 'var(--text-subtle)' }}>
            {tagNotice || 'Press Enter or comma to add. Tags are your own labels — duplicates are ignored.'}
          </span>
        </div>

        {/* Notes */}
        <div className="form-group" style={{ marginTop: '0.5rem' }}>
          <label className="form-label" htmlFor="application-notes">Notes &amp; Prep Remarks</label>
          <textarea
            id="application-notes"
            className="input-control"
            rows={6}
            placeholder={
              'Add interview preparation notes, referral contacts, or assessment details.\n\n' +
              'Line breaks are preserved.'
            }
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ resize: 'vertical', minHeight: '120px', lineHeight: 1.5 }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
            {notes.trim().length > 0
              ? `${notes.trim().length} character${notes.trim().length === 1 ? '' : 's'}`
              : 'Optional — your notes stay private to your account.'}
          </span>
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
