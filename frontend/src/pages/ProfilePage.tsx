import React from 'react';
import { translations, type LangType } from '../lib/locale';
import { Shield, ShieldCheck, Phone, CreditCard, FileText, Globe, CheckCircle2, Award, Calendar, Leaf, ArrowLeft, User as UserIcon } from 'lucide-react';

interface ProfilePageProps {
  profileName: string;
  setProfileName: (v: string) => void;
  profilePhone: string;
  setProfilePhone: (v: string) => void;
  profileAadhar: string;
  setProfileAadhar: (v: string) => void;
  profileLandPaper: string;
  setProfileLandPaper: (v: string) => void;
  profilePic: string;
  setProfilePic: (v: string) => void;
  handleProfileUpdate: (e: React.FormEvent) => void;
  setActiveTab: (tab: any) => void;
  farmsList: any[];
  insurancePolicies: any[];
  carbonCredits: any[];
  bookings: any[];
  lang: LangType;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  profileName,
  setProfileName,
  profilePhone,
  setProfilePhone,
  profileAadhar,
  setProfileAadhar,
  profileLandPaper,
  setProfileLandPaper,
  profilePic,
  setProfilePic,
  handleProfileUpdate,
  setActiveTab,
  farmsList,
  insurancePolicies,
  carbonCredits,
  bookings,
  lang,
}) => {
  const t = translations[lang];

  // Calculate live stats
  const totalPlots = farmsList?.length || 0;
  const totalInsuranceCoverage = insurancePolicies?.reduce((acc, p) => acc + Number(p.coverage_amount || 0), 0) || 0;
  const totalCarbonCredits = carbonCredits?.reduce((acc, c) => acc + Number(c.metric_tons_co2 || 0), 0) || 0;
  const activeBookingsCount = bookings?.filter(b => b.status === 'pending' || b.status === 'scheduled').length || 0;

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* Premium Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-gov)', paddingBottom: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-deep)', fontWeight: 800, margin: 0 }}>
            {t.profileTitle}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Manage agricultural credentials, verified land plots, and credentials ledger.
          </p>
        </div>
        <button 
          onClick={() => setActiveTab('field')} 
          className="btn btn-secondary" 
          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          {t.backToMap}
        </button>
      </div>

      {/* Stats Widgets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }} className="grid-2">
        <div className="glass-panel" style={{ padding: '1rem', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderColor: '#bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#22c55e', color: '#ffffff', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', color: '#15803d', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>Registered Lands</span>
            <strong style={{ fontSize: '1.1rem', color: '#14532d' }}>{totalPlots} {totalPlots === 1 ? 'Plot' : 'Plots'}</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderColor: '#bfdbfe', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#3b82f6', color: '#ffffff', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', color: '#1d4ed8', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>Insurance Shield</span>
            <strong style={{ fontSize: '1.1rem', color: '#1e3a8a' }}>₹{totalInsuranceCoverage.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', borderColor: '#99f6e4', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#0d9488', color: '#ffffff', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', color: '#0f766e', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>Carbon Offset</span>
            <strong style={{ fontSize: '1.1rem', color: '#115e59' }}>{totalCarbonCredits.toFixed(2)} MT</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', borderColor: '#fed7aa', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#ea580c', color: '#ffffff', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.65rem', color: '#c2410c', display: 'block', fontWeight: 800, textTransform: 'uppercase' }}>Fleet Bookings</span>
            <strong style={{ fontSize: '1.1rem', color: '#7c2d12' }}>{activeBookingsCount} Active</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem' }} className="grid-2 animate-fade-up">
        
        {/* Left Column: Official Digital Certificate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Certificate Panel */}
          <div 
            className="glass-panel" 
            style={{ 
              background: '#ffffff',
              border: '2px solid #15803d', 
              borderRadius: '16px',
              padding: '1.25rem',
              position: 'relative',
              boxShadow: '0 4px 15px rgba(21, 128, 61, 0.08)'
            }}
          >
            {/* Header Stamp Ribbon */}
            <div 
              style={{ 
                position: 'absolute', top: 0, right: '20px', 
                background: '#15803d', color: '#ffffff', 
                padding: '8px 12px', fontSize: '0.62rem', 
                fontWeight: 800, textTransform: 'uppercase',
                borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px',
                letterSpacing: '0.05em', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Verified Citizen
            </div>

            {/* Ministry Text */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.58rem', display: 'block', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>
                Government of India
              </span>
              <strong style={{ fontSize: '0.72rem', display: 'block', color: 'var(--primary-deep)', textTransform: 'uppercase' }}>
                Kisan Digital Registration ID
              </strong>
            </div>

            {/* User Info with Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <img 
                  src={profilePic || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'} 
                  alt="Profile avatar" 
                  style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #15803d', padding: '3px', background: '#ffffff' }} 
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'; }}
                />
                <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: '#15803d', color: '#ffffff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #ffffff' }}>
                  <ShieldCheck size={12} />
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-dark)', fontWeight: 800, margin: 0 }}>
                  {profileName || 'Jayesh Mahajan'}
                </h3>
                <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#e8f5e9', padding: '2px 10px', borderRadius: '20px', fontWeight: 800, marginTop: '4px', display: 'inline-block' }}>
                  Active Farmer Node
                </span>
              </div>
            </div>

            {/* Credentials Audit Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Aadhar Identification:</span>
                </div>
                {profileAadhar ? (
                  <span style={{ color: '#166534', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Verified
                  </span>
                ) : (
                  <span style={{ color: '#c2410c', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ● Pending
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Land Registry Deed:</span>
                </div>
                {profileLandPaper ? (
                  <span style={{ color: '#166534', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Linked
                  </span>
                ) : (
                  <span style={{ color: '#c2410c', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ● Unlinked
                  </span>
                )}
              </div>
            </div>

            {/* Verification Notice */}
            <div style={{ display: 'flex', gap: '6px', fontSize: '0.68rem', color: '#64748b', marginTop: '1rem', fontStyle: 'italic' }}>
              <ShieldCheck size={14} style={{ color: '#15803d', flexShrink: 0 }} />
              <span>Cryptographically signed by Central Ministry database ledger node.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Fields Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 15px rgba(15, 23, 42, 0.05)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-deep)', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '1rem' }}>
            Update Registration Metadata
          </h4>
          
          <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: '4px' }}>
                <UserIcon size={14} style={{ color: 'var(--primary-emerald)' }} />
                {t.profileName}
              </label>
              <input 
                type="text" 
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Sukhdev Singh"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: '4px' }}>
                <Phone size={14} style={{ color: 'var(--primary-emerald)' }} />
                {t.profilePhone}
              </label>
              <input 
                type="text" 
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="e.g. 9876543210"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: '4px' }}>
                <CreditCard size={14} style={{ color: 'var(--primary-emerald)' }} />
                {t.profileAadhar}
              </label>
              <input 
                type="text" 
                value={profileAadhar}
                onChange={(e) => setProfileAadhar(e.target.value)}
                placeholder="12-Digit Aadhar Card No."
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: '4px' }}>
                <FileText size={14} style={{ color: 'var(--primary-emerald)' }} />
                {t.profileLandPaper}
              </label>
              <input 
                type="text" 
                value={profileLandPaper}
                onChange={(e) => setProfileLandPaper(e.target.value)}
                placeholder="e.g. L-98120/Registry Code"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: '4px' }}>
                <Globe size={14} style={{ color: 'var(--primary-emerald)' }} />
                Profile Avatar Link
              </label>
              <input 
                type="text" 
                value={profilePic}
                onChange={(e) => setProfilePic(e.target.value)}
                placeholder="Avatar URL"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                marginTop: '6px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.85rem',
                background: 'var(--primary-deep)',
                borderColor: 'var(--primary-deep)'
              }}
            >
              {t.profileSubmit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
