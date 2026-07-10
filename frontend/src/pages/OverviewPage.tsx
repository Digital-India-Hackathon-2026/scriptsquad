import React, { useState, useEffect } from 'react';
import {
  Compass,
  Layers,
  FileText,
  Check,
  AlertTriangle,
  Volume2,
  Droplet,
  ShieldAlert,
  PhoneCall,
  Truck,
  CloudRain
} from 'lucide-react';
import { translations, type LangType } from '../lib/locale';

// ─── Weather Condition Helper ──────────────────────────────────
const getWeatherDesc = (code: number, lang: string): string => {
  const desc: Record<string, Record<number, string>> = {
    en: {
      0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
      45: "Foggy", 48: "Depositing Fog", 51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Heavy Drizzle",
      61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain", 80: "Slight Showers", 81: "Moderate Showers", 82: "Heavy Showers",
      95: "Thunderstorm"
    },
    hi: {
      0: "साफ आसमान", 1: "मुख्यतः साफ", 2: "आंशिक रूप से बादल", 3: "घने बादल",
      45: "कोहरा", 48: "घना कोहरा", 51: "हल्की बूंदाबांदी", 53: "मध्यम बूंदाबांदी", 55: "भारी बूंदाबांदी",
      61: "हल्की बारिश", 63: "मध्यम बारिश", 65: "भारी बारिश", 80: "हल्की बौछारें", 81: "मध्यम बौछारें", 82: "भारी बौछारें",
      95: "गरज के साथ तूफान"
    },
    mr: {
      0: "स्वच्छ आकाश", 1: "मुख्यतः स्वच्छ", 2: "अंशतः ढगाळ", 3: "ढगाळ वातावरण",
      45: "धुके", 48: "दाट धुके", 51: "हलकी भुरभुर", 53: "मध्यम भुरभुर", 55: "मुसळधार भुरभुर",
      61: "हलका पाऊस", 63: "मध्यम पाऊस", 65: "मुसळधार पाऊस", 80: "हलक्या सरी", 81: "मध्यम सरी", 82: "मुसळधार सरी",
      95: "वादळी पाऊस"
    },
    te: {
      0: "నిర్మలమైన ఆకాశం", 1: "దాదాపు నిర్మలం", 2: "పాక్షికంగా మేఘావృతం", 3: "పూర్తిగా మేఘావృతం",
      45: "పొగమంచు", 48: "దట్టమైన పొగమంచు", 51: "తేలికపాటి జల్లులు", 53: "మధ్యస్థ జల్లులు", 55: "భారీ జల్లులు",
      61: "తేలికపాటి వర్షం", 63: "మధ్యస్థ వర్షం", 65: "భారీ వర్షం", 80: "తేలికపాటి జల్లులు", 81: "మధ్యస్థ జల్లులు", 82: "భారీ జల్లులు",
      95: "ఉరుములతో కూడిన వర్షం"
    }
  };
  const l = desc[lang] || desc['en'];
  return l[code] || l[0];
};

interface OverviewPageProps {
  mapContainer: React.RefObject<HTMLDivElement | null>;
  farmsList: any[];
  activeFarmIndex: number;
  setActiveFarmIndex: (idx: number) => void;
  liveTelemetry: {
    moisture: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    timestamp: string;
  };
  overviewSubTab: 'map' | 'risk';
  setOverviewSubTab: (tab: 'map' | 'risk') => void;
  portalTab: 'gis' | 'gov' | 'schema';
  setPortalTab: (tab: 'gis' | 'gov' | 'schema') => void;
  coordInputMode: 'single' | 'polygon';
  setCoordInputMode: (mode: 'single' | 'polygon') => void;
  newFarmName: string;
  setNewFarmName: (v: string) => void;
  newFarmCrop: string;
  setNewFarmCrop: (v: string) => void;
  newFarmCoords: string;
  setNewFarmCoords: (v: string) => void;
  singleLat: string;
  setSingleLat: (v: string) => void;
  singleLng: string;
  setSingleLng: (v: string) => void;
  singleRadius: string;
  setSingleRadius: (v: string) => void;
  voiceLang: string;
  speakText: (text: string) => void;
  onFarmSubmit: (e: React.FormEvent) => void;
  onNavigateToVoiceBookDrone: () => void;
  lang: LangType;
}

const OverviewPage: React.FC<OverviewPageProps> = ({
  mapContainer,
  farmsList,
  activeFarmIndex,
  setActiveFarmIndex: _setActiveFarmIndex,
  liveTelemetry,
  overviewSubTab,
  setOverviewSubTab,
  portalTab,
  setPortalTab,
  coordInputMode,
  setCoordInputMode,
  newFarmName,
  setNewFarmName,
  newFarmCrop,
  setNewFarmCrop,
  newFarmCoords,
  setNewFarmCoords,
  singleLat,
  setSingleLat,
  singleLng,
  setSingleLng,
  singleRadius,
  setSingleRadius,
  voiceLang: _voiceLang,
  speakText,
  onFarmSubmit,
  onNavigateToVoiceBookDrone,
  lang,
}) => {
  const t = translations[lang];

  // Weather States
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
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [selectedDiseaseDetail, setSelectedDiseaseDetail] = useState<'fungal' | 'root_rot' | 'pest' | null>(null);

  const activeFarm = farmsList[activeFarmIndex] || farmsList[0];

  useEffect(() => {
    if (!activeFarm) return;
    setWeatherLoading(true);
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
        setWeatherLoading(false);
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
        setWeatherLoading(false);
      });
  }, [activeFarm]);

  const getCropStatus = () => {
    if (liveTelemetry.moisture > 30) {
      return {
        label: lang === 'hi' ? 'फसल सुरक्षित है' : lang === 'mr' ? 'पीक सुरक्षित आहे' : 'Crop is Healthy',
        detail: lang === 'hi' ? 'मिट्टी में पर्याप्त नमी है।' : lang === 'mr' ? 'मातीत पुरेशी ओल आहे.' : 'Optimal soil moisture verified.',
        icon: <Check size={28} style={{ color: 'var(--primary-emerald)' }} />,
        color: 'var(--primary-mint)',
        textColor: 'var(--primary-emerald)',
        borderColor: 'rgba(21, 128, 61, 0.2)',
      };
    } else if (liveTelemetry.moisture > 20) {
      return {
        label: lang === 'hi' ? 'पानी की कमी' : lang === 'mr' ? 'पाण्याची कमतरता' : 'Water Deficit Warning',
        detail: lang === 'hi' ? 'फसल को पानी की आवश्यकता है।' : lang === 'mr' ? 'पिकाला पाणी देण्याची गरज आहे.' : 'Soil water tension building.',
        icon: <Droplet size={28} style={{ color: 'var(--accent-orange)' }} />,
        color: 'var(--accent-orange-glow)',
        textColor: 'var(--accent-orange)',
        borderColor: 'rgba(194, 65, 12, 0.2)',
      };
    } else {
      return {
        label: lang === 'hi' ? 'बीमारी का खतरा' : lang === 'mr' ? 'रोगाचा प्रादुर्भाव' : 'Disease Threat Active',
        detail: lang === 'hi' ? 'ड्रोन जैविक छिड़काव करें।' : lang === 'mr' ? 'ड्रोन फवारणी करणे आवश्यक आहे.' : 'Intracellular stress critical.',
        icon: <AlertTriangle size={28} style={{ color: 'var(--danger)' }} />,
        color: 'var(--danger-glow)',
        textColor: 'var(--danger)',
        borderColor: 'rgba(185, 28, 28, 0.2)',
      };
    }
  };

  const cropStatus = getCropStatus();

  // Dynamic Agronomic Stress & Disease Predictor
  const calculateStressMetrics = () => {
    const moisture = liveTelemetry.moisture || 33.5;
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
      remedyType
    };
  };

  const stress = calculateStressMetrics();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '1.5rem', alignItems: 'start' }} className="grid-2">

      {/* Left Column: GIS Map Portal / Analytics (Full Height) */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Tab Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-gov)', paddingBottom: '0.75rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setPortalTab('gis')}
              className={`btn ${portalTab === 'gis' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
            >
              <Compass size={14} /> {lang === 'hi' ? 'सैटेलाइट नक्शा' : lang === 'mr' ? 'उपग्रह नकाशा' : 'Satellite Map'}
            </button>
            <button
              onClick={() => setPortalTab('gov')}
              className={`btn ${portalTab === 'gov' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
            >
              <Layers size={14} /> {lang === 'hi' ? 'शासकीय विश्लेषण' : lang === 'mr' ? 'शासकीय विश्लेषण' : 'Gov Analytics'}
            </button>
            <button
              onClick={() => setPortalTab('schema')}
              className={`btn ${portalTab === 'schema' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
            >
              <FileText size={14} /> {lang === 'hi' ? 'डेटा स्कीमा' : lang === 'mr' ? 'डेटा स्कीमा' : 'Data Schemas'}
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary-deep)', fontWeight: 700 }}>
            {activeFarm ? activeFarm.location_name : 'Portal Node'}
          </span>
        </div>

        {/* GIS Tab content with Map and scrollable Form */}
        {portalTab === 'gis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Map Frame taking maximum available space */}
            <div style={{ height: '520px', minHeight: '400px', position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-gov)' }}>
              <div ref={mapContainer} style={{ width: '100%', height: '100%', minHeight: '200px' }} />
            </div>

            {/* Compact Form */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-gov)', flexShrink: 0 }} className="page-scrollable-form">
              <h4 style={{ fontSize: '0.88rem', marginBottom: '0.75rem', color: 'var(--primary-deep)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Compass size={15} style={{ color: 'var(--primary-emerald)' }} /> {t.gisAddPlotTitle}
              </h4>
              <form onSubmit={onFarmSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>{t.gisPlotName}</label>
                    <input
                      type="text"
                      placeholder="e.g. My North Sugarcane Field"
                      value={newFarmName}
                      onChange={(e) => setNewFarmName(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem 0.6rem' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>{t.gisPrimaryCrop}</label>
                    <select value={newFarmCrop} onChange={(e) => setNewFarmCrop(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem' }}>
                      <option value="Soybean">Soybean</option>
                      <option value="Wheat">Wheat</option>
                      <option value="Cotton">Cotton</option>
                      <option value="Sugarcane">Sugarcane</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-gov)', paddingBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setCoordInputMode('single')}
                    className={`btn ${coordInputMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  >
                    {t.gisSinglePointMode}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoordInputMode('polygon')}
                    className={`btn ${coordInputMode === 'polygon' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  >
                    {t.gisCoordinates}
                  </button>
                </div>

                {coordInputMode === 'single' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }} className="grid-3">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>{t.gisLat}</label>
                      <input type="text" value={singleLat} onChange={(e) => setSingleLat(e.target.value)} placeholder="18.521" style={{ width: '100%', padding: '0.4rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>{t.gisLng}</label>
                      <input type="text" value={singleLng} onChange={(e) => setSingleLng(e.target.value)} placeholder="73.8575" style={{ width: '100%', padding: '0.4rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>{t.gisRadius}</label>
                      <input type="text" value={singleRadius} onChange={(e) => setSingleRadius(e.target.value)} placeholder="50" style={{ width: '100%', padding: '0.4rem' }} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                      {t.gisCoordinates} (lng, lat; lng, lat...)
                    </label>
                    <input
                      type="text"
                      value={newFarmCoords}
                      onChange={(e) => setNewFarmCoords(e.target.value)}
                      placeholder="73.8575, 18.521; 73.8590, 18.521; 73.8590, 18.523; 73.8575, 18.523"
                      style={{ width: '100%', padding: '0.4rem 0.6rem' }}
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}>
                  {t.gisSubmitPlot}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Gov Analytics Tab */}
        {portalTab === 'gov' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-up">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }} className="grid-3">
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Regional Yield Target</span>
                <strong style={{ display: 'block', fontSize: '1.25rem', color: 'var(--primary-deep)', marginTop: '2px' }}>4.82 MT/Ha</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Reservoir Capacity</span>
                <strong style={{ display: 'block', fontSize: '1.25rem', color: 'var(--tech-blue)', marginTop: '2px' }}>864 k-Liters</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Active Risk Zones</span>
                <strong style={{ display: 'block', fontSize: '1.25rem', color: 'var(--danger)', marginTop: '2px' }}>2 Zones</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
              <h4 style={{ fontSize: '0.88rem', marginBottom: '0.85rem', fontWeight: 800 }}>Regional Crop Projections</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Soybean (JS-335)</span>
                    <strong>85% Optimal</strong>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '85%', height: '100%', background: 'var(--primary-emerald)' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>Wheat (LOK-1)</span>
                    <strong>65% Optimal</strong>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '65%', height: '100%', background: 'var(--primary-emerald)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schema Tab */}
        {portalTab === 'schema' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-up">
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.25rem' }}>Database Schema Configuration</h4>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-deep)', fontWeight: 800 }}>boundary data type:</span>
              <strong style={{ fontSize: '0.82rem', display: 'block', color: 'var(--text-dark)', marginTop: '2px' }}>PostGIS GEOMETRY(Polygon, 4326)</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-deep)', fontWeight: 800 }}>reading_value data type:</span>
              <strong style={{ fontSize: '0.82rem', display: 'block', color: 'var(--text-dark)', marginTop: '2px' }}>PostgreSQL JSONB</strong>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Farmer Diagnostics (Scrollable Side panel) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-slide-right">
        
        {/* View mode switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#e2e8f0', padding: '3px', borderRadius: '6px', flexShrink: 0 }}>
          <button
            onClick={() => setOverviewSubTab('map')}
            className={`btn ${overviewSubTab === 'map' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem', fontSize: '0.8rem', border: 'none' }}
          >
            {lang === 'hi' ? 'खेत डायल' : lang === 'mr' ? 'शेत डायल' : 'Field Dials'}
          </button>
          <button
            onClick={() => setOverviewSubTab('risk')}
            className={`btn ${overviewSubTab === 'risk' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem', fontSize: '0.8rem', border: 'none' }}
          >
            {lang === 'hi' ? 'तनाव निदान' : lang === 'mr' ? 'ताण निदान' : 'Stress Diagnostics'}
          </button>
        </div>

        {overviewSubTab === 'map' ? (
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* High-contrast status widget */}
            <div style={{
              background: cropStatus.color,
              border: `1px solid ${cropStatus.borderColor}`,
              borderRadius: '6px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{ background: '#ffffff', borderRadius: '50%', padding: '6px', display: 'flex', border: `1px solid ${cropStatus.borderColor}`, flexShrink: 0 }}>
                {cropStatus.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-dark)' }}>{cropStatus.label}</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>{cropStatus.detail}</p>
              </div>
              <button
                onClick={() => speakText(`${cropStatus.label}. ${cropStatus.detail}`)}
                style={{ background: 'var(--primary-deep)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', cursor: 'pointer' }}
                title="Speak Alert"
              >
                <Volume2 size={16} />
              </button>
            </div>

            {/* Moisture/NPK gauges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h5 style={{ fontSize: '0.85rem', color: 'var(--text-dark)', fontWeight: 800 }}>{t.telemetryTitle}</h5>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span>{t.moisture}</span>
                  <strong style={{ color: liveTelemetry.moisture > 30 ? 'var(--primary-emerald)' : 'var(--accent-orange)' }}>{liveTelemetry.moisture}%</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${liveTelemetry.moisture}%`, height: '100%', background: liveTelemetry.moisture > 30 ? 'var(--primary-emerald)' : 'var(--accent-orange)' }} />
                </div>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-gov)', fontSize: '0.78rem' }}>
                <span style={{ display: 'block', fontWeight: 700, marginBottom: '6px', color: 'var(--primary-deep)' }}>NPK Soil Reserves (mg/kg)</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: '#ffffff', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-gov)' }}>
                    <span>N</span>
                    <strong style={{ display: 'block' }}>{liveTelemetry.nitrogen}</strong>
                  </div>
                  <div style={{ background: '#ffffff', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-gov)' }}>
                    <span>P</span>
                    <strong style={{ display: 'block' }}>{liveTelemetry.phosphorus}</strong>
                  </div>
                  <div style={{ background: '#ffffff', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-gov)' }}>
                    <span>K</span>
                    <strong style={{ display: 'block' }}>{liveTelemetry.potassium}</strong>
                  </div>
                </div>
              </div>

              {/* Weather Telemetry widget */}
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-gov)', fontSize: '0.78rem', marginTop: '4px' }}>
                <span style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--primary-deep)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CloudRain size={14} style={{ color: 'var(--primary-emerald)' }} /> Local Weather Forecast
                </span>
                
                {weatherLoading ? (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Updating...</span>
                ) : weather ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ background: '#ffffff', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-gov)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Condition:</span>
                      <span style={{ color: 'var(--primary-deep)', fontSize: '0.75rem' }}>{getWeatherDesc(weather.weatherCode, lang)}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.7rem' }}>
                      <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-gov)' }}>
                        Temp: <strong>{weather.temp}°C</strong>
                      </div>
                      <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-gov)' }}>
                        Humidity: <strong>{weather.humidity}%</strong>
                      </div>
                      <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-gov)' }}>
                        Rainfall: <strong>{weather.rain} mm</strong>
                      </div>
                      <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-gov)' }}>
                        Wind: <strong>{weather.wind} km/h</strong>
                      </div>
                      <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-gov)', gridColumn: 'span 2' }}>
                        UV Index: <strong>{weather.uvIndex} (Low Risk)</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weather unavailable.</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Risk diagnostics */
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-deep)' }}>
              <ShieldAlert size={16} style={{ color: 'var(--accent-orange)' }} /> {lang === 'hi' ? 'पूर्वानुमान एवं रोग निदान' : lang === 'mr' ? 'रोग निदान अंदाज' : 'Stress & Disease Diagnostics'}
            </h4>
            
            {/* Dynamic Alert Banner */}
            <div style={{ 
              background: stress.activeMoisture < 35 ? 'var(--accent-orange-glow)' : stress.fungalRisk > 60 ? 'var(--accent-orange-glow)' : stress.rootRotRisk > 60 ? 'rgba(239, 68, 68, 0.08)' : 'var(--primary-mint)', 
              border: `1px solid ${stress.activeMoisture < 35 ? 'rgba(194, 65, 12, 0.2)' : stress.fungalRisk > 60 ? 'rgba(194, 65, 12, 0.2)' : stress.rootRotRisk > 60 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(21, 128, 61, 0.2)'}`, 
              padding: '0.85rem', borderRadius: '6px', fontSize: '0.78rem', 
              color: stress.activeMoisture < 35 ? 'var(--accent-orange)' : stress.fungalRisk > 60 ? 'var(--accent-orange)' : stress.rootRotRisk > 60 ? '#ef4444' : 'var(--primary-emerald)', 
              fontWeight: 600 
            }}>
              {stress.activeMoisture < 35 ? (
                lang === 'hi' ? `खेत सूखा तनाव की ओर बढ़ रहा है। ${stress.daysToWilt} दिनों में विल्टिंग बिंदु तक पहुंचने की संभावना है।` :
                lang === 'mr' ? `शेतात पाण्याचा ताण आहे. ${stress.daysToWilt} दिवसात पीक सुकण्याची शक्यता आहे.` :
                `Crop entering water deficit stress. Wilting predicted in ${stress.daysToWilt} Days.`
              ) : stress.fungalRisk > 60 ? (
                lang === 'hi' ? 'उच्च आर्द्रता और अनुकूल तापमान के कारण फंगल संक्रमण (लीफ स्पॉट) का खतरा है।' :
                lang === 'mr' ? 'हवेतील दमटपणामुळे बुरशीजन्य रोगाचा (तांबेरा) प्रादुर्भाव होण्याची शक्यता जास्त आहे.' :
                'Favorable environmental conditions. Elevated risk of Fungal Leaf Spot / Powdery Mildew.'
              ) : stress.rootRotRisk > 60 ? (
                lang === 'hi' ? 'अत्यधिक नमी के कारण जड़ों में सड़न (रूट रॉट) होने का खतरा है।' :
                lang === 'mr' ? 'जास्त ओलाव्यामुळे मुळे सडण्याचा धोका निर्माण झाला आहे.' :
                'Excess soil saturation detected. High risk of Root Rot or nutrient anoxia.'
              ) : (
                lang === 'hi' ? 'खेत सुरक्षित है। सभी जैविक परिस्थितियां स्थिर हैं।' :
                lang === 'mr' ? 'शेत सुरक्षित आहे. सर्व जैविक परिस्थिती सामान्य आहे.' :
                'No active stress detected. Biosystem thresholds are in safe margins.'
              )}
            </div>

            {/* Scientific Basis Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
              <span style={{ fontWeight: 800, color: 'var(--primary-deep)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pathogen &amp; Climate Risk Indexes</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '4px 0' }}>
                <div 
                  onClick={() => setSelectedDiseaseDetail('fungal')}
                  style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'all 0.2s', border: '1px solid transparent' }}
                  className="hover-card-premium"
                  title="Click to view transparent prediction report"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>Fungal Spore Germination Risk:</span>
                    <strong style={{ color: stress.fungalRisk > 60 ? 'var(--accent-orange)' : 'var(--primary-emerald)' }}>{stress.fungalRisk}% ⓘ</strong>
                  </div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${stress.fungalRisk}%`, height: '100%', background: stress.fungalRisk > 60 ? 'var(--accent-orange)' : 'var(--primary-emerald)' }} />
                  </div>
                </div>

                <div 
                  onClick={() => setSelectedDiseaseDetail('root_rot')}
                  style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'all 0.2s', border: '1px solid transparent' }}
                  className="hover-card-premium"
                  title="Click to view transparent prediction report"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>Root Rot / Saturation Risk:</span>
                    <strong style={{ color: stress.rootRotRisk > 60 ? '#ef4444' : 'var(--primary-emerald)' }}>{stress.rootRotRisk}% ⓘ</strong>
                  </div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${stress.rootRotRisk}%`, height: '100%', background: stress.rootRotRisk > 60 ? '#ef4444' : 'var(--primary-emerald)' }} />
                  </div>
                </div>

                <div 
                  onClick={() => setSelectedDiseaseDetail('pest')}
                  style={{ cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'all 0.2s', border: '1px solid transparent' }}
                  className="hover-card-premium"
                  title="Click to view transparent prediction report"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>Insect/Pest Vulnerability:</span>
                    <strong style={{ color: stress.pestRisk > 60 ? 'var(--accent-orange)' : 'var(--primary-emerald)' }}>{stress.pestRisk}% ⓘ</strong>
                  </div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${stress.pestRisk}%`, height: '100%', background: stress.pestRisk > 60 ? 'var(--accent-orange)' : 'var(--primary-emerald)' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Actionable Solution Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', background: 'var(--primary-mint)', padding: '0.85rem', borderRadius: '6px', border: '1px solid rgba(21, 128, 61, 0.2)' }}>
              <span style={{ fontWeight: 800, color: 'var(--primary-emerald)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actionable Agronomic Solution</span>
              
              {stress.remedyType === 'drought' && (
                <>
                  <p style={{ color: 'var(--text-dark)', lineHeight: '1.4', margin: 0 }}>
                    1. <strong>Apply Organic Mulch</strong>: Cover soil with crop straw to reduce water evaporation by 30%.
                  </p>
                  <p style={{ color: 'var(--text-dark)', lineHeight: '1.4', margin: 0 }}>
                    2. <strong>Osmotic Sprays</strong>: Apply potassium-rich foliar sprays to boost plant moisture retention.
                  </p>
                </>
              )}
              {stress.remedyType === 'fungal' && (
                <>
                  <p style={{ color: 'var(--text-dark)', lineHeight: '1.4', margin: 0 }}>
                    1. <strong>Avoid Leaf Wetness</strong>: Irrigate close to the ground, avoiding spraying water overhead.
                  </p>
                  <p style={{ color: 'var(--text-dark)', lineHeight: '1.4', margin: 0 }}>
                    2. <strong>Foliar Fungicide</strong>: Schedule a neem oil or organic copper foliar application to inhibit spore growth.
                  </p>
                </>
              )}
              {stress.remedyType === 'root_rot' && (
                <>
                  <p style={{ color: 'var(--text-dark)', lineHeight: '1.4', margin: 0 }}>
                    1. <strong>Clear Drainage Channels</strong>: Prevent standing water around root zones to reintroduce oxygen.
                  </p>
                  <p style={{ color: 'var(--text-dark)', lineHeight: '1.4', margin: 0 }}>
                    2. <strong>Suspend Irrigation</strong>: Halt further watering schedules until moisture drops below 55%.
                  </p>
                </>
              )}
              {stress.remedyType === 'pest' && (
                <>
                  <p style={{ color: 'var(--text-dark)', lineHeight: '1.4', margin: 0 }}>
                    1. <strong>Deploy Natural Predators</strong>: Release ladybugs or lacewings to combat breeding aphids.
                  </p>
                  <p style={{ color: 'var(--text-dark)', lineHeight: '1.4', margin: 0 }}>
                    2. <strong>Remedial Soap Sprays</strong>: Spray organic insecticidal soap on leaf undersides.
                  </p>
                </>
              )}

              <button
                onClick={onNavigateToVoiceBookDrone}
                className="btn btn-primary"
                style={{ padding: '4px 8px', fontSize: '0.72rem', marginTop: '4px', background: 'var(--primary-emerald)', border: 'none' }}
              >
                Execute Remedial Spray
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flexShrink: 0 }}>
          <a
            href="tel:18001234567"
            style={{ background: 'var(--primary-mint)', border: '1px solid rgba(21, 128, 61, 0.2)', borderRadius: '6px', padding: '12px', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'var(--transition)' }}
            className="glass-panel"
          >
            <PhoneCall size={20} style={{ color: 'var(--primary-emerald)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-deep)' }}>
              {lang === 'hi' ? 'सलाहकार हेल्पलाइन' : lang === 'mr' ? 'सल्लागार हेल्पलाइन' : 'Helpline'}
            </span>
          </a>
          <div
            onClick={onNavigateToVoiceBookDrone}
            style={{ background: 'var(--tech-blue-glow)', border: '1px solid rgba(29, 78, 216, 0.2)', borderRadius: '6px', padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'var(--transition)' }}
            className="glass-panel"
          >
            <Truck size={20} style={{ color: 'var(--tech-blue)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--tech-blue)' }}>
              {lang === 'hi' ? 'ड्रोन बुक करें' : lang === 'mr' ? 'ड्रोन बुक करा' : 'Book Drone'}
            </span>
          </div>
        </div>

      </div>
      
      {/* Dynamic Disease Diagnosis Report Modal */}
      {selectedDiseaseDetail && (() => {
        const type = selectedDiseaseDetail;
        const moisture = liveTelemetry.moisture || 33.5;
        const temp = weather ? weather.temp : 26;
        const humidity = weather ? weather.humidity : 60;
        const rain = weather ? weather.rain : 0;
        
        let title = '';
        let baseVal = 0;
        let factors: { name: string; criteria: string; value: number; current: string; active: boolean }[] = [];
        let total = 0;
        let remedies: string[] = [];
        let riskColor = 'var(--primary-emerald)';
        
        if (type === 'fungal') {
          title = lang === 'hi' ? 'फंगल रोग संक्रमण रिपोर्ट' : lang === 'mr' ? 'बुरशीजन्य रोग अहवाल' : 'Fungal Disease Infection Report';
          baseVal = 12;
          const isHumid = humidity > 70;
          const isWarm = temp >= 16 && temp <= 26;
          const isWet = rain > 0.1;
          
          factors = [
            { name: 'Humidity Factor', criteria: 'Relative Humidity > 70%', value: 25, current: `${humidity}%`, active: isHumid },
            { name: 'Temperature Factor', criteria: 'Air Temperature between 16°C and 26°C', value: 38, current: `${temp}°C`, active: isWarm },
            { name: 'Leaf Wetness Factor', criteria: 'Precipitation > 0.1mm (Rain film)', value: 20, current: `${rain} mm`, active: isWet }
          ];
          total = baseVal + factors.reduce((acc, f) => acc + (f.active ? f.value : 0), 0);
          remedies = [
            lang === 'hi' ? 'पत्तियों को सूखा रखने के लिए ड्रिप सिंचाई का उपयोग करें।' : 'Avoid overhead watering to prevent wet leaf surface.',
            lang === 'hi' ? 'फंगल बीजाणुओं को नष्ट करने के लिए जैविक तांबा कवकनाशी या नीम के तेल का छिड़काव करें।' : 'Schedule an organic copper fungicide or neem oil foliar spray.',
            lang === 'hi' ? 'हवा के प्रवाह को बढ़ाने के लिए घने पत्तों की छंटाई करें।' : 'Thin out dense leaves to optimize wind ventilation inside plant canopy.'
          ];
          riskColor = total > 60 ? 'var(--accent-orange)' : 'var(--primary-emerald)';
        } else if (type === 'root_rot') {
          title = lang === 'hi' ? 'जड़ सड़न (रूट रॉट) विश्लेषण रिपोर्ट' : lang === 'mr' ? 'मुळे कुजणे रोग अहवाल' : 'Root Rot & Anoxia Analysis Report';
          baseVal = 8;
          const isSaturated = moisture > 65;
          const isRaining = rain > 1.0;
          const isHot = temp > 24;
          
          factors = [
            { name: 'Soil Waterlogging Factor', criteria: 'Soil Moisture > 65%', value: 45, current: `${moisture}%`, active: isSaturated },
            { name: 'Rainfall Saturation Factor', criteria: 'Precipitation > 1.0mm', value: 30, current: `${rain} mm`, active: isRaining },
            { name: 'Heat decay Factor', criteria: 'Air Temperature > 24°C', value: 12, current: `${temp}°C`, active: isHot }
          ];
          total = baseVal + factors.reduce((acc, f) => acc + (f.active ? f.value : 0), 0);
          remedies = [
            lang === 'hi' ? 'जलभराव को रोकने के लिए तुरंत जल निकासी नालियों को साफ करें।' : 'Clear drainage channels immediately to eliminate standing water.',
            lang === 'hi' ? 'मिट्टी की नमी 55% से कम होने तक सिंचाई को पूरी तरह से निलंबित रखें।' : 'Suspend all active irrigation schedules until soil moisture drops below 55%.',
            lang === 'hi' ? 'मिट्टी में हवा का प्रवाह बढ़ाने के लिए हल्की गुड़ाई करें।' : 'Aerate root zones to reintroduce oxygen to suffocating crop roots.'
          ];
          riskColor = total > 60 ? '#ef4444' : 'var(--primary-emerald)';
        } else {
          title = lang === 'hi' ? 'कीट पतंग संक्रमण संवेदनशीलता' : lang === 'mr' ? 'कीड प्रादुर्भाव अहवाल' : 'Sucking Pests Outbreak Report';
          baseVal = 10;
          const isHot = temp > 30;
          const isDry = humidity < 50;
          
          factors = [
            { name: 'Thermal Breeding Factor', criteria: 'Air Temperature > 30°C', value: 35, current: `${temp}°C`, active: isHot },
            { name: 'Aridity Multiplication Factor', criteria: 'Relative Humidity < 50%', value: 40, current: `${humidity}%`, active: isDry }
          ];
          total = baseVal + factors.reduce((acc, f) => acc + (f.active ? f.value : 0), 0);
          remedies = [
            lang === 'hi' ? 'जैविक नीम के तेल या कीटनाशक साबुन का पत्तियों के नीचे छिड़काव करें।' : 'Apply a thorough spray of organic neem oil or insecticidal soap under leaves.',
            lang === 'hi' ? 'पोषक तत्वों को अवशोषित करने वाले कीटों से लड़ने के लिए लेडीबग्स (लेडीबर्ड बीटल) छोड़ें।' : 'Release natural beneficial insect predators (e.g. ladybugs) in the field.',
            lang === 'hi' ? 'कीटों के प्रवास को रोकने के लिए खेत की सीमाओं पर बाड़ फसलें लगाएं।' : 'Establish trap crops or physical barrier crops on plot borders.'
          ];
          riskColor = total > 60 ? 'var(--accent-orange)' : 'var(--primary-emerald)';
        }

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1.5rem'
          }}>
            <div className="glass-panel animate-scale-up" style={{
              background: '#ffffff', border: `2px solid ${riskColor}`, borderRadius: '12px',
              padding: '1.75rem', width: '100%', maxWidth: '580px', display: 'flex', flexDirection: 'column', gap: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
            }}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-gov)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-deep)', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={22} style={{ color: riskColor }} />
                  {title}
                </h3>
                <button 
                  onClick={() => setSelectedDiseaseDetail(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>

              {/* Live Threat Gauge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-gov)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Computed Prediction Risk:</span>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.6rem', color: riskColor, display: 'block', lineHeight: 1 }}>{total}%</strong>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: riskColor, textTransform: 'uppercase' }}>
                    {total > 60 ? 'High Risk' : total > 35 ? 'Moderate' : 'Low / Stable'}
                  </span>
                </div>
              </div>

              {/* Mathematical Process & Calculation Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-deep)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Transparent Scientific Calculation
                </span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-gov)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px' }}>
                    <span>Baseline Constant:</span>
                    <strong>+{baseVal}%</strong>
                  </div>
                  {factors.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: f.active ? 'var(--text-dark)' : 'var(--text-muted)' }}>
                      <div>
                        <span>{f.name} ({f.criteria}):</span>
                        <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)' }}>Current: {f.current}</span>
                      </div>
                      <strong style={{ color: f.active ? riskColor : 'var(--text-muted)' }}>
                        {f.active ? `+${f.value}% (Triggered)` : '0% (Not met)'}
                      </strong>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', fontWeight: 800, fontSize: '0.8rem' }}>
                    <span>Total Probability:</span>
                    <span style={{ color: riskColor }}>{total}%</span>
                  </div>
                </div>
              </div>

              {/* Actionable Remedies */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-emerald)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Remedial Directives
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  {remedies.map((rem, idx) => (
                    <p key={idx} style={{ margin: 0, color: 'var(--text-body)' }}>
                      {idx + 1}. <strong>{rem.split(':')[0]}:</strong>{rem.split(':')[1] || ''}
                    </p>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button 
                  onClick={() => setSelectedDiseaseDetail(null)}
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.6rem' }}
                >
                  Dismiss Report
                </button>
                <button 
                  onClick={() => {
                    setSelectedDiseaseDetail(null);
                    onNavigateToVoiceBookDrone();
                  }}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '0.6rem', background: 'var(--primary-emerald)', border: 'none' }}
                >
                  Book Spray Drone
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default OverviewPage;
