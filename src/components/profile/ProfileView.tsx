import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../lib/dataService';
import { useToast } from '../../context/ToastContext';
import { User, Briefcase, MapPin, Phone, Linkedin, Mail, Save, ShieldCheck } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const onShowToast = addToast;

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
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>
          User Profile
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '2px' }}>
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
            borderBottom: '1px solid var(--border-color)',
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
              border: '3px solid var(--bg-surface)',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }}>
              {fullName || 'Job Tracker User'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--primary-600)', fontWeight: 600, marginTop: '2px' }}>
              {professionalTitle || 'Career Management Member'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '6px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={16} color="var(--emerald-600)" />
              <span>Isolated User Data active</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Read Only Email */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="profile-email-address-read-only">Email Address (Read-only)</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
              id="profile-email-address-read-only"
                type="email"
                className="input-control"
                value={user?.email || ''}
                disabled
                style={{ paddingLeft: '2.375rem', backgroundColor: 'var(--bg-subtle)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Your account email is managed by your authentication settings.
            </span>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="profile-full-name">
                Full Name <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input
              id="profile-full-name"
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
              <label className="form-label" htmlFor="profile-professional-title">Professional Title</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input
              id="profile-professional-title"
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
              <label className="form-label" htmlFor="profile-location">Location</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input
              id="profile-location"
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
              <label className="form-label" htmlFor="profile-phone-number">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                <input
              id="profile-phone-number"
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
            <label className="form-label" htmlFor="profile-linkedin-profile-url">LinkedIn Profile URL</label>
            <div style={{ position: 'relative' }}>
              <Linkedin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
              id="profile-linkedin-profile-url"
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
