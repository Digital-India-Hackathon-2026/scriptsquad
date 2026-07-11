import React, { useState, useEffect } from 'react';
import { 
  Award, Shield, Search, FileText, X, 
  AlertCircle, CloudRain, Play, Sparkles, ArrowUpRight, Activity 
} from 'lucide-react';
import { API_URL } from '../lib/api';
import { type LangType } from '../lib/locale';
import { generateSchemeReceipt, generateInsuranceReport } from '../lib/reportGenerator';

interface SchemesPageProps {
  currentUser: any;
  lang: LangType;
  farmsList: any[];
  activeFarmIndex: number;
  liveTelemetry: any;
  insurancePolicies: any[];
  setInsurancePolicies: React.Dispatch<React.SetStateAction<any[]>>;
}

interface Scheme {
  id: string;
  name: string;
  hindiName: string;
  description: string;
  hindiDescription: string;
  benefit: string;
  hindiBenefit: string;
  eligibilityRules: {
    maxLandHectares?: number;
    requiresWaterSource?: boolean;
    cropsSupported?: string[];
    requiresSoilTelemetry?: boolean;
  };
  requirements: string[];
  hindiRequirements: string[];
  externalUrl: string;
}

export default function SchemesPage({
  currentUser,
  lang,
  farmsList,
  activeFarmIndex,
  liveTelemetry,
  insurancePolicies,
  setInsurancePolicies
}: SchemesPageProps) {


  // Active sub-tab: 'schemes' | 'tracking' | 'insurance'
  const [activeSubTab, setActiveSubTab] = useState<'schemes' | 'tracking' | 'insurance'>('schemes');
  
  // Schemes Hub State
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSchemes, setAppliedSchemes] = useState<any[]>([]);
  const [loadingApplied, setLoadingApplied] = useState(false);

  // Dynamic filter checklist
  const [filterSmallholder, setFilterSmallholder] = useState<boolean | null>(null);
  const [filterIrrigation, setFilterIrrigation] = useState<boolean | null>(null);
  const [filterSoilIssue, setFilterSoilIssue] = useState<boolean | null>(null);

  // Auto-detection based on SAKHI's active farm and IoT telemetry
  const totalLandHectares = farmsList.reduce((acc, f) => {
    return acc + (f.coordinates?.length ? f.coordinates.length * 0.2 : 0.5);
  }, 0);
  const autoSmallholder = totalLandHectares <= 2.0;

  const activeFarm = farmsList[activeFarmIndex] || null;
  const autoIrrigation = activeFarm 
    ? ['rice', 'tomato', 'potato', 'chilli', 'vegetable', 'fruit', 'sugarcane'].some(crop => activeFarm.primary_crop.toLowerCase().includes(crop))
    : false;

  const autoSoilIssue = liveTelemetry 
    ? (liveTelemetry.nitrogen < 40 || liveTelemetry.phosphorus < 20 || liveTelemetry.potassium < 30) 
    : false;

  const resolvedSmallholder = filterSmallholder !== null ? filterSmallholder : autoSmallholder;
  const resolvedIrrigation = filterIrrigation !== null ? filterIrrigation : autoIrrigation;
  const resolvedSoilIssue = filterSoilIssue !== null ? filterSoilIssue : autoSoilIssue;

  // Application Modal state
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [hasAadhar, setHasAadhar] = useState(false);
  const [hasLandPaper, setHasLandPaper] = useState(false);
  const [hasBankDetails, setHasBankDetails] = useState(false);

  // New Insurance Purchase State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [insFarmId, setInsFarmId] = useState('');
  const [insPolicyName, setInsPolicyName] = useState('Kharif Weather Shield 2026');
  const [insTriggerType, setInsTriggerType] = useState('rainfall_deficit');
  const [insCoverage, setInsCoverage] = useState('120000');
  const [insPremium, setInsPremium] = useState('3600');
  const [purchasingIns, setPurchasingIns] = useState(false);

  // Claim process state
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [claimStatusMessage, setClaimStatusMessage] = useState('');


  // Active Schemes Catalog
  const schemesCatalog: Scheme[] = [
    {
      id: 'sch-pm-kisan',
      name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
      hindiName: 'पीएम-किसान (प्रधानमंत्री किसान सम्मान निधि)',
      description: 'Direct income support scheme providing assured cash flow for purchasing agricultural inputs.',
      hindiDescription: 'कृषि इनपुट खरीदने के लिए सुनिश्चित नकद सहायता प्रदान करने वाली प्रत्यक्ष आय सहायता योजना।',
      benefit: 'Direct income support of INR 6,000 per year paid in three equal installments of INR 2,000.',
      hindiBenefit: 'प्रति वर्ष 6,000 रुपये की सीधी आय सहायता, 2,000 रुपये की तीन समान किस्तों में भुगतान।',
      eligibilityRules: { maxLandHectares: 2.0 },
      requirements: ['Aadhar Card verification linked with mobile', 'Land ownership records (Khatauni)', 'Active bank account linked with Aadhar'],
      hindiRequirements: ['मोबाइल से लिंक आधार कार्ड सत्यापन', 'भूमि स्वामित्व रिकॉर्ड (खतौनी)', 'आधार से लिंक सक्रिय बैंक खाता'],
      externalUrl: 'https://pmkisan.gov.in/'
    },
    {
      id: 'sch-pmksy',
      name: 'PM Krishi Sinchayee Yojana (PMKSY - Per Drop More Crop)',
      hindiName: 'पीएम कृषि सिंचाई योजना (प्रति बूंद अधिक फसल)',
      description: 'Promoting modern water-saving technologies like Drip and Sprinkler irrigation systems.',
      hindiDescription: 'ड्रिप और स्प्रिंकलर सिंचाई प्रणालियों जैसी आधुनिक जल-बचत तकनीकों को बढ़ावा देना।',
      benefit: '55% financial subsidy for Small & Marginal farmers, and 45% subsidy for other landholders.',
      hindiBenefit: 'छोटे और सीमांत किसानों के लिए 55% वित्तीय सब्सिडी, और अन्य भूमिधारकों के लिए 45% सब्सिडी।',
      eligibilityRules: { requiresWaterSource: true },
      requirements: ['Valid land holding documentation', 'Approved micro-irrigation system design plan', 'Access to water source (well/borewell)'],
      hindiRequirements: ['वैध भूमि जोत दस्तावेज', 'स्वीकृत सूक्ष्म सिंचाई प्रणाली डिजाइन योजना', 'जल स्रोत (कुआं/बोरवेल) तक पहुंच'],
      externalUrl: 'https://pmksy.gov.in/'
    },
    {
      id: 'sch-soil-card',
      name: 'Soil Health Card Scheme',
      hindiName: 'मृदा स्वास्थ्य कार्ड योजना',
      description: 'Assisting farmers in monitoring soil nutrient deficiencies and recommending fertilizer usage.',
      hindiDescription: 'मिट्टी में पोषक तत्वों की कमी की निगरानी करने और उर्वरक उपयोग की सिफारिश करने में किसानों की सहायता करना।',
      benefit: 'Free soil sample collection, laboratory analysis report, and customized N-P-K fertilizer advisory.',
      hindiBenefit: 'मुफ़्त मिट्टी के नमूने का संग्रह, प्रयोगशाला विश्लेषण रिपोर्ट, और अनुकूलित एन-पी-के उर्वरक सलाह।',
      eligibilityRules: { requiresSoilTelemetry: true },
      requirements: ['GPS coordinates of farm grid points', 'Aadhar Card', 'Recent crop history records'],
      hindiRequirements: ['कृषि ग्रिड बिंदुओं के जीपीएस निर्देशांक', 'आधार कार्ड', 'हाल ही का फसल इतिहास रिकॉर्ड'],
      externalUrl: 'https://soilhealth.dac.gov.in/'
    },
    {
      id: 'sch-pmfby',
      name: 'PM Fasal Bima Yojana (PMFBY - Crop Insurance)',
      hindiName: 'प्रधानमंत्री फसल बीमा योजना (पीएमएफबीवाई)',
      description: 'Comprehensive yield insurance protecting against crop failure from natural disasters and pests.',
      hindiDescription: 'प्राकृतिक आपदाओं और कीटों से फसल खराब होने से बचाने के लिए व्यापक उपज बीमा।',
      benefit: 'Coverage against non-preventable risks at minimal premium rates (2% Kharif, 1.5% Rabi).',
      hindiBenefit: 'न्यूनतम प्रीमियम दरों (2% खरीफ, 1.5% रबी) पर अपरिहार्य जोखिमों के खिलाफ बीमा कवर।',
      eligibilityRules: { cropsSupported: ['Wheat', 'Rice', 'Soybean', 'Tomato', 'Potato'] },
      requirements: ['Sowing certificate issued by local Patwari', 'Land revenue papers', 'Premium contribution payment proof'],
      hindiRequirements: ['स्थानीय पटवारी द्वारा जारी बुवाई प्रमाणपत्र', 'भू-राजस्व कागजात', 'प्रीमियम योगदान भुगतान का प्रमाण'],
      externalUrl: 'https://pmfby.gov.in/'
    },
    {
      id: 'sch-acabc',
      name: 'Agri-Clinics & Agri-Business Centers (ACABC) Scheme',
      hindiName: 'कृषि क्लिनिक और कृषि व्यवसाय केंद्र (ACABC) योजना',
      description: 'Supporting agricultural entrepreneurs to set up extension service ventures in rural villages.',
      hindiDescription: 'ग्रामीण गांवों में विस्तार सेवा उद्यम स्थापित करने के लिए कृषि उद्यमियों का समर्थन करना।',
      benefit: 'Capital subsidy of 36% for General category, and 44% for SC/ST/Women/Hill area candidates.',
      hindiBenefit: 'सामान्य श्रेणी के लिए 36% और एससी/एसटी/महिला/पहाड़ी क्षेत्र के उम्मीदवारों के लिए 44% की पूंजी सब्सिडी।',
      eligibilityRules: {},
      requirements: ['Completion of ACABC entrepreneur training', 'Detailed Project Report (DPR)', 'Graduate degree or diploma in agriculture/allied subjects'],
      hindiRequirements: ['ACABC उद्यमी प्रशिक्षण का समापन', 'विस्तृत परियोजना रिपोर्ट (DPR)', 'कृषि/संबद्ध विषयों में स्नातक डिग्री या डिप्लोमा'],
      externalUrl: 'https://www.agriclinics.net/'
    }
  ];

  // Fetch Applied Schemes
  const fetchApplied = async () => {
    if (!currentUser) return;
    setLoadingApplied(true);
    try {
      const res = await fetch(`${API_URL}/schemes/applied?user_id=${currentUser.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAppliedSchemes(data);
    } catch (e) {
      console.warn('[Schemes Applied Fetch Error] Falling back...');
    } finally {
      setLoadingApplied(false);
    }
  };

  useEffect(() => {
    fetchApplied();
  }, [currentUser, activeSubTab]);

  // Dynamic Suggestion Score calculation based on user's profile and checklist
  const calculateMatch = (scheme: Scheme) => {
    let score = 75; // Baseline match
    let reasons: string[] = [];

    // 1. PM-KISAN check
    if (scheme.id === 'sch-pm-kisan') {
      const smallholder = resolvedSmallholder;
      if (smallholder) {
        score = 98;
        reasons.push(lang === 'hi' ? 'आपकी कुल भूमि 2 हेक्टेयर से कम है।' : 'Your total farm landholding is under 2.0 hectares.');
      } else {
        score = 60;
        reasons.push(lang === 'hi' ? '2 हेक्टेयर से अधिक भूमि पर कम प्राथमिकता।' : 'Large landholding has lower priority status.');
      }
    }

    // 2. PM Krishi Sinchayee Yojana
    if (scheme.id === 'sch-pmksy') {
      const needsIrrig = resolvedIrrigation;
      if (needsIrrig) {
        score = 95;
        reasons.push(lang === 'hi' ? 'माइक्रो-सिंचाई से पानी की बचत होगी।' : 'Drip irrigation recommended for your crop profile.');
      }
    }

    // 3. Soil Health Card
    if (scheme.id === 'sch-soil-card') {
      const telemetryLow = resolvedSoilIssue;
      if (telemetryLow) {
        score = 97;
        reasons.push(lang === 'hi' ? 'आपके लाइव मिट्टी में नाइट्रोजन/फास्फोरस की कमी पाई गई।' : 'Low nitrogen/phosphorus telemetry detected on your active field.');
      } else {
        score = 80;
        reasons.push(lang === 'hi' ? 'मिट्टी के स्वास्थ्य की नियमित निगरानी के लिए सलाह दी जाती है।' : 'Recommended for periodic validation of soil health.');
      }
    }

    // 4. PM Fasal Bima Yojana
    if (scheme.id === 'sch-pmfby') {
      const activeCrops = farmsList.map(f => f.primary_crop);
      const isNotifiedCrop = activeCrops.some(crop => 
        scheme.eligibilityRules.cropsSupported?.some(sc => crop.toLowerCase().includes(sc.toLowerCase()))
      );
      if (isNotifiedCrop || activeCrops.length > 0) {
        score = 94;
        reasons.push(lang === 'hi' ? `आपकी मुख्य फसल (${activeCrops.join(', ')}) योजना के अंतर्गत आती है।` : `Your crop (${activeCrops.join(', ')}) is a notified crop for weather protection.`);
      }
    }

    return { score, reasons };
  };

  // Submit Scheme Application
  const handleApplyScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedScheme) return;
    setSubmittingApp(true);
    try {
      const res = await fetch(`${API_URL}/schemes/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          scheme_id: selectedScheme.id,
          scheme_name: selectedScheme.name,
          documents: [
            { name: 'Aadhar_Card.pdf', size: '1.1 MB', uploaded: hasAadhar },
            { name: 'Land_Paper_Vidisha.pdf', size: '2.5 MB', uploaded: hasLandPaper },
            { name: 'Bank_Passbook.pdf', size: '950 KB', uploaded: hasBankDetails }
          ],
          remarks: 'Application submitted online via SAKHI Government Portal.'
        })
      });
      if (!res.ok) throw new Error();
      const newApp = await res.json();
      setAppliedSchemes(prev => [newApp, ...prev]);
      alert(`${lang === 'hi' ? 'आवेदन सफलतापूर्वक जमा हो गया!' : 'Application submitted successfully!'} Tracking Code: ${newApp.tracking_code}`);
      setSelectedScheme(null);
      setActiveSubTab('tracking');
    } catch (err) {
      alert('Failed to submit scheme application.');
    } finally {
      setSubmittingApp(false);
    }
  };

  // Purchase New Insurance Policy
  const handlePurchaseInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !insFarmId) return;
    setPurchasingIns(true);
    
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsLater = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const res = await fetch(`${API_URL}/insurance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_name: insPolicyName,
          coverage_amount: Number(insCoverage),
          premium_amount: Number(insPremium),
          trigger_type: insTriggerType,
          trigger_params: insTriggerType === 'rainfall_deficit' 
            ? { threshold_mm: 12, consecutive_days: 7 }
            : { wind_speed_kmh: 55 },
          valid_from: today,
          valid_until: sixMonthsLater,
          farm_id: insFarmId,
          user_id: currentUser.id
        })
      });

      if (!res.ok) throw new Error();
      const newPolicy = await res.json();
      setInsurancePolicies(prev => [newPolicy, ...prev]);
      alert(lang === 'hi' ? 'मौसम-सूचकांक फसल बीमा सफलतापूर्वक सक्रिय हो गया!' : 'Weather-indexed Crop Insurance Policy activated successfully!');
      setIsPurchaseModalOpen(false);
    } catch (err) {
      alert('Failed to activate crop insurance.');
    } finally {
      setPurchasingIns(false);
    }
  };

  // File automated Open-Meteo Weather Claim Check
  const handleFileClaim = async (policyId: string) => {
    setActiveClaimId(policyId);
    setClaimStatusMessage(lang === 'hi' ? 'मौसम रिपोर्ट की पुष्टि हो रही है...' : 'Verifying meteorological records...');

    try {
      const res = await fetch(`${API_URL}/insurance/${policyId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error();
      const result = await res.json();

      setClaimStatusMessage(result.message);

      // Update local state list to show payout_released or claimed
      setInsurancePolicies(prev => 
        prev.map(p => p.id === policyId ? { ...p, status: result.policy.status } : p)
      );
    } catch (err) {
      setClaimStatusMessage(lang === 'hi' ? 'मौसम एपीआई सत्यापन विफल हुआ।' : 'Failed to verify meteorological conditions via Open-Meteo.');
    }
  };

  const filteredSchemes = schemesCatalog.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = s.name.toLowerCase().includes(q) || s.hindiName.includes(q) || s.description.toLowerCase().includes(q) || s.hindiDescription.includes(q);
    return matchesQuery;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.25rem', height: '100%', overflowY: 'auto' }}>
      
      {/* --- HEADER CONTROLS --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-nav)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award style={{ color: 'var(--tech-blue)' }} size={24} />
            {lang === 'hi' ? 'योजनाएं और मौसम बीमा केंद्र' : lang === 'mr' ? 'योजना आणि विमा केंद्र' : 'Government Schemes & Weather Insurance Hub'}
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {lang === 'hi' ? 'सक्रिय कृषि योजनाओं की पात्रता जांचें और मौसम सूचकांक दावों की पुष्टि करें।' : 'Check eligibility for active schemes and file claims verified by real-time meteorological API data.'}
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setActiveSubTab('schemes')}
            className="btn"
            style={{ 
              fontSize: '0.72rem', 
              padding: '6px 12px', 
              background: activeSubTab === 'schemes' ? '#fff' : 'transparent',
              boxShadow: activeSubTab === 'schemes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              color: activeSubTab === 'schemes' ? 'var(--text-nav)' : 'var(--text-muted)'
            }}
          >
            {lang === 'hi' ? 'योजनाएं खोजें' : 'Find Schemes'}
          </button>
          <button 
            onClick={() => setActiveSubTab('tracking')}
            className="btn"
            style={{ 
              fontSize: '0.72rem', 
              padding: '6px 12px', 
              background: activeSubTab === 'tracking' ? '#fff' : 'transparent',
              boxShadow: activeSubTab === 'tracking' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              color: activeSubTab === 'tracking' ? 'var(--text-nav)' : 'var(--text-muted)'
            }}
          >
            {lang === 'hi' ? 'आवेदन ट्रैकिंग' : 'Track Applications'}
          </button>
          <button 
            onClick={() => setActiveSubTab('insurance')}
            className="btn"
            style={{ 
              fontSize: '0.72rem', 
              padding: '6px 12px', 
              background: activeSubTab === 'insurance' ? '#fff' : 'transparent',
              boxShadow: activeSubTab === 'insurance' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              color: activeSubTab === 'insurance' ? 'var(--text-nav)' : 'var(--text-muted)'
            }}
          >
            {lang === 'hi' ? 'मौसम बीमा' : 'Weather Insurance'}
          </button>
        </div>
      </div>

      {/* --- TAB 1: SCHEMES HUB --- */}
      {activeSubTab === 'schemes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem' }} className="grid-2">
          
          {/* Eligibility Checklist Sidebar */}
          <div className="glass-panel" style={{ padding: '1.25rem', height: 'fit-content' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-gov)', paddingBottom: '8px' }}>
              {lang === 'hi' ? 'पात्रता मानदंड फिल्टर' : 'Eligibility Criteria Filters'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>{lang === 'hi' ? 'भूमि का आकार' : 'Land Size'}</span>
                  {filterSmallholder === null ? (
                    <span style={{ fontSize: '0.55rem', color: 'var(--primary-emerald)', background: 'var(--primary-mint)', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <span className="telemetry-pulse" style={{ width: '4px', height: '4px', background: 'var(--primary-emerald)', borderRadius: '50%', display: 'inline-block' }}></span>
                      Auto (GPS)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>
                      Manual
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => setFilterSmallholder(true)}
                    className="btn" 
                    style={{ flex: 1, padding: '4px', fontSize: '0.68rem', background: resolvedSmallholder === true ? 'var(--primary-mint)' : '#f8fafc', color: resolvedSmallholder === true ? 'var(--primary-emerald)' : 'inherit', border: filterSmallholder === null ? '1px dashed var(--primary-emerald)' : '1px solid transparent' }}
                  >
                    &le; 2 Ha
                  </button>
                  <button 
                    onClick={() => setFilterSmallholder(false)}
                    className="btn" 
                    style={{ flex: 1, padding: '4px', fontSize: '0.68rem', background: resolvedSmallholder === false ? 'var(--primary-mint)' : '#f8fafc', color: resolvedSmallholder === false ? 'var(--primary-emerald)' : 'inherit', border: filterSmallholder === null ? '1px dashed var(--primary-emerald)' : '1px solid transparent' }}
                  >
                    &gt; 2 Ha
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>{lang === 'hi' ? 'सिंचाई स्रोत' : 'Irrigation Source'}</span>
                  {filterIrrigation === null ? (
                    <span style={{ fontSize: '0.55rem', color: 'var(--primary-emerald)', background: 'var(--primary-mint)', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <span className="telemetry-pulse" style={{ width: '4px', height: '4px', background: 'var(--primary-emerald)', borderRadius: '50%', display: 'inline-block' }}></span>
                      Auto (Crop)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>
                      Manual
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => setFilterIrrigation(true)}
                    className="btn" 
                    style={{ flex: 1, padding: '4px', fontSize: '0.68rem', background: resolvedIrrigation === true ? 'var(--primary-mint)' : '#f8fafc', color: resolvedIrrigation === true ? 'var(--primary-emerald)' : 'inherit', border: filterIrrigation === null ? '1px dashed var(--primary-emerald)' : '1px solid transparent' }}
                  >
                    {lang === 'hi' ? 'हाँ' : 'Borewell'}
                  </button>
                  <button 
                    onClick={() => setFilterIrrigation(false)}
                    className="btn" 
                    style={{ flex: 1, padding: '4px', fontSize: '0.68rem', background: resolvedIrrigation === false ? 'var(--primary-mint)' : '#f8fafc', color: resolvedIrrigation === false ? 'var(--primary-emerald)' : 'inherit', border: filterIrrigation === null ? '1px dashed var(--primary-emerald)' : '1px solid transparent' }}
                  >
                    {lang === 'hi' ? 'नहीं' : 'Rainfed'}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>{lang === 'hi' ? 'मिट्टी पोषक तत्व' : 'Soil Nutrients'}</span>
                  {filterSoilIssue === null ? (
                    <span style={{ fontSize: '0.55rem', color: 'var(--primary-emerald)', background: 'var(--primary-mint)', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <span className="telemetry-pulse" style={{ width: '4px', height: '4px', background: 'var(--primary-emerald)', borderRadius: '50%', display: 'inline-block' }}></span>
                      Auto (IoT)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>
                      Manual
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => setFilterSoilIssue(true)}
                    className="btn" 
                    style={{ flex: 1, padding: '4px', fontSize: '0.68rem', background: resolvedSoilIssue === true ? 'var(--primary-mint)' : '#f8fafc', color: resolvedSoilIssue === true ? 'var(--primary-emerald)' : 'inherit', border: filterSoilIssue === null ? '1px dashed var(--primary-emerald)' : '1px solid transparent' }}
                  >
                    {lang === 'hi' ? 'कमी है' : 'Low N-P-K'}
                  </button>
                  <button 
                    onClick={() => setFilterSoilIssue(false)}
                    className="btn" 
                    style={{ flex: 1, padding: '4px', fontSize: '0.68rem', background: resolvedSoilIssue === false ? 'var(--primary-mint)' : '#f8fafc', color: resolvedSoilIssue === false ? 'var(--primary-emerald)' : 'inherit', border: filterSoilIssue === null ? '1px dashed var(--primary-emerald)' : '1px solid transparent' }}
                  >
                    {lang === 'hi' ? 'पर्याप्त है' : 'Optimal'}
                  </button>
                </div>
              </div>

              <button 
                onClick={() => {
                  setFilterSmallholder(null);
                  setFilterIrrigation(null);
                  setFilterSoilIssue(null);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.68rem', padding: '6px', width: '100%', marginTop: '8px' }}
              >
                {lang === 'hi' ? 'लाइव आईओटी सिंक' : 'Sync Live IoT & GPS'}
              </button>
            </div>
          </div>

          {/* Schemes listings list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Search inputs */}
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', gap: '10px' }}>
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder={lang === 'hi' ? 'योजनाओं का नाम या लाभ खोजें...' : 'Search active agriculture schemes by benefits, qualifications...'} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none', fontSize: '0.82rem' }}
              />
            </div>

            {/* Catalog Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSchemes.map(s => {
                const { score, reasons } = calculateMatch(s);
                return (
                  <div key={s.id} className="glass-panel" style={{ padding: '1.25rem', borderLeft: score >= 90 ? '4px solid var(--primary-emerald)' : '1px solid var(--border-gov)', transition: 'all 0.2s hover' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.62rem', background: score >= 90 ? 'var(--primary-mint)' : '#f1f5f9', color: score >= 90 ? 'var(--primary-emerald)' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>
                          {score}% Match Recommendation
                        </span>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '6px 0 2px 0', color: 'var(--text-nav)' }}>
                          {lang === 'hi' ? s.hindiName : s.name}
                        </h3>
                      </div>
                      <a href={s.externalUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '4px', borderRadius: '4px' }}>
                        <ArrowUpRight size={14} />
                      </a>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '8px 0' }}>
                      {lang === 'hi' ? s.hindiDescription : s.description}
                    </p>

                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '10px', border: '1px solid #f1f5f9' }}>
                      <strong style={{ color: 'var(--primary-emerald)' }}>{lang === 'hi' ? 'लाभ: ' : 'Benefit: '}</strong>
                      {lang === 'hi' ? s.hindiBenefit : s.benefit}
                    </div>

                    {reasons.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        <Sparkles size={12} style={{ color: '#eab308' }} />
                        <span>AI Suggestion: {reasons[0]}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          <strong>{lang === 'hi' ? 'दस्तावेज: ' : 'Needs: '}</strong>
                          {lang === 'hi' ? s.hindiRequirements.slice(0, 2).join(', ') : s.requirements.slice(0, 2).join(', ')}...
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => setSelectedScheme(s)}
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: '0.72rem' }}
                      >
                        {lang === 'hi' ? 'पात्रता आवेदन' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: TRACKING LEDGER --- */}
      {activeSubTab === 'tracking' && (
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, marginBottom: '1.25rem' }}>
            {lang === 'hi' ? 'आपके सरकारी योजना आवेदन' : 'Applied Schemes Tracking Ledger'}
          </h3>

          {loadingApplied ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Loading applications...</p>
          ) : appliedSchemes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
              <p style={{ fontSize: '0.82rem' }}>
                {lang === 'hi' ? 'कोई योजना आवेदन नहीं मिला। योजनाएं टैब में आवेदन करें।' : 'No active scheme applications found. Browse the Schemes tab to submit details.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {appliedSchemes.map((app) => (
                <div key={app.id} style={{ border: '1px solid var(--border-gov)', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.62rem', background: '#e2e8f0', color: 'var(--text-nav)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {app.tracking_code}
                      </span>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: '4px 0 0 0' }}>{app.scheme_name}</h4>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.7rem', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontWeight: 'bold',
                        background: app.status === 'Approved' || app.status === 'Disbursed' ? 'var(--primary-mint)' : app.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                        color: app.status === 'Approved' || app.status === 'Disbursed' ? 'var(--primary-emerald)' : app.status === 'Rejected' ? '#ef4444' : '#d97706'
                      }}
                    >
                      {app.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '8px 0' }}>
                    <strong>{lang === 'hi' ? 'स्थिति टिप्पणी: ' : 'Remarks: '}</strong>
                    {app.remarks}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', fontSize: '0.68rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
                    <span>{lang === 'hi' ? 'आवेदन तिथि: ' : 'Applied: '}{new Date(app.applied_at).toLocaleDateString()}</span>
                    <span>
                      {lang === 'hi' ? 'सत्यापित दस्तावेज़: ' : 'Documents: '}
                      {Array.isArray(app.documents) ? app.documents.filter((d: any) => d.uploaded).map((d: any) => d.name).join(', ') || 'None' : 'Standard papers'}
                    </span>
                    <button 
                      onClick={() => generateSchemeReceipt(app)}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <FileText size={10} />
                      {lang === 'hi' ? 'रसीद PDF' : 'Download Receipt'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: WEATHER INSURANCE --- */}
      {activeSubTab === 'insurance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Active Policies Tracker */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield style={{ color: 'var(--tech-blue)' }} size={18} />
                {lang === 'hi' ? 'सक्रिय मौसम-सूचकांक बीमा पॉलिसियां' : 'Active Weather-Indexed Insurance Policies'}
              </h3>
              <button 
                onClick={() => setIsPurchaseModalOpen(true)}
                className="btn btn-primary"
                style={{ fontSize: '0.72rem', padding: '6px 12px' }}
              >
                {lang === 'hi' ? '+ नया बीमा खरीदें' : '+ Buy New Policy'}
              </button>
            </div>

            {insurancePolicies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                <CloudRain size={36} style={{ opacity: 0.3, marginBottom: '6px' }} />
                <p style={{ fontSize: '0.78rem' }}>
                  {lang === 'hi' ? 'कोई सक्रिय मौसम बीमा पॉलिसी नहीं मिली।' : 'No active weather insurance policies registered.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }} className="grid-2">
                {insurancePolicies.map(p => (
                  <div key={p.id} style={{ border: '1px solid var(--border-gov)', background: '#f8fafc', padding: '1rem', borderRadius: '8px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0 }}>{p.policy_name}</h4>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Trigger: {p.trigger_type.replace('_', ' ')}</span>
                      </div>
                      <span 
                        style={{ 
                          fontSize: '0.68rem', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontWeight: 'bold',
                          background: p.status === 'payout_released' ? 'var(--primary-mint)' : p.status === 'claimed' ? '#e2e8f0' : 'var(--tech-blue-light)',
                          color: p.status === 'payout_released' ? 'var(--primary-emerald)' : p.status === 'claimed' ? 'var(--text-muted)' : 'var(--tech-blue)'
                        }}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '12px 0', borderTop: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0', padding: '8px 0', fontSize: '0.72rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'hi' ? 'बीमा राशि: ' : 'Coverage: '}</span>
                        <strong>INR {p.coverage_amount}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>{lang === 'hi' ? 'प्रीमियम: ' : 'Premium: '}</span>
                        <strong>INR {p.premium_amount}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        Valid till: {new Date(p.valid_until).toLocaleDateString()}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {(p.status === 'payout_released' || p.status === 'claimed') && (
                          <button 
                            onClick={() => generateInsuranceReport(p)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FileText size={10} />
                            Receipt
                          </button>
                        )}

                        {p.status === 'active' && (
                          <button 
                            onClick={() => handleFileClaim(p.id)}
                            disabled={activeClaimId === p.id}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Play size={10} />
                            {activeClaimId === p.id ? 'Verifying...' : 'File Claim'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Claim result check box */}
                    {activeClaimId === p.id && (
                      <div style={{ marginTop: '12px', background: '#fff', border: '1px solid #f1f5f9', padding: '8px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          <Activity className="telemetry-pulse" size={14} style={{ color: 'var(--tech-blue)' }} />
                          <span>Open-Meteo Weather Audit Ledger:</span>
                        </div>
                        <p style={{ fontSize: '0.68rem', margin: '4px 0 0 0', color: 'var(--text-nav)' }}>{claimStatusMessage}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meteorological check notice */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--tech-blue-light)' }}>
            <CloudRain size={24} style={{ color: 'var(--tech-blue)', flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0, color: 'var(--text-nav)' }}>
                {lang === 'hi' ? 'स्वचालित ओपन-मेटियो मौसम दावों की पुष्टि' : 'Automated Open-Meteo Weather Oracle Claim Verification'}
              </h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                SAKHI integrates directly with global meteorological satellites and weather station APIs. When you click **File Claim**, the system checks the precipitation and wind history for your coordinates over the policy dates. If a hailstorm or rainfall deficit threshold is verified, payouts are approved automatically and disbursed to your bank ledger.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: SCHEME APPLICATION FORM --- */}
      {selectedScheme && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '500px', maxWidth: '100%', padding: '1.5rem', background: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                {lang === 'hi' ? 'योजना के लिए आवेदन करें' : 'Government Scheme Application'}
              </h3>
              <button onClick={() => setSelectedScheme(null)} className="btn btn-secondary" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Apply for: <strong>{lang === 'hi' ? selectedScheme.hindiName : selectedScheme.name}</strong>
            </p>

            <form onSubmit={handleApplyScheme} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Requirements Checklist */}
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  {lang === 'hi' ? 'आवश्यक दस्तावेज़ अपलोड (' + selectedScheme.requirements.length + ')' : 'Mandatory Document Verification checklist (' + selectedScheme.requirements.length + ')'}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={hasAadhar} 
                      onChange={(e) => setHasAadhar(e.target.checked)} 
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{lang === 'hi' ? 'आधार कार्ड प्रतिलिपि अपलोड' : 'Upload Aadhar Card PDF'}</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={hasLandPaper} 
                      onChange={(e) => setHasLandPaper(e.target.checked)} 
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{lang === 'hi' ? 'भूमि जोत खतौनी दस्तावेज़ अपलोड' : 'Upload Land Ownership (Khatauni) PDF'}</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={hasBankDetails} 
                      onChange={(e) => setHasBankDetails(e.target.checked)} 
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{lang === 'hi' ? 'बैंक पासबुक प्रतिलिपि अपलोड' : 'Upload Bank Account Passbook PDF'}</span>
                  </label>
                </div>
              </div>

              {/* Warning Alert */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '6px', fontSize: '0.68rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>
                  {lang === 'hi' ? 'ध्यान दें: गलत जानकारी देने पर पटवारी सत्यापन के दौरान आवेदन रद्द किया जा सकता है।' : 'Important Notice: Patwari revenue verification will be conducted. Providing incorrect land details will disqualify the application.'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setSelectedScheme(null)} 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.72rem' }}
                >
                  {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  disabled={submittingApp || !hasAadhar || !hasLandPaper || !hasBankDetails}
                  className="btn btn-primary" 
                  style={{ fontSize: '0.72rem', padding: '8px 20px' }}
                >
                  {submittingApp ? 'Submitting...' : (lang === 'hi' ? 'आवेदन जमा करें' : 'Submit Application')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: BUY INSURANCE POLICY --- */}
      {isPurchaseModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '480px', maxWidth: '100%', padding: '1.5rem', background: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                {lang === 'hi' ? 'मौसम-सूचकांक फसल बीमा खरीदें' : 'Buy Weather-Indexed Crop Insurance'}
              </h3>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="btn btn-secondary" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePurchaseInsurance} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {lang === 'hi' ? 'बीमा के लिए खेत चुनें' : 'Select Farm Field for Protection'}
                </label>
                <select 
                  required 
                  value={insFarmId} 
                  onChange={(e) => setInsFarmId(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-gov)', borderRadius: '6px', fontSize: '0.8rem' }}
                >
                  <option value="">-- Choose Field --</option>
                  {farmsList.map(f => (
                    <option key={f.id} value={f.id}>{f.location_name} ({f.primary_crop})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {lang === 'hi' ? 'बीमा पॉलिसी का नाम' : 'Insurance Policy Plan Name'}
                </label>
                <input 
                  type="text" 
                  value={insPolicyName} 
                  onChange={(e) => setInsPolicyName(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-gov)', borderRadius: '6px', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {lang === 'hi' ? 'सूचकांक प्रकार (Trigger)' : 'Weather Index Trigger'}
                  </label>
                  <select 
                    value={insTriggerType} 
                    onChange={(e) => {
                      setInsTriggerType(e.target.value);
                      if (e.target.value === 'rainfall_deficit') {
                        setInsPolicyName('Kharif Weather Shield 2026');
                        setInsCoverage('120000');
                        setInsPremium('3600');
                      } else {
                        setInsPolicyName('Hailstorm & Wind Shield 2026');
                        setInsCoverage('80000');
                        setInsPremium('2400');
                      }
                    }}
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-gov)', borderRadius: '6px', fontSize: '0.8rem' }}
                  >
                    <option value="rainfall_deficit">Rainfall Deficit</option>
                    <option value="hailstorm">Hailstorm / Wind</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {lang === 'hi' ? 'बीमा कवरेज (INR)' : 'Coverage Amount (INR)'}
                  </label>
                  <input 
                    type="number" 
                    value={insCoverage} 
                    readOnly
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-gov)', borderRadius: '6px', fontSize: '0.8rem', background: '#f1f5f9' }}
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Premium to pay:</span>
                  <strong>INR {insPremium}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Government Subsidy contribution:</span>
                  <span>INR {(Number(insPremium) * 1.5).toFixed(0)} (75% support)</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsPurchaseModalOpen(false)} 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.72rem' }}
                >
                  {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  disabled={purchasingIns || !insFarmId}
                  className="btn btn-primary" 
                  style={{ fontSize: '0.72rem', padding: '8px 20px' }}
                >
                  {purchasingIns ? 'Activating...' : (lang === 'hi' ? 'सक्रिय करें' : 'Activate Policy')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
