import React, { useState } from 'react';
import { ShieldCheck, Shield } from 'lucide-react';

interface LandingPageProps {
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  authEmail: string;
  setAuthEmail: (v: string) => void;
  authPassword: string;
  setAuthPassword: (v: string) => void;
  authName: string;
  setAuthName: (v: string) => void;
  authPhone: string;
  setAuthPhone: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAdminLogin: (username: string, password: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authName,
  setAuthName,
  authPhone,
  setAuthPhone,
  onSubmit,
  onAdminLogin,
}) => {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdminLogin(adminUser, adminPass);
  };

  return (
    <section style={{ maxWidth: '440px', margin: '5rem auto', padding: '2.5rem' }} className="glass-panel">
      <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
        <div style={{ background: 'var(--primary-mint)', color: 'var(--primary-deep)', padding: '1rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1.25rem' }}>
          <ShieldCheck size={36} />
        </div>
        <h2 style={{ fontSize: '1.6rem', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>AGRIXMBD Cloud Login</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sign in to access your custom soil diagnostics twin.</p>
      </div>

      {!showAdminPanel ? (
        <>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {authMode === 'register' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sukhdev Singh"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Email address</label>
              <input
                type="email"
                placeholder="name@farm.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem' }}>
              {authMode === 'login' ? 'Login' : 'Register Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              style={{ background: 'none', border: 'none', color: 'var(--primary-emerald)', fontWeight: 800, cursor: 'pointer' }}
            >
              {authMode === 'login' ? 'Register here' : 'Login here'}
            </button>
          </div>

          {/* Admin Login Option */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-gov)', paddingTop: '1.25rem' }}>
            <button
              onClick={() => setShowAdminPanel(true)}
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                color: '#f8fafc',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(30,41,59,0.25)'
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Shield size={16} /> Login as Admin
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Admin Login Panel */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ background: '#1e293b', color: '#f8fafc', padding: '0.6rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} /> Admin Access Panel
            </div>
          </div>

          <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Admin Username</label>
              <input
                type="text"
                placeholder="Enter admin username"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Admin Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
              Login as Admin
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={() => setShowAdminPanel(false)}
              style={{ background: 'none', border: 'none', color: 'var(--primary-emerald)', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ← Back to User Login
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default LandingPage;
