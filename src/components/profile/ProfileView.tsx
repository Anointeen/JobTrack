import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../lib/dataService';
import { User, Briefcase, MapPin, Phone, Linkedin, Mail, Save, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ProfileViewProps {
  onShowToast: (type: 'success' | 'error', title: string, message: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onShowToast }) => {
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setProfessionalTitle(profile.professional_title || '');
      setLocation(profile.location || '');
      setPhone(profile.phone || '');
      setLinkedinUrl(profile.linkedin_url || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName.trim()) {
      onShowToast('error', 'Validation Error', 'Full Name is required.');
      return;
    }

    try {
      setSaving(true);
      await dataService.updateProfile(user.id, {
        full_name: fullName.trim(),
        professional_title: professionalTitle.trim(),
        location: location.trim(),
        phone: phone.trim(),
        linkedin_url: linkedinUrl.trim(),
        avatar_url: avatarUrl.trim()
      });
      await refreshProfile();
      onShowToast('success', 'Profile Updated', 'Your profile details have been saved successfully.');
    } catch (err: any) {
      onShowToast('error', 'Update Failed', err.message || 'Could not save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
          User Profile
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)', marginTop: '2px' }}>
          Manage your personal information and career credentials.
        </p>
      </div>

      <div className="card">
        {/* Profile Avatar Card Banner */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.25rem', 
            paddingBottom: '1.5rem', 
            borderBottom: '1px solid var(--slate-200)',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}
        >
          <div 
            style={{ 
              width: '72px', 
              height: '72px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-100)', 
              color: 'var(--primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.75rem',
              border: '3px solid #ffffff',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              {fullName || 'Job Tracker User'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--primary-600)', fontWeight: 600, marginTop: '2px' }}>
              {professionalTitle || 'Career Management Member'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '6px', fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
              <ShieldCheck size={16} color="var(--emerald-600)" />
              <span>Isolated User Data active</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Read Only Email */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Email Address (Read-only)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="email"
                className="input-control"
                value={user?.email || ''}
                disabled
                style={{ paddingLeft: '2.375rem', backgroundColor: 'var(--slate-100)', cursor: 'not-allowed', color: 'var(--slate-600)' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
              Your account email is managed by your authentication settings.
            </span>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
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

            <div className="form-group">
              <label className="form-label">Professional Title</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. Senior Product Designer"
                  value={professionalTitle}
                  onChange={e => setProfessionalTitle(e.target.value)}
                  style={{ paddingLeft: '2.375rem' }}
                />
              </div>
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Location</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. Austin, TX"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  style={{ paddingLeft: '2.375rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input
                  type="tel"
                  className="input-control"
                  placeholder="+1 (555) 012-3456"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ paddingLeft: '2.375rem' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">LinkedIn Profile URL</label>
            <div style={{ position: 'relative' }}>
              <Linkedin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="url"
                className="input-control"
                placeholder="https://linkedin.com/in/alexmorgan"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              <Save size={18} />
              <span>{saving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
