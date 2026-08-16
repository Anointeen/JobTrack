import React from 'react';
import { 
  Briefcase, 
  LayoutDashboard, 
  CalendarCheck, 
  Compass, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface LandingPageProps {
  onOpenSignup: () => void;
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSignup, onOpenLogin }) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div style={{ backgroundColor: 'var(--bg-app)', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--text-main)' }}>
      {/* Navigation Topbar */}
      <header
        className="landing-header"
        style={{
          height: '72px',
          borderBottom: '1px solid var(--border-color)', 
          padding: '0 2rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--bg-surface)',
          backdropFilter: 'blur(8px)',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              backgroundColor: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Briefcase size={22} />
          </div>
          <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-heading)', fontFamily: 'var(--font-heading)' }}>
            JobTrack
          </span>
        </div>

        <div className="landing-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={toggleTheme}
            style={{ padding: '8px', borderRadius: '50%', color: 'var(--text-muted)' }}
            title={resolvedTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {resolvedTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={onOpenLogin} className="btn btn-ghost">
            Log In
          </button>
          <button onClick={onOpenSignup} className="btn btn-primary" style={{ boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)' }}>
            {/* The full label cannot fit beside the brand and Log In on a
                375px screen; the short form keeps the row within the viewport. */}
            <span className="landing-cta-full">Start Tracking Jobs</span>
            <span className="landing-cta-short">Sign Up</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        style={{ 
          padding: '5rem 1.5rem 4rem 1.5rem', 
          background: resolvedTheme === 'dark' 
            ? 'radial-gradient(100% 100% at 50% 0%, rgba(79, 70, 229, 0.12) 0%, rgba(9, 13, 22, 0) 100%)'
            : 'radial-gradient(100% 100% at 50% 0%, var(--primary-50) 0%, rgba(255, 255, 255, 0) 100%)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          {/* Badge */}
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.375rem 1rem', 
              borderRadius: 'var(--radius-full)', 
              backgroundColor: 'var(--primary-50)', 
              border: '1px solid var(--primary-200)',
              color: 'var(--primary-text)',
              fontSize: '0.84375rem',
              fontWeight: 600,
              marginBottom: '1.5rem'
            }}
          >
            <Sparkles size={16} />
            <span>The All-In-One Career Management Platform</span>
          </div>

          <h1 
            style={{ 
              fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
              fontWeight: 800, 
              lineHeight: 1.15, 
              color: 'var(--text-heading)',
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem'
            }}
          >
            Take Control of Your Job Search
          </h1>

          <p 
            style={{ 
              fontSize: 'clamp(1.125rem, 2vw, 1.375rem)', 
              color: 'var(--text-muted)', 
              lineHeight: 1.6, 
              maxWidth: '720px', 
              margin: '0 auto 2.5rem auto' 
            }}
          >
            Track every application, stay organized, monitor your progress, and manage your career journey from one powerful platform.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={onOpenSignup} 
              className="btn btn-primary btn-lg"
              style={{ boxShadow: '0 6px 20px rgba(79, 70, 229, 0.4)', padding: '1rem 2rem' }}
            >
              Start Tracking Jobs
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={onOpenLogin} 
              className="btn btn-secondary btn-lg"
              style={{ padding: '1rem 2rem' }}
            >
              Log In
            </button>
          </div>

          {/* Social Proof Badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginTop: '3rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <CheckCircle2 size={18} color="var(--emerald-500)" />
              <span>100% Free Core Tracking</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <ShieldCheck size={18} color="var(--primary-text)" />
              <span>Private & Isolated User Data</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <TrendingUp size={18} color="var(--amber-500)" />
              <span>Data-Driven Analytics</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview Graphic */}
        <div style={{ maxWidth: '1100px', margin: '3.5rem auto 0 auto', padding: '0 1rem' }}>
          <div 
            style={{ 
              borderRadius: 'var(--radius-lg)', 
              boxShadow: 'var(--shadow-xl)',
              backgroundColor: 'var(--bg-surface)',
              overflow: 'hidden',
              border: '1px solid var(--border-color)'
            }}
          >
            {/* Header bar mock */}
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ marginLeft: '1rem', fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'monospace' }}>
                app.jobtrack.io/dashboard
              </span>
            </div>

            {/* Dashboard content teaser mock */}
            <div style={{ padding: '2rem', backgroundColor: 'var(--bg-app)', textAlign: 'left' }}>
              <div className="landing-mock-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Applications</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>24</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Interviews</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--amber-500)' }}>4</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Offers Received</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--emerald-500)' }}>2</p>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Success Rate</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-text)' }}>8.3%</p>
                </div>
              </div>

              {/* Status pipeline preview */}
              <div style={{ padding: '1.25rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-heading)' }}>Application Status Pipeline</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Live Updating</span>
                </div>
                <div className="landing-mock-pipeline" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.5rem', textAlign: 'center' }}>
                  <div style={{ padding: '0.5rem', background: 'var(--badge-saved-bg)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--badge-saved-text)', fontWeight: 600 }}>Saved</span>
                    <p style={{ fontWeight: 800, color: 'var(--badge-saved-text)' }}>5</p>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'var(--badge-applied-bg)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--badge-applied-text)', fontWeight: 600 }}>Applied</span>
                    <p style={{ fontWeight: 800, color: 'var(--badge-applied-text)' }}>10</p>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'var(--badge-assessment-bg)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--badge-assessment-text)', fontWeight: 600 }}>Assessment</span>
                    <p style={{ fontWeight: 800, color: 'var(--badge-assessment-text)' }}>3</p>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'var(--badge-interview-bg)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--badge-interview-text)', fontWeight: 600 }}>Interview</span>
                    <p style={{ fontWeight: 800, color: 'var(--badge-interview-text)' }}>4</p>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'var(--badge-offer-bg)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--badge-offer-text)', fontWeight: 600 }}>Offer</span>
                    <p style={{ fontWeight: 800, color: 'var(--badge-offer-text)' }}>2</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-subtle)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 4rem auto' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-heading)' }}>
              Everything You Need to Succeed
            </h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>
              Built specifically for ambitious professionals who want total visibility over their job search.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            {[
              { icon: Briefcase, bg: 'var(--primary-50)', color: 'var(--primary-text)', title: 'Application Tracking', desc: 'Keep all job applications organized in one place. Store company details, recruiters, salaries, deadlines, and posting links effortlessly.' },
              { icon: LayoutDashboard, bg: 'var(--emerald-50)', color: 'var(--emerald-600)', title: 'Career Dashboard', desc: 'See your job search progress and key statistics at a glance. Track conversion rates, active interview funnels, and offer timelines.' },
              { icon: CalendarCheck, bg: 'var(--amber-50)', color: 'var(--amber-600)', title: 'Stay Organized', desc: 'Track interviews, assessments, deadlines, notes, and application status changes with complete historical timeline logging.' },
              { icon: Compass, bg: 'var(--purple-50)', color: 'var(--purple-600)', title: 'Career Management', desc: 'Build a central place for managing your entire job search and career journey, prepared to scale into CV matching and preparation tools.' }
            ].map(({ icon: Icon, bg, color, title, desc }) => (
              <div key={title} className="card card-hover">
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <Icon size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-heading)' }}>{title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section 
        style={{ 
          padding: '4.5rem 1.5rem', 
          backgroundColor: resolvedTheme === 'dark' ? '#111827' : 'var(--slate-900)', 
          color: '#ffffff',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '1rem' }}>
            Ready to Accelerate Your Career?
          </h2>
          <p style={{ fontSize: '1.125rem', color: '#94a3b8', marginBottom: '2rem' }}>
            Join thousands of job seekers taking control of their applications today.
          </p>
          <button 
            onClick={onOpenSignup} 
            className="btn btn-primary btn-lg"
            style={{ boxShadow: '0 6px 20px rgba(79, 70, 229, 0.5)' }}
          >
            Start Tracking Jobs Now
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer 
        style={{ 
          padding: '2rem 1.5rem', 
          backgroundColor: resolvedTheme === 'dark' ? '#111827' : '#0f172a', 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          color: '#94a3b8',
          fontSize: '0.875rem',
          textAlign: 'center'
        }}
      >
        <p>© {new Date().getFullYear()} JobTrack. Built for job seekers everywhere.</p>
      </footer>
    </div>
  );
};
