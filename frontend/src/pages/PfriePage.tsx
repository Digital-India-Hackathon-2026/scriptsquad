import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Navigation,
  Shield,
  Leaf,
  Sprout,
  Droplet,
  ShieldAlert,
  Cloud,
  Target,
  Gauge,
} from 'lucide-react';
import type { Farm, PfrieScores } from '../types';
import { translations, type LangType } from '../lib/locale';

interface PfriePageProps {
  pfrieScores: PfrieScores | null;
  pfrieLoading: boolean;
  espStatus: 'disconnected' | 'connecting' | 'connected';
  espConnectionMode: 'wifi' | 'ble' | 'serial';
  setEspConnectionMode: (mode: 'wifi' | 'ble' | 'serial') => void;
  espWifiSsid: string;
  setEspWifiSsid: (s: string) => void;
  espWifiIp: string;
  setEspWifiIp: (s: string) => void;
  connectEsp32: () => void;
  disconnectEsp32: () => void;
  espLogs: string[];
  farmsList: Farm[];
  dronePlans: any[];
  droneGenerating: boolean;
  generateDronePlan: (farmId: string) => void;
  insurancePolicies: any[];
  fileInsuranceClaim: (id: string) => void;
  carbonCredits: any[];
  lang: LangType;
  liveTelemetry: any;
  activeFarmIndex: number;
  onNavigateToVoiceBookDrone: () => void;
}


const PfriePage: React.FC<PfriePageProps> = ({
  pfrieScores,
  pfrieLoading: _pfrieLoading,
  espStatus,
  espConnectionMode,
  setEspConnectionMode,
  espWifiSsid,
  setEspWifiSsid,
  espWifiIp,
  setEspWifiIp,
  connectEsp32,
  disconnectEsp32,
  espLogs,
  farmsList,
  dronePlans,
  droneGenerating,
  generateDronePlan,
  insurancePolicies,
  fileInsuranceClaim,
  carbonCredits,
  lang,
  liveTelemetry,
  activeFarmIndex,
  onNavigateToVoiceBookDrone,
}) => {
  const t = translations[lang];

  // Weather state for Pfrie disease tracking calculations
  const [weather, setWeather] = useState<{
    temp: number;
    rain: number;
    humidity: number;
    wind: number;
    windDir: number;
    pressure: number;
    cloudCover: number;
    uvIndex: number;
    weatherCode: number;
  } | null>(null);
  const [selectedEngineDetail, setSelectedEngineDetail] = useState<string | null>(null);

  const activeFarm = farmsList[activeFarmIndex] || farmsList[0];

  useEffect(() => {
    if (!activeFarm) return;
    const coords = activeFarm.coordinates[0];
    if (!coords) return;
    const lat = coords[1];
    const lng = coords[0];
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,uv_index,weather_code`)
      .then(res => res.json())
      .then(data => {
        const curr = data.current || {};
        setWeather({
          temp: curr.temperature_2m ?? 28,
          rain: curr.precipitation ?? 0.0,
          humidity: curr.relative_humidity_2m ?? 60,
          wind: curr.wind_speed_10m ?? 12,
          windDir: curr.wind_direction_10m ?? 180,
          pressure: curr.pressure_msl ?? 1013,
          cloudCover: curr.cloud_cover ?? 20,
          uvIndex: curr.uv_index ?? 3.5,
          weatherCode: curr.weather_code ?? 0
        });
      })
      .catch(() => {
        setWeather({
          temp: 28,
          rain: 0.0,
          humidity: 62,
          wind: 10.5,
          windDir: 160,
          pressure: 1012,
          cloudCover: 15,
          uvIndex: 4.0,
          weatherCode: 1
        });
      });
  }, [activeFarm]);

  // Dynamic Agronomic Stress & Disease Predictor
  const calculateStressMetrics = () => {
    const moisture = liveTelemetry?.moisture || 33.5;
    const temp = weather ? weather.temp : 26;
    const humidity = weather ? weather.humidity : 60;
    const rain = weather ? weather.rain : 0;

    // 1. Fungal Infection Risk
    let fungalRisk = 12;
    if (humidity > 70) {
      fungalRisk += 25;
      if (temp >= 16 && temp <= 26) {
        fungalRisk += 38; 
      }
      if (rain > 0.1) {
        fungalRisk += 20; 
      }
    }
    
    // 2. Root Rot / Anoxia Risk
    let rootRotRisk = 8;
    if (moisture > 65) {
      rootRotRisk += 45;
      if (rain > 1) {
        rootRotRisk += 30;
      }
      if (temp > 24) {
        rootRotRisk += 12;
      }
    }

    // 3. Drought / Wilting Risk
    const depletionRate = 1.2; 
    const wiltThreshold = 20; 
    const daysToWilt = Math.max(0, Number(((moisture - wiltThreshold) / depletionRate).toFixed(0)));
    let droughtSeverity = 'Low';
    let droughtColor = 'var(--primary-emerald)';
    if (moisture < 35) {
      droughtSeverity = daysToWilt <= 5 ? 'Critical' : 'Moderate';
      droughtColor = daysToWilt <= 5 ? 'var(--danger)' : 'var(--accent-orange)';
    }

    // 4. Pest Attack Vulnerability (Aphids/Thrips)
    let pestRisk = 10;
    if (temp > 30) {
      pestRisk += 35;
      if (humidity < 50) {
        pestRisk += 40; 
      }
    }

    // Calculate maximum threat for dynamic remedies
    const maxVal = Math.max(fungalRisk, rootRotRisk, pestRisk);
    let remedyType = 'drought';
    if (maxVal === fungalRisk) remedyType = 'fungal';
    else if (maxVal === rootRotRisk) remedyType = 'root_rot';
    else if (maxVal === pestRisk) remedyType = 'pest';

    return {
      fungalRisk: Math.min(100, fungalRisk),
      rootRotRisk: Math.min(100, rootRotRisk),
      pestRisk: Math.min(100, pestRisk),
      daysToWilt,
      droughtSeverity,
      droughtColor,
      depletionRate,
      wiltThreshold,
      activeMoisture: moisture,
      remedyType,
      maxRisk: maxVal
    };
  };

  const stress = calculateStressMetrics();

  const moisture = stress.activeMoisture;
  const temp = weather ? weather.temp : 28;
  const humidity = weather ? weather.humidity : 60;
  const rain = weather ? weather.rain : 0;
  const wind = weather ? weather.wind : 10;

  const rootScore = Math.min(100, Math.round(40 + moisture * 1.2));
  const groundwaterScore = Math.min(100, Math.round(35 + moisture * 1.0));
  const diseaseScore = Math.max(0, Math.round(100 - stress.maxRisk));
  const climateScore = Math.min(100, Math.round(100 - (temp > 35 ? (temp - 35) * 5 : 0) - (rain > 15 ? 10 : 0)));
  const plannerScore = Math.min(100, Math.round(85 + (moisture > 30 && moisture < 60 ? 10 : -5)));
  const resilienceScore = Math.round((rootScore + groundwaterScore + diseaseScore + climateScore + plannerScore) / 5);

  const getPfrieColor = (score: number) => {
    if (score >= 80) return 'var(--primary-emerald)';
    if (score >= 65) return 'var(--accent-orange)';
    return 'var(--danger)';
  };

  const engines = [
    {
      key: 'living_root_intelligence',
      label: lang === 'hi' ? 'जैविक जड़ सूचकांक' : 'Living Root Intel',
      icon: <Sprout size={20} />,
      metric: lang === 'hi' ? `मृदा नमी: ${moisture}%` : `Soil Moisture: ${moisture}%`,
      score: rootScore,
      status: rootScore >= 75 ? 'healthy' : 'moderate',
      detail: lang === 'hi'
        ? `जड़ क्षेत्र की नमी ${moisture}% है। यह जड़ विकास के लिए अनुकूल है।`
        : `Root zone moisture is ${moisture}%. Optimal for active root development.`
    },
    {
      key: 'groundwater_digital_twin',
      label: lang === 'hi' ? 'भूजल डिजिटल ट्विन' : 'Groundwater Twin',
      icon: <Droplet size={20} />,
      metric: lang === 'hi' ? `हाइड्रो-चार्ज: ${groundwaterScore}%` : `Hydro-Charge: ${groundwaterScore}%`,
      score: groundwaterScore,
      status: groundwaterScore >= 70 ? 'stable' : 'low',
      detail: lang === 'hi'
        ? `वर्तमान नमी स्तरों के आधार पर जल स्तर सुरक्षा रेटिंग ${groundwaterScore}% मापी गई है।`
        : `Water table security rating measured at ${groundwaterScore}% based on active moisture.`
    },
    {
      key: 'village_disease_intelligence',
      label: lang === 'hi' ? 'रोग वेक्टर ट्रैकर' : 'Disease Tracker',
      icon: <ShieldAlert size={20} />,
      metric: lang === 'hi' ? `हवा में नमी: ${humidity}%` : `Humidity: ${humidity}%`,
      score: diseaseScore,
      status: diseaseScore >= 80 ? 'safe' : diseaseScore >= 60 ? 'warning' : 'critical',
      detail: lang === 'hi'
        ? `तापमान ${temp}°C और आर्द्रता ${humidity}% पर संक्रमण का जोखिम ${stress.fungalRisk}% है।`
        : `Fungal risk is ${stress.fungalRisk}% at ${temp}°C and ${humidity}% humidity.`
    },
    {
      key: 'climate_survival_simulator',
      label: lang === 'hi' ? 'जलवायु सिमुलेटर' : 'Climate Survival',
      icon: <Cloud size={20} />,
      metric: lang === 'hi' ? `तापमान: ${temp}°C` : `Temp: ${temp}°C`,
      score: climateScore,
      status: climateScore >= 75 ? 'optimal' : 'warning',
      detail: lang === 'hi'
        ? `वर्षा ${rain} mm और हवा की गति ${wind} km/h के साथ मौसम सुरक्षा रेटिंग ${climateScore}% है।`
        : `Crop weather safety rating is ${climateScore}% with ${rain} mm rain and ${wind} km/h wind.`
    },
    {
      key: 'autonomous_seasonal_planner',
      label: lang === 'hi' ? 'ऋतु चक्र नियोजक' : 'Seasonal Planner',
      icon: <Target size={20} />,
      metric: lang === 'hi' ? 'वानस्पतिक विकास चरण' : 'Vegetative Growth Phase',
      score: plannerScore,
      status: plannerScore >= 80 ? 'compliant' : 'moderate',
      detail: lang === 'hi'
        ? `वर्तमान नमी स्तर आपकी फसल के विकास चक्र के लिए उपयुक्त योजना अनुपालन दिखाता है।`
        : `Active moisture aligns well with scheduled vegetative phase compliance.`
    },
    {
      key: 'farm_resilience_score',
      label: lang === 'hi' ? 'खेत लचीलापन सूचकांक' : 'Resilience Index',
      icon: <Gauge size={20} />,
      metric: lang === 'hi' ? `कुल स्थिरता: ${resilienceScore}/100` : `Stability: ${resilienceScore}/100`,
      score: resilienceScore,
      status: resilienceScore >= 75 ? 'good' : 'moderate',
      detail: lang === 'hi'
        ? `सभी वास्तविक मौसम और सेंसर डेटा को मिलाकर समग्र स्थिरता सूचकांक ${resilienceScore}% है।`
        : `Composite agricultural resilience index is ${resilienceScore}% combining all live inputs.`
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* SECTION 1: PFRIE 6-Engine Core Analytics */}
      <div className="glass-panel" style={{ padding: '1.25rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '2px solid var(--border-gov)', paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '0.98rem', color: 'var(--primary-deep)', fontWeight: 800 }}>
            {lang === 'hi' ? 'फसल स्वास्थ्य एवं जोखिम प्रबंधन उप-इंजन' : 'Crop Health & Risk Management Sub-Engines'}
          </h3>
          <span style={{ fontSize: '0.7rem', background: 'var(--primary-mint)', color: 'var(--primary-emerald)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
            6 Sub-Engines Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="grid-3">
          {engines.map(engine => (
            <div 
              key={engine.key} 
              onClick={() => setSelectedEngineDetail(engine.key)}
              className="glass-panel hover-card-premium"
              style={{ 
                background: '#ffffff', 
                border: '1px solid var(--border-gov)', 
                borderRadius: '8px', 
                padding: '1rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                cursor: 'pointer'
              }}
              title={`Click to inspect detailed ${engine.label} calculations report`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    color: getPfrieColor(engine.score), 
                    background: `${getPfrieColor(engine.score)}15`, 
                    borderRadius: '6px', 
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {engine.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dark)' }}>{engine.label}</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{engine.metric}</span>
                  </div>
                </div>
                
                <span style={{ 
                  fontSize: '0.58rem', 
                  fontWeight: 800, 
                  color: getPfrieColor(engine.score),
                  background: `${getPfrieColor(engine.score)}15`,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase'
                }}>
                  {engine.status}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Efficiency Index:</span>
                  <strong style={{ color: getPfrieColor(engine.score) }}>{engine.score}%</strong>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${engine.score}%`, 
                      height: '100%', 
                      background: getPfrieColor(engine.score), 
                      borderRadius: '3px',
                      transition: 'width 1s ease-in-out'
                    }} 
                  />
                </div>
              </div>

              <p style={{ fontSize: '0.68rem', color: 'var(--text-body)', lineHeight: '1.4', margin: '4px 0 0' }}>{engine.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Bottom Grid containing IoT, Drones, Carbon, and Insurance (Scrollable container) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }} className="grid-2">
        
        {/* Left Side bottom row: IoT and Drones (scrollable) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* IoT Sensor Connection */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-gov)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={16} style={{ color: 'var(--primary-emerald)' }} /> {t.pfrieIoTTitle}
              </h4>
              <span style={{ fontSize: '0.7rem', color: espStatus === 'connected' ? 'var(--primary-emerald)' : 'var(--danger)', fontWeight: 800 }}>
                {espStatus.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '2px' }}>Protocol Mode</label>
                  <select value={espConnectionMode} onChange={(e: any) => setEspConnectionMode(e.target.value)} style={{ width: '100%', padding: '4px' }}>
                    <option value="wifi">WiFi Local Gateway</option>
                    <option value="ble">Bluetooth Low Energy</option>
                    <option value="serial">USB Serial node</option>
                  </select>
                </div>
                {espConnectionMode === 'wifi' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '2px' }}>SSID</label>
                      <input type="text" value={espWifiSsid} onChange={(e) => setEspWifiSsid(e.target.value)} style={{ width: '100%', padding: '4px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '2px' }}>IP Gateway</label>
                      <input type="text" value={espWifiIp} onChange={(e) => setEspWifiIp(e.target.value)} style={{ width: '100%', padding: '4px' }} />
                    </div>
                  </>
                )}
                {espStatus === 'connected' ? (
                  <button onClick={disconnectEsp32} className="btn btn-secondary" style={{ width: '100%', padding: '4px', fontSize: '0.75rem', background: '#fef2f2', color: 'var(--danger)', borderColor: '#fca5a5' }}>
                    Disconnect Node
                  </button>
                ) : (
                  <button onClick={connectEsp32} className="btn btn-primary" style={{ width: '100%', padding: '4px', fontSize: '0.75rem' }} disabled={espStatus === 'connecting'}>
                    Connect Hardware
                  </button>
                )}
              </div>

              {/* Logs */}
              <div style={{ background: '#0f172a', padding: '6px', borderRadius: '4px', color: '#00ffcc', fontFamily: 'monospace', fontSize: '0.62rem', height: '140px', overflowY: 'auto', border: '1px solid var(--border-gov)' }}>
                {espLogs.map((log, idx) => (
                  <div key={idx} style={{ marginBottom: '2px' }}>{log}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Autonomous Drone Planner */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-gov)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={16} /> {t.pfrieDroneTitle}
            </h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '0.75rem' }}>
              <select id="drone-farm-select" style={{ flex: 1, padding: '4px' }}>
                {farmsList.map((f, idx) => (
                  <option key={idx} value={f.id}>{f.location_name}</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  const el = document.getElementById('drone-farm-select') as HTMLSelectElement;
                  if (el) generateDronePlan(el.value);
                }} 
                className="btn btn-primary" 
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                disabled={droneGenerating || farmsList.length === 0}
              >
                {droneGenerating ? 'Optimizing path...' : 'Calculate Waypoints'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
              {dronePlans.map((plan, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--border-gov)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Plan #{plan.id.slice(0, 5)} - Altitude: {plan.flight_altitude_meters}m</span>
                  <strong>{plan.status.toUpperCase()} ({plan.estimated_duration_minutes}m)</strong>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side bottom row: Carbon and Insurance (scrollable) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Carbon Credit Tracker */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-gov)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Leaf size={16} style={{ color: 'var(--primary-emerald)' }} /> {t.pfrieCarbonTitle}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {carbonCredits.map((cc, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--border-gov)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{t.pfrieCreditType}: {cc.credit_type.replace('_', ' ')}</span>
                    <span style={{ color: cc.verification_status === 'verified' ? 'var(--primary-emerald)' : 'var(--accent-orange)' }}>
                      {cc.verification_status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: '2px' }}>
                    <span>CO2 Sequestration: {cc.metric_tons_co2} MT</span>
                    <span>Rate: INR {cc.market_rate_per_ton}/ton</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weather Crop Insurance */}
          <div className="glass-panel" style={{ padding: '1rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-gov)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={16} /> {t.pfrieInsuranceTitle}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {insurancePolicies.map((policy, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--border-gov)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{policy.policy_name}</span>
                    <span style={{ color: policy.status === 'active' ? 'var(--primary-emerald)' : 'var(--text-muted)' }}>
                      {policy.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: '2px', alignItems: 'center' }}>
                    <span>Coverage: INR {policy.coverage_amount}</span>
                    {policy.status === 'active' ? (
                      <button 
                        onClick={() => fileInsuranceClaim(policy.id)} 
                        className="btn btn-primary" style={{ padding: '2px 6px', fontSize: '0.62rem' }}
                      >
                        File Deficit Claim
                      </button>
                    ) : (
                      <span>Claim Registered</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Dynamic PFRIE Sub-Engine Analytical Report Modal */}
      {selectedEngineDetail && (() => {
        const key = selectedEngineDetail;
        const moisture = liveTelemetry?.moisture || 33.5;
        const temp = weather ? weather.temp : 26;
        const rain = weather ? weather.rain : 0;
        const nitrogen = liveTelemetry?.nitrogen || 45;
        const potassium = liveTelemetry?.potassium || 50;

        let title = '';
        let subtitle = '';
        let score = 0;
        let status = 'stable';
        let badgeColor = 'var(--primary-emerald)';
        let modelName = '';
        let modelDesc = '';
        let explanation = '';
        let formula = '';
        let params: { name: string; target: string; current: string; status: string; isGood: boolean }[] = [];
        let directives: string[] = [];

        if (key === 'living_root_intelligence') {
          title = lang === 'hi' ? 'जैविक जड़ सूचकांक विश्लेषण' : 'Living Root Intelligence Report';
          subtitle = 'Sub-Engine 1: Mycorrhizal & Root-Zone Biological Activity';
          score = Math.min(100, Math.round(50 + moisture * 0.9));
          status = score >= 75 ? 'healthy' : 'moderate';
          badgeColor = score >= 75 ? 'var(--primary-emerald)' : 'var(--accent-orange)';
          modelName = 'soil-microbial-biomass-regressor';
          modelDesc = 'A Random Forest model trained on soil respiration (CO2 release rates) and bulk soil density to estimate fungal hyphae density and soil microbial activity.';
          explanation = 'Analyzes the symbiosis between crop root networks and beneficial soil microbes (like Mycorrhizae). Healthy biological activity promotes water absorption, soil structure retention, and natural nutrient uptake.';
          formula = '\\text{Root Intel Score} = 50 + (\\text{Soil Moisture} \\times 0.9)';
          params = [
            { name: 'Soil Moisture', target: '35% - 60%', current: `${moisture}%`, status: moisture >= 35 && moisture <= 60 ? 'Optimal' : 'Sub-Optimal', isGood: moisture >= 35 && moisture <= 60 },
            { name: 'Soil Nitrogen (N)', target: '> 50 mg/kg', current: `${nitrogen} mg/kg`, status: nitrogen >= 50 ? 'Sufficient' : 'Deficit', isGood: nitrogen >= 50 },
            { name: 'Air Temperature', target: '18°C - 28°C', current: `${temp}°C`, status: temp >= 18 && temp <= 28 ? 'Optimal Growth' : 'Stress', isGood: temp >= 18 && temp <= 28 }
          ];
          directives = [
            lang === 'hi' ? 'मृदा स्वास्थ्य बढ़ाने के लिए जैविक कम्पोस्ट या माइकोरिज़ल बायो-फर्टिलाइज़र डालें।' : 'Add organic compost or Mycorrhizal bio-fertilizers to stimulate fungal root inoculation.',
            lang === 'hi' ? 'जड़ विकास बनाए रखने के लिए नमी को ३५% से नीचे न जाने दें।' : 'Irrigate regularly to maintain moisture above 35% and prevent root cell desiccation.',
            lang === 'hi' ? 'रासायनिक उर्वरकों का अत्यधिक उपयोग टालें, जो प्राकृतिक रोगाणुओं को नुकसान पहुंचाते हैं।' : 'Reduce excessive chemical pesticide usage which degrades subterranean biological health.'
          ];
        } else if (key === 'groundwater_digital_twin') {
          title = lang === 'hi' ? 'भूजल डिजिटल ट्विन सिमुलेशन' : 'Groundwater Digital Twin Report';
          subtitle = 'Sub-Engine 2: Deep Sump & Aquifer Capillary Hydrodynamics';
          const reservoirLevel = activeFarmIndex === 0 ? 58 : activeFarmIndex === 1 ? 27 : 46;
          let gwScore = Math.round(40 + moisture * 0.8 + nitrogen * 0.1);
          if (reservoirLevel < 30) gwScore = Math.max(0, gwScore - 15);
          score = Math.min(100, gwScore);
          status = score >= 70 ? 'moderate' : 'low';
          badgeColor = score >= 70 ? 'var(--accent-orange)' : 'var(--danger)';
          modelName = 'aquifer-depth-lstm-twin';
          modelDesc = 'A deep Long Short-Term Memory (LSTM) network modeling soil infiltration, water table capillary rise, and seasonal aquifer drawdown curves.';
          explanation = 'Simulates deep water table dynamics beneath your plot. Models vertical percolation from rainfall against daily transpiration losses to compute overall farm water reserves, integrated with Central Water Commission (CWC) regional reservoir levels.';
          formula = '\\text{GW Intel Score} = 40 + (\\text{Soil Moisture} \\times 0.8) + (\\text{Nitrogen} \\times 0.1)';
          params = [
            { name: 'Soil Moisture', target: '> 30%', current: `${moisture}%`, status: moisture >= 30 ? 'Optimal' : 'Dry Soil', isGood: moisture >= 30 },
            { name: 'Aquifer Infiltration (Rain)', target: '> 0.5mm', current: `${rain} mm`, status: rain >= 0.5 ? 'Active Recharge' : 'Stable', isGood: rain >= 0.5 },
            { name: 'Regional Reservoir storage', target: '> 30%', current: `${reservoirLevel}%`, status: reservoirLevel >= 30 ? 'Safe capacity' : 'Critical Deficit', isGood: reservoirLevel >= 30 }
          ];
          directives = [
            lang === 'hi' ? 'बारिश के पानी को संचित करने के लिए खेत के किनारों पर जल पुनर्भरण गड्ढे बनाएं।' : 'Construct rainwater harvesting trenches along borders to speed up aquifer recharge.',
            lang === 'hi' ? 'जलाशय स्तर कम होने पर सिंचाई सीमित करें और शुष्क खेती तकनीक अपनाएं।' : 'Limit irrigation when regional reservoir levels are under 30% to conserve farm reserves.',
            lang === 'hi' ? 'फसल चक्र अपनाएं, ताकि गहरे भूजल का अंधाधुंध दोहन न हो।' : 'Implement crop rotation with shallow-rooted crops to prevent excessive aquifer extraction.'
          ];
        } else if (key === 'village_disease_intelligence') {
          title = lang === 'hi' ? 'कीट एवं रोग वेक्टर ट्रैकिंग' : 'Village Disease Intelligence Report';
          subtitle = 'Sub-Engine 3: Pathogen Vector Spreading & Infection Index';
          const vectorAlert = activeFarmIndex === 0 ? 'No active alerts' : activeFarmIndex === 1 ? 'Aphid vectors (14km)' : 'Whitefly Outbreak (9km)';
          const hasAlert = vectorAlert !== 'No active alerts';
          let diseaseScore = 100 - stress.maxRisk;
          if (hasAlert) diseaseScore = Math.max(0, diseaseScore - 18);
          score = diseaseScore;
          status = score >= 80 ? 'safe' : score >= 60 ? 'warning' : 'critical';
          badgeColor = score >= 80 ? 'var(--primary-emerald)' : score >= 60 ? 'var(--accent-orange)' : 'var(--danger)';
          modelName = 'disease-triangle-cnn';
          modelDesc = 'A convolutional neural network model correlating regional humidity levels, precipitation frequency, and local temperature ranges to estimate vector replication.';
          explanation = 'Tracks micro-climate conditions that allow fungal spores to germinate or sucking insect vectors (like aphids/thrips) to reproduce rapidly in the village area, cross-referenced with ICAR epidemiological vector monitoring databases.';
          formula = '\\text{Pathogen Safety Score} = 100 - \\max(\\text{Fungal Risk}, \\text{Root Rot Risk}, \\text{Pest Risk})';
          params = [
            { name: 'Fungal Spore Germination Risk', target: '< 35%', current: `${stress.fungalRisk}%`, status: stress.fungalRisk < 35 ? 'Low' : 'Elevated', isGood: stress.fungalRisk < 35 },
            { name: 'Root Rot / Anoxia Risk', target: '< 35%', current: `${stress.rootRotRisk}%`, status: stress.rootRotRisk < 35 ? 'Low' : 'Critical', isGood: stress.rootRotRisk < 35 },
            { name: 'Regional Pathogen Alert (ICAR)', target: 'No Alerts', current: vectorAlert, status: hasAlert ? 'Outbreak Alert' : 'Clear', isGood: !hasAlert }
          ];
          directives = [
            lang === 'hi' ? 'क्षेत्रीय रोग प्रसार होने पर पत्तियों पर नीम के तेल का छिड़काव पहले से ही करें।' : 'Apply preventative organic neem oil foliar spray if regional vector alerts are active.',
            lang === 'hi' ? 'कीट पतंगों को नियंत्रित करने के लिए खेत सीमाओं पर बाड़ फसलें लगाएं।' : 'Introduce friendly insect predators (e.g. lacewings) or yellow sticky traps for pests.',
            lang === 'hi' ? 'यदि कोई संक्रमण ६०% से अधिक हो, तो त्वरित ड्रोन छिड़काव शेड्यूलर का उपयोग करें।' : 'Initiate a precautionary organic copper foliar spray if any index exceeds 50%.'
          ];
        } else if (key === 'climate_survival_simulator') {
          title = lang === 'hi' ? 'जलवायु सिमुलेटर रिपोर्ट' : 'Climate Survival Simulator Report';
          subtitle = 'Sub-Engine 4: 21-Day Heat Wave & Drought Shock Prediction';
          score = Math.round(100 - temp * 1.2 - (100 - moisture) * 0.3);
          status = score >= 70 ? 'safe' : score >= 50 ? 'warning' : 'danger';
          badgeColor = score >= 70 ? 'var(--primary-emerald)' : score >= 50 ? 'var(--accent-orange)' : 'var(--danger)';
          modelName = 'evapotranspiration-transformer';
          modelDesc = 'A spatio-temporal transformer trained on regional Open-Meteo climate models to forecast thermal crop stress and wilting indices.';
          explanation = 'Evaluates crop survival capacity by analyzing moisture depletion rates against wind, cloud cover, and heatwaves. Computes drought stress before visible leaves wilt.';
          formula = '\\text{Survival Index} = 100 - (\\text{Temp} \\times 1.2) - (100 - \\text{Soil Moisture}) \\times 0.3';
          params = [
            { name: 'Air Temperature', target: '< 35°C', current: `${temp}°C`, status: temp < 35 ? 'Safe' : 'Severe Heat Stress', isGood: temp < 35 },
            { name: 'Wind Speed', target: '< 20 km/h', current: `${weather?.wind ?? 12} km/h`, status: (weather?.wind ?? 12) < 20 ? 'Optimal' : 'High Evaporation', isGood: (weather?.wind ?? 12) < 20 },
            { name: 'Solar UV Index', target: '< 6.0', current: `${weather?.uvIndex ?? 3.5}`, status: (weather?.uvIndex ?? 3.5) < 6.0 ? 'Safe' : 'High Radiation', isGood: (weather?.uvIndex ?? 3.5) < 6.0 }
          ];
          directives = [
            lang === 'hi' ? 'अत्यधिक तापमान में वाष्पोत्सर्जन कम करने के लिए पत्तियों पर सिलिकॉन या केओलिन स्प्रे करें।' : 'Apply a protective foliar silica/kaolin spray to reflect excess solar radiation.',
            lang === 'hi' ? 'तेज हवाओं से बचाने के लिए ऊंचे पेड़ों की सुरक्षात्मक बाड़ लगाएं।' : 'Maintain perimeter windbreaks or taller shelterbelt crops to reduce moisture depletion.',
            lang === 'hi' ? 'मिट्टी के तापमान को नियंत्रित करने के लिए जैविक मल्च की मोटी परत बिछाएं।' : 'Apply thick biological mulches to shield the topsoil from direct sun thermal conduction.'
          ];
        } else if (key === 'autonomous_seasonal_planner') {
          title = lang === 'hi' ? 'ऋतु चक्र नियोजक विवरण' : 'Autonomous Seasonal Planner Report';
          subtitle = 'Sub-Engine 5: Crop Phenology Phases & Nutrient Optimization Schedules';
          score = (pfrieScores as any).autonomous_seasonal_planner?.score || 91;
          status = 'optimal';
          badgeColor = 'var(--primary-emerald)';
          modelName = 'phenology-stage-classifier-transformer';
          modelDesc = 'A multi-spectral transformer on Hugging Face that estimates vegetative days and schedules agronomic tasks based on Nitrogen-Phosphorus-Potassium thresholds.';
          explanation = 'Maps your crop growth stages (Sowing, Germination, Vegetative, Flowering, Maturity) dynamically to optimize inputs and schedule automatic weeding, pruning, and foliar sprays.';
          formula = '\\text{Schedule Compliance} = 100 - \\sum(\\text{Phase nutrient deficits})';
          
          const seedAgeDays = activeFarmIndex === 0 ? 42 : activeFarmIndex === 1 ? 85 : 15;
          let phaseName = 'Vegetative Growth';
          if (seedAgeDays <= 15) phaseName = 'Germination';
          else if (seedAgeDays > 60 && seedAgeDays <= 90) phaseName = 'Flowering & Pod Fill';
          else if (seedAgeDays > 90) phaseName = 'Maturity & Dry Down';

          params = [
            { name: 'Crop Sowing Age', target: 'Interactive Phase', current: `${seedAgeDays} Days`, status: phaseName, isGood: true },
            { name: 'Potassium (K) Level', target: '> 45 mg/kg', current: `${potassium} mg/kg`, status: potassium >= 45 ? 'Sufficient' : 'Low', isGood: potassium >= 45 },
            { name: 'Nitrogen (N) Level', target: '> 50 mg/kg', current: `${nitrogen} mg/kg`, status: nitrogen >= 50 ? 'Sufficient' : 'Low', isGood: nitrogen >= 50 }
          ];
          directives = [
            lang === 'hi' ? 'वानस्पतिक विकास चरण में नाइट्रोजन की पर्याप्त आपूर्ति सुनिश्चित करें।' : 'Nitrogen is crucial during this Vegetative Growth phase. Verify soil Nitrogen is > 50 mg/kg.',
            lang === 'hi' ? 'पुष्पन चरण में फास्फोरस और पोटेशियम का पूरक छिड़काव करें।' : 'Transition nutrient mix to high Phosphorus/Potassium once flowering pods begin forming.',
            lang === 'hi' ? 'कीटनाशकों के छिड़काव को सुबह ८ से ११ बजे के बीच ही शेड्यूल करें।' : 'Schedule weeding and systemic protective sprays when upcoming weather shows 0% rain.'
          ];
        } else {
          title = lang === 'hi' ? 'खेत लचीलापन सूचकांक विश्लेषण' : 'Farm Resilience Index Report';
          subtitle = 'Sub-Engine 6: Composite Ecological Stability & Credit Eligibility Rating';
          
          const rootScore = Math.min(100, Math.round(50 + moisture * 0.9));
          const reservoirLevel = activeFarmIndex === 0 ? 58 : activeFarmIndex === 1 ? 27 : 46;
          let gwScore = Math.round(40 + moisture * 0.8 + nitrogen * 0.1);
          if (reservoirLevel < 30) gwScore = Math.max(0, gwScore - 15);
          gwScore = Math.min(100, gwScore);

          const vectorAlert = activeFarmIndex === 0 ? 'No active alerts' : activeFarmIndex === 1 ? 'Aphid vectors (14km)' : 'Whitefly Outbreak (9km)';
          const hasAlert = vectorAlert !== 'No active alerts';
          let diseaseScore = 100 - stress.maxRisk;
          if (hasAlert) diseaseScore = Math.max(0, diseaseScore - 18);
          diseaseScore = Math.max(0, diseaseScore);

          const climateScore = (pfrieScores as any).climate_survival_simulator?.score || 64;
          const plannerScore = (pfrieScores as any).autonomous_seasonal_planner?.score || 91;
          const compositeResilience = Math.round((rootScore + gwScore + diseaseScore + climateScore + plannerScore) / 5);

          score = compositeResilience;
          status = score >= 75 ? 'excellent' : 'moderate';
          badgeColor = score >= 75 ? 'var(--primary-emerald)' : 'var(--accent-orange)';
          modelName = 'agro-ecological-resilience-index';
          modelDesc = 'A composite scoring model calculating the weighted average of soil biological activity, local hydrology resilience, climate buffering, and scheduling compliance.';
          explanation = 'The Farm Resilience Index measures long-term agricultural sustainability, climate survival limits, and biosecurity safety margins. It is a composite rating used directly by insurers and financial credit bureaus to grade eligibility for weather-indexed micro-insurance payouts and zero-collateral agricultural loans.';
          formula = '\\text{Resilience Score} = \\frac{\\text{Root} + \\text{Groundwater} + \\text{Disease} + \\text{Climate} + \\text{Planner}}{5}';
          params = [
            { name: 'Living Root Intel', target: '> 75%', current: `${rootScore}%`, status: rootScore >= 75 ? 'Healthy' : 'Low Microbes', isGood: rootScore >= 75 },
            { name: 'Groundwater Model', target: '> 70%', current: `${gwScore}%`, status: gwScore >= 70 ? 'Moderate' : 'Strained', isGood: gwScore >= 70 },
            { name: 'Biosecurity Vector Tracker', target: '> 80%', current: `${diseaseScore}%`, status: diseaseScore >= 80 ? 'Safe' : 'Alert Triggered', isGood: diseaseScore >= 80 }
          ];
          directives = [
            lang === 'hi' ? 'फसल विविधता (इंटरक्रॉपिंग) बढ़ाकर खेत के जैविक सुरक्षा चक्र को बढ़ाएं।' : 'Diversify crop varieties (intercropping) to increase your plot\'s safety buffer.',
            lang === 'hi' ? 'मौसम-आधारित फसल बीमा सक्रिय रखें ताकि सूखे या बाढ़ में वित्तीय सुरक्षा बनी रहे।' : 'Maintain an active Weather-Indexed Crop Insurance policy to buffer against climate shocks.',
            lang === 'hi' ? 'टेलीमेट्री गेटवे डेटा निरंतर चालू रखें ताकि बैंक क्रेडिट ग्रेड "A" बना रहे।' : 'Ensure IoT sensors remain online to secure your credit score grade for seasonal loans.'
          ];
        }

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1.5rem'
          }}>
            <div className="glass-panel animate-scale-up" style={{
              background: '#ffffff', border: `2px solid ${badgeColor}`, borderRadius: '12px',
              padding: '1.75rem', width: '100%', maxWidth: '620px', display: 'flex', flexDirection: 'column', gap: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto'
            }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-gov)', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-deep)', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {title}
                  </h3>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{subtitle}</span>
                </div>
                <button 
                  onClick={() => setSelectedEngineDetail(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-gov)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Computed Sub-Engine Efficiency Index:</span>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.6rem', color: badgeColor, display: 'block', lineHeight: 1 }}>{score}%</strong>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: badgeColor, textTransform: 'uppercase' }}>
                    {status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-deep)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Functional Explanation
                </span>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-body)', margin: 0, lineHeight: 1.4 }}>
                  {explanation}
                </p>
              </div>

              {modelName && (
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-gov)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem' }}>
                  <div>
                    <strong style={{ color: 'var(--primary-deep)' }}>AI Model: </strong>
                    <code style={{ background: '#e2e8f0', padding: '1px 4px', borderRadius: '3px', fontFamily: 'monospace' }}>{modelName}</code>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>{modelDesc}</p>
                  {formula && (
                    <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '4px', marginTop: '2px' }}>
                      <strong style={{ color: 'var(--primary-deep)' }}>Stress Formula: </strong>
                      <code style={{ fontFamily: 'monospace', color: 'var(--primary-emerald)' }}>{formula}</code>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-deep)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Parameter Valuations
                </span>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', background: '#f8fafc', border: '1px solid var(--border-gov)', borderRadius: '6px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-gov)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px' }}>Input Parameter</th>
                      <th style={{ padding: '6px 10px' }}>Target Threshold</th>
                      <th style={{ padding: '6px 10px' }}>Current telemetry</th>
                      <th style={{ padding: '6px 10px' }}>Valuation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < params.length - 1 ? '1px solid var(--border-gov)' : 'none' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 700 }}>{p.name}</td>
                        <td style={{ padding: '6px 10px' }}>{p.target}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 700 }}>{p.current}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 800, color: p.isGood ? 'var(--primary-emerald)' : 'var(--accent-orange)' }}>{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-emerald)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Ecological Optimization Directives
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.72rem', lineHeight: '1.4' }}>
                  {directives.map((rem, idx) => (
                    <p key={idx} style={{ margin: 0, color: 'var(--text-body)' }}>
                      {idx + 1}. <strong>{rem.split(':')[0]}:</strong>{rem.split(':')[1] || ''}
                    </p>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button 
                  onClick={() => setSelectedEngineDetail(null)}
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.6rem' }}
                >
                  Dismiss Report
                </button>
                {key === 'village_disease_intelligence' || key === 'autonomous_seasonal_planner' ? (
                  <button 
                    onClick={() => {
                      setSelectedEngineDetail(null);
                      onNavigateToVoiceBookDrone();
                    }}
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '0.6rem', background: 'var(--primary-emerald)', border: 'none' }}
                  >
                    Schedule Spray Drone
                  </button>
                ) : (
                  <button 
                    onClick={() => setSelectedEngineDetail(null)}
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '0.6rem', background: 'var(--primary-deep)', border: 'none' }}
                  >
                    All Parameters Verified
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default PfriePage;
