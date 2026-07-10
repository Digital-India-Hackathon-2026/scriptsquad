import React from 'react';
import { User, LogOut, Layers, Globe, Shield } from 'lucide-react';
import { translations, type LangType } from '../../lib/locale';

interface NavbarProps {
  currentUser: any | null;
  farmsList: any[];
  activeFarmIndex: number;
  setActiveFarmIndex: (idx: number) => void;
  onLogout: () => void;
  lang: LangType;
  setLang: (lang: LangType) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  farmsList,
  activeFarmIndex,
  setActiveFarmIndex,
  onLogout,
  lang,
  setLang,
}) => {
  const t = translations[lang];

  return (
    <header
      style={{
        background: '#ffffff',
        borderBottom: '3px solid var(--primary-emerald)',
        padding: '0.65rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        height: '70px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
      }}
    >
      {/* Official Government Emblem / Title Insignia Block */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            background: 'var(--primary-deep)',
            color: '#ffffff',
            padding: '0.50rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Shield size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-deep)', letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: '1.2' }}>
            {t.appTitle}
          </h1>
          <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.02em', fontWeight: 700, lineHeight: '1.1' }}>
            {t.appSubtitle} • {t.appGovt}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            
            {/* Language Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
              <Globe size={14} style={{ color: 'var(--text-muted)' }} />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as LangType)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-body)',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: '2px 0',
                }}
              >
                <option value="en">English (EN)</option>
                <option value="hi">हिंदी (HI)</option>
                <option value="mr">मराठी (MR)</option>
                <option value="te">తెలుగు (TE)</option>
              </select>
            </div>

            {/* Global Active Plot Selector */}
            {farmsList.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-gov)',
                }}
              >
                <Layers size={13} style={{ color: 'var(--primary-emerald)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-body)' }}>{t.activePlot}:</span>
                <select
                  value={activeFarmIndex}
                  onChange={(e) => setActiveFarmIndex(Number(e.target.value))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '2px 0',
                  }}
                >
                  {farmsList.filter(Boolean).map((f, idx) => (
                    <option key={idx} value={idx}>
                      {f?.location_name || 'Unnamed Plot'} ({f?.primary_crop || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User credentials */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                paddingLeft: '1rem',
                borderLeft: '1px solid var(--border-gov)',
              }}
            >
              <User size={15} style={{ color: 'var(--primary-emerald)' }} />
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-dark)',
                }}
              >
                {currentUser.name}
              </span>
              <button
                onClick={onLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--danger)',
                  marginLeft: '0.5rem',
                  padding: '2px',
                }}
                title={t.logout}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            {t.secureSystem}
          </span>
        )}
      </div>
    </header>
  );
};

export default Navbar;
