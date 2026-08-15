import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { User, Briefcase, MapPin, Phone, Linkedin, Rocket, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { profile, completeOnboarding } = useAuth();

  const [fullName, setFullName] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setProfessionalTitle(profile.professional_title || '');
      setLocation(profile.location || '');
      setPhone(profile.phone || '');
      setLinkedinUrl(profile.linkedin_url || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    try {
      setSubmitting(true);
      await completeOnboarding({
        full_name: fullName,
        professional_title: professionalTitle,
        location: location,
        phone: phone,
        linkedin_url: linkedinUrl
      });
      onComplete();
    } catch (err) {
      console.error('Onboarding submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipOptional = async () => {
    try {
      setSubmitting(true);
      await completeOnboarding({
        full_name: fullName || 'Job Seeker',
        professional_title: professionalTitle,
        location: location
      });
      onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Non-dismissible modal during onboarding
      title="Welcome to JobTrack!"
      maxWidth="540px"
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div 
          style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '16px', 
            backgroundColor: 'var(--primary-50)', 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            color: 'var(--primary-600)'
          }}
        >
          <Rocket size={28} />
        </div>
        <h3 style={{ fontSize: '1.375rem' }}>Let's Set Up Your Profile</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Tailor your career tracking workspace to get the most out of your job search.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            Full Name <span className="required">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={{ paddingLeft: '2.375rem' }}
              required
            />
          </div>
        </div>

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label">Professional Title</label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                className="input-control"
                placeholder="e.g. Frontend Developer"
                value={professionalTitle}
                onChange={e => setProfessionalTitle(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                className="input-control"
                placeholder="e.g. San Francisco, CA"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span></label>
          <div style={{ position: 'relative' }}>
            <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              type="tel"
              className="input-control"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ paddingLeft: '2.375rem' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">LinkedIn Profile URL <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span></label>
          <div style={{ position: 'relative' }}>
            <Linkedin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              type="url"
              className="input-control"
              placeholder="https://linkedin.com/in/yourname"
              value={linkedinUrl}
              onChange={e => setLinkedinUrl(e.target.value)}
              style={{ paddingLeft: '2.375rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleSkipOptional}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            Skip Optional Info
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !fullName}
            style={{ flex: 1.5 }}
          >
            {submitting ? 'Saving...' : 'Go to Dashboard'}
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </Modal>
  );
};
