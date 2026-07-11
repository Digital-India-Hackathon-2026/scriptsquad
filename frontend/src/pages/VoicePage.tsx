import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Send, Phone, PhoneCall, Mic, MicOff,
  Activity, CloudRain, ShieldCheck, Clock, FileText, RefreshCw 
} from 'lucide-react';
import { translations, type LangType } from '../lib/locale';
import { API_URL } from '../lib/api';
import { jsPDF } from 'jspdf';
import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = '83774fad-8728-4a64-b274-316d4ca49910';

interface VoicePageProps {
  voiceLang: string;
  setVoiceLang: (v: string) => void;
  voiceLogs: any[];
  isTyping: boolean;
  isListening: boolean;
  voiceQuery: string;
  setVoiceQuery: (v: string) => void;
  speakText: (text: string) => void;
  onVoiceSend: (e: React.FormEvent) => void;
  onStartMockSpeech: () => void;
  onTriggerQuickVoice: (text: string) => void;
  lang: LangType;
}

const VoicePage: React.FC<VoicePageProps> = ({
  voiceLang,
  setVoiceLang,
  voiceLogs,
  isTyping,
  isListening: _isListening,
  voiceQuery,
  setVoiceQuery,
  speakText,
  onVoiceSend,
  onStartMockSpeech: _onStartMockSpeech,
  onTriggerQuickVoice: _onTriggerQuickVoice,
  lang,
}) => {
  const t = translations[lang];

  // Call Logs & Telephony Dashboard States
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [selectedCallIdx, setSelectedCallIdx] = useState<number | null>(null);
  const [incomingNumber, setIncomingNumber] = useState('+919876543210');
  const [simulating, setSimulating] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ContextHub Vapi States
  const [activeSubTab, setActiveSubTab] = useState<'contexthub' | 'logs'>('contexthub');
  const vapiRef = useRef<Vapi | null>(null);
  const [vapiConnected, setVapiConnected] = useState(false);
  const [vapiSpeaking, setVapiSpeaking] = useState(false);
  const [contextTranscript, setContextTranscript] = useState<{role: string; text: string}[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [outboundPhone, setOutboundPhone] = useState('');
  const [outboundStatus, setOutboundStatus] = useState('');
  const [farmerContext, setFarmerContext] = useState<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = () => {
    setLoadingLogs(true);
    fetch(`${API_URL}/voice/logs`)
      .then(res => res.json())
      .then(data => {
        setCallLogs(data);
        if (data.length > 0 && selectedCallIdx === null) {
          setSelectedCallIdx(0);
        }
      })
      .catch(e => console.error(e))
      .finally(() => setLoadingLogs(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSimulateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomingNumber.trim()) return;
    setSimulating(true);
    try {
      const res = await fetch(`${API_URL}/voice/incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: incomingNumber })
      });
      if (res.ok) {
        const newLog = await res.json();
        
        // Autoplay/speak recommendation
        speakText(newLog.ai_transcript);
        
        // Refresh logs list
        fetchLogs();
        setSelectedCallIdx(0);
      }
    } catch (err) {
      console.error('Call simulation failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contextTranscript]);

  // Start ContextHub browser voice call via Vapi
  const startContextHubCall = async () => {
    setContextLoading(true);
    setContextTranscript([]);
    setFarmerContext(null);

    // Fetch live farmer context from backend
    let ctx: any = {};
    try {
      const ctxRes = await fetch(`${API_URL}/voice/context?phone=${encodeURIComponent(incomingNumber)}`);
      ctx = await ctxRes.json();
      setFarmerContext(ctx);
    } catch (_e) {
      ctx = { systemPrompt: 'You are SAKHI, a friendly AI agricultural assistant.', farmerName: 'Farmer' };
    }

    try {
      const VapiClass = (Vapi as any).default || Vapi;
      const vapi = new VapiClass(VAPI_PUBLIC_KEY);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        setVapiConnected(true);
        setContextLoading(false);
        setContextTranscript(prev => [...prev, { role: 'system', text: '📞 ContextHub call connected. AI is listening...' }]);
      });

      vapi.on('call-end', () => {
        setVapiConnected(false);
        setVapiSpeaking(false);
        setContextTranscript(prev => [...prev, { role: 'system', text: '📴 Call ended.' }]);
      });

      vapi.on('speech-start', () => {
        setVapiSpeaking(true);
      });

      vapi.on('speech-end', () => {
        setVapiSpeaking(false);
      });

      vapi.on('message', (msg: any) => {
        if (msg.type === 'transcript' && msg.transcriptType === 'final') {
          setContextTranscript(prev => [...prev, { 
            role: msg.role === 'assistant' ? 'ai' : 'user', 
            text: msg.transcript 
          }]);
        }
      });

      vapi.on('error', (err: any) => {
        console.error('[Vapi Error]', err);
        setContextLoading(false);
        setContextTranscript(prev => [...prev, { role: 'system', text: `❌ Error: ${err?.message || 'Connection failed. Check your Vapi API key.'}` }]);
      });

      // Start with inline transient assistant
      await vapi.start({
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: ctx.systemPrompt }
          ]
        },
        voice: {
          provider: 'azure',
          voiceId: 'en-IN-NeerjaNeural'
        },
        firstMessage: `Namaskar ${ctx.farmerName || 'Farmer'}! I am SAKHI, your smart agriculture assistant. I have loaded your live farm data including soil sensors, weather forecast, and eligible government schemes. How can I help you today?`,
        name: 'SAKHI ContextHub'
      } as any);

    } catch (err: any) {
      console.error('[Vapi Start Error]', err);
      setContextLoading(false);
      setContextTranscript(prev => [...prev, { role: 'system', text: `❌ Failed to start: ${err.message}` }]);
    }
  };

  const stopContextHubCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    setVapiConnected(false);
    setVapiSpeaking(false);
  };

  // Outbound call: server calls farmer's phone
  const handleOutboundCall = async () => {
    if (!outboundPhone.trim()) return;
    setOutboundStatus('Initiating call...');
    try {
      const res = await fetch(`${API_URL}/voice/outbound-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: outboundPhone })
      });
      const data = await res.json();
      if (res.ok) {
        setOutboundStatus(`✅ Call initiated! ID: ${data.callId}`);
      } else {
        setOutboundStatus(`❌ Failed: ${data.error || data.details?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setOutboundStatus(`❌ ${err.message}`);
    }
  };
  const downloadCallAuditPDF = (log: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(30, 58, 138); // Deep Blue
    doc.rect(0, 0, 210, 35, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('SAKHI - TELEPHONY CALL AUDIT REPORT', 14, 15);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Automatic Voice AI Telemetry & Weather Index Logs', 14, 22);
    
    // Border
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(1);
    doc.rect(5, 5, 200, 287);
    
    // Call Metadata
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.text('1. Call Identification Logs', 14, 48);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Reference ID: ${log.id}`, 14, 56);
    doc.text(`Farmer Name: ${log.farmer_name || 'Guest'}`, 14, 62);
    doc.text(`Phone Number: ${log.phone_number}`, 14, 68);
    doc.text(`Timestamp: ${new Date(log.created_at).toLocaleString()}`, 120, 56);
    doc.text(`Call Duration: ${log.call_duration_seconds} sec`, 120, 62);
    doc.text(`Active Crop: ${log.crop_type || 'N/A'}`, 120, 68);
    
    // Telemetry
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 74, 196, 74);
    doc.setFont('Helvetica', 'bold');
    doc.text('2. IoT Telemetry Snapshot (At Time of Call)', 14, 83);
    
    doc.setFont('Helvetica', 'normal');
    const tel = log.telemetry_snapshot || {};
    doc.text(`Nitrogen (N): ${tel.nitrogen || 0} mg/kg`, 14, 91);
    doc.text(`Phosphorus (P): ${tel.phosphorus || 0} mg/kg`, 14, 97);
    doc.text(`Potassium (K): ${tel.potassium || 0} mg/kg`, 14, 103);
    doc.text(`Soil Moisture: ${tel.moisture || 0}%`, 14, 109);
    
    // Weather
    doc.line(14, 115, 196, 115);
    doc.setFont('Helvetica', 'bold');
    doc.text('3. Satellite Weather Forecast Snapshot', 14, 124);
    
    doc.setFont('Helvetica', 'normal');
    const w = log.weather_snapshot || {};
    doc.text(`Temperature: ${w.temp || 0}°C`, 14, 132);
    doc.text(`Precipitation sum: ${w.rain || 0} mm`, 14, 138);
    doc.text(`Wind Speed: ${w.wind || 0} km/h`, 14, 144);
    
    // Schemes
    doc.line(14, 150, 196, 150);
    doc.setFont('Helvetica', 'bold');
    doc.text('4. Auto-matched Schemes Eligibility', 14, 159);
    
    doc.setFont('Helvetica', 'normal');
    const schemes = Array.isArray(log.matched_schemes) ? log.matched_schemes : [];
    schemes.forEach((sc: any, idx: number) => {
      doc.text(`• ${sc.name}: ${sc.description}`, 14, 167 + (idx * 6));
    });
    
    // Transcript
    doc.line(14, 190, 196, 190);
    doc.setFont('Helvetica', 'bold');
    doc.text('5. AI Generated Spoken Recommendation Transcript', 14, 199);
    
    doc.setFont('Helvetica', 'normal');
    const splitTxt = doc.splitTextToSize(log.ai_transcript, 180);
    doc.text(splitTxt, 14, 207);
    
    // Verification Stamp
    doc.setDrawColor(5, 150, 105);
    doc.circle(165, 255, 12);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(5, 150, 105);
    doc.text('SAKHI', 160, 253);
    doc.text('VERIFIED', 156, 257);
    
    // Footer
    doc.line(14, 275, 196, 275);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Generated dynamically by SAKHI Voice Call Integration Engine', 14, 280);
    
    doc.save(`Call_Audit_${log.id.substring(0, 8)}.pdf`);
  };

  const selectedCall = selectedCallIdx !== null ? callLogs[selectedCallIdx] : null;

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid var(--border-gov)', paddingBottom: '6px' }}>
        {(['contexthub', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{
              padding: '6px 16px', fontSize: '0.78rem', fontWeight: activeSubTab === tab ? 800 : 600,
              background: activeSubTab === tab ? 'var(--primary-deep)' : 'transparent',
              color: activeSubTab === tab ? '#fff' : 'var(--text-muted)',
              border: 'none', borderRadius: '4px 4px 0 0', cursor: 'pointer'
            }}
          >
            {tab === 'contexthub' ? '🎙️ ContextHub AI Calling' : '📊 Call Logs Analytics'}
          </button>
        ))}
      </div>

      {/* ============ TAB 1: CONTEXTHUB ============ */}
      {activeSubTab === 'contexthub' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', flex: 1 }} className="grid-2-cols">
          
          {/* LEFT: Interactive Voice Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* ContextHub Call Panel */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-gov)', paddingBottom: '0.4rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={16} style={{ color: 'var(--primary-emerald)' }} />
                  SAKHI ContextHub
                </h3>
                <span style={{
                  fontSize: '0.62rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 700,
                  background: vapiConnected ? '#dcfce7' : '#f1f5f9',
                  color: vapiConnected ? '#16a34a' : '#94a3b8'
                }}>
                  {vapiConnected ? (vapiSpeaking ? '🔊 AI Speaking...' : '🎙️ Listening...') : '⏸ Idle'}
                </span>
              </div>

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                Talk to SAKHI in real-time. The AI knows your farm, soil sensors, weather, and eligible schemes. Just speak naturally!
              </p>

              {/* Live Transcript */}
              <div style={{ flex: 1, background: '#f8fafc', border: '1px solid var(--border-gov)', borderRadius: '6px', padding: '0.75rem', overflowY: 'auto', minHeight: '200px', maxHeight: '320px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {contextTranscript.length === 0 && !contextLoading && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <Mic size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ fontSize: '0.72rem' }}>Click "Start ContextHub Call" below to begin an interactive AI voice session.</p>
                  </div>
                )}
                {contextLoading && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--primary-emerald)', fontSize: '0.75rem', fontWeight: 700 }}>
                    <Activity size={16} className="telemetry-pulse" /> Connecting to SAKHI AI...
                  </div>
                )}
                {contextTranscript.map((msg, idx) => (
                  <div key={idx} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.role === 'user' ? 'var(--primary-mint)' : msg.role === 'system' ? '#fef3c7' : '#ffffff',
                    border: '1px solid ' + (msg.role === 'user' ? 'rgba(21,128,61,0.2)' : msg.role === 'system' ? '#fde68a' : 'var(--border-gov)'),
                    padding: '6px 10px', borderRadius: '6px', maxWidth: '85%', fontSize: '0.75rem'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                      {msg.role === 'user' ? '🧑 You' : msg.role === 'system' ? '⚙️ System' : '🤖 SAKHI AI'}
                    </span>
                    {msg.text}
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>

              {/* Call Controls */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {!vapiConnected ? (
                  <button 
                    onClick={startContextHubCall}
                    disabled={contextLoading}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Mic size={14} />
                    {contextLoading ? 'Connecting...' : 'Start ContextHub Call'}
                  </button>
                ) : (
                  <button 
                    onClick={stopContextHubCall}
                    style={{ flex: 1, padding: '8px', fontSize: '0.78rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <MicOff size={14} />
                    End Call
                  </button>
                )}
              </div>
            </div>

            {/* Outbound: Server calls farmer's mobile */}
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 800, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PhoneCall size={14} style={{ color: 'var(--tech-blue)' }} />
                Call Farmer's Mobile (Outbound)
              </h4>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                SAKHI server will call the farmer's phone directly. The AI will greet them by name with live field data.
              </p>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input 
                  type="text" value={outboundPhone}
                  onChange={(e) => setOutboundPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{ flex: 1, padding: '0.35rem', fontSize: '0.72rem' }}
                />
                <button onClick={handleOutboundCall} className="btn btn-primary" style={{ fontSize: '0.68rem', padding: '4px 10px' }}>
                  <Phone size={12} /> Call Now
                </button>
              </div>
              {outboundStatus && (
                <p style={{ fontSize: '0.65rem', marginTop: '6px', color: outboundStatus.includes('✅') ? 'var(--primary-emerald)' : outboundStatus.includes('❌') ? '#ef4444' : 'var(--text-muted)' }}>
                  {outboundStatus}
                </p>
              )}
            </div>
          </div>

          {/* RIGHT: Live Context Data Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Activity size={16} style={{ color: 'var(--primary-emerald)' }} />
                Live Farm Context (Loaded at Call Start)
              </h3>

              {farmerContext ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="animate-fade-up">
                  
                  {/* Identity */}
                  <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>🧑‍🌾 {farmerContext.farmerName}</strong>
                      <span style={{ fontSize: '0.62rem', background: 'var(--primary-deep)', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        {farmerContext.crop}
                      </span>
                    </div>
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Farm: <strong>{farmerContext.farmName}</strong>
                    </span>
                    <span style={{ display: 'block', color: 'var(--tech-blue)', fontSize: '0.65rem', fontWeight: 700, marginTop: '2px' }}>
                      📍 Coordinates: {farmerContext.lat?.toFixed(5) || '23.52040'}, {farmerContext.lng?.toFixed(5) || '77.81890'}
                    </span>
                  </div>

                  {/* Telemetry */}
                  <div>
                    <h5 style={{ fontSize: '0.68rem', fontWeight: 800, margin: '0 0 4px 0' }}>🌱 IoT Soil Telemetry</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.68rem' }}>
                      {[
                        { label: 'Moisture', val: `${farmerContext.telemetry.moisture}%`, bg: '#f0fdf4', border: '#bbf7d0' },
                        { label: 'N', val: `${farmerContext.telemetry.nitrogen} mg`, bg: '#fff', border: 'var(--border-gov)' },
                        { label: 'P', val: `${farmerContext.telemetry.phosphorus} mg`, bg: '#fff', border: 'var(--border-gov)' },
                        { label: 'K', val: `${farmerContext.telemetry.potassium} mg`, bg: '#fff', border: 'var(--border-gov)' },
                      ].map((item, i) => (
                        <div key={i} style={{ background: item.bg, border: `1px solid ${item.border}`, padding: '4px', borderRadius: '4px' }}>
                          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.55rem' }}>{item.label}</span>
                          <strong>{item.val}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weather */}
                  <div>
                    <h5 style={{ fontSize: '0.68rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CloudRain size={12} style={{ color: 'var(--tech-blue)' }} /> Satellite Weather
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.68rem' }}>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px', borderRadius: '4px' }}>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.55rem' }}>Temp</span>
                        <strong>{farmerContext.weather.temp}°C</strong>
                      </div>
                      <div style={{ background: '#fff', border: '1px solid var(--border-gov)', padding: '4px', borderRadius: '4px' }}>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.55rem' }}>Rain</span>
                        <strong>{farmerContext.weather.rain} mm</strong>
                      </div>
                      <div style={{ background: '#fff', border: '1px solid var(--border-gov)', padding: '4px', borderRadius: '4px' }}>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.55rem' }}>Wind</span>
                        <strong>{farmerContext.weather.wind} km/h</strong>
                      </div>
                    </div>
                  </div>

                  {/* Pathogen & Climate Risk Indices */}
                  {farmerContext.risk && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '8px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <h5 style={{ fontSize: '0.68rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                          ⚠️ Crop Pathology Risk Analysis
                        </h5>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                          Overall: {farmerContext.risk.overallRisk}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.62rem' }}>
                        {[
                          { label: 'Fungal Leaf Spot Risk', val: farmerContext.risk.fungalRisk, color: '#ef4444' },
                          { label: 'Root Rot Index', val: farmerContext.risk.rootRotRisk, color: '#f59e0b' },
                          { label: 'Pest Attack Vulnerability', val: farmerContext.risk.pestRisk, color: '#3b82f6' }
                        ].map((rk, idx) => (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontWeight: 600 }}>
                              <span>{rk.label}</span>
                              <span>{rk.val}%</span>
                            </div>
                            <div style={{ background: '#e2e8f0', borderRadius: '10px', height: '5px', overflow: 'hidden' }}>
                              <div style={{ background: rk.color, width: `${rk.val}%`, height: '100%', borderRadius: '10px' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schemes */}
                  <div>
                    <h5 style={{ fontSize: '0.68rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={12} style={{ color: 'var(--primary-emerald)' }} /> Suggested Schemes & Benefits
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {farmerContext.schemes.map((sc: string, i: number) => (
                        <div key={i} style={{ fontSize: '0.65rem', padding: '4px 8px', background: '#f8fafc', border: '1px solid var(--border-gov)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: 'var(--primary-emerald)' }}>●</span>
                          {sc}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alternative Crops Suggestions */}
                  {farmerContext.altCrops && (
                    <div>
                      <h5 style={{ fontSize: '0.68rem', fontWeight: 800, margin: '0 0 4px 0' }}>🔄 Recommended Crop Rotations</h5>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {farmerContext.altCrops.map((cr: string, i: number) => (
                          <span key={i} style={{ fontSize: '0.62rem', background: '#eff6ff', color: 'var(--tech-blue)', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                            {cr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Agronomic Advisor tips */}
                  {farmerContext.advisoryTips && (
                    <div>
                      <h5 style={{ fontSize: '0.68rem', fontWeight: 800, margin: '0 0 4px 0' }}>💡 General Agronomic Advisories</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                        {farmerContext.advisoryTips.map((tip: string, i: number) => (
                          <div key={i} style={{ fontSize: '0.62rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '4px 8px', borderRadius: '4px', lineHeight: '1.3' }}>
                            {tip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Satellite & Active meteorological APIs ledger */}
                  <div>
                    <h5 style={{ fontSize: '0.68rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--primary-deep)' }}>
                      📡 Active Meteorological & Satellite APIs
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '3px', fontSize: '0.58rem', fontFamily: 'monospace', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                      <div>
                        <strong style={{ color: 'var(--primary-emerald)' }}>[GET] WEATHER FORECAST:</strong>
                        <span style={{ display: 'block', color: 'var(--text-muted)' }}>
                          https://api.open-meteo.com/v1/forecast?latitude={farmerContext.lat?.toFixed(4)}&longitude={farmerContext.lng?.toFixed(4)}&current=temperature_2m,precipitation,wind_speed_10m
                        </span>
                      </div>
                      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '3px', marginTop: '3px' }}>
                        <strong style={{ color: 'var(--tech-blue)' }}>[GET] IoT SOIL SENSORS:</strong>
                        <span style={{ display: 'block', color: 'var(--text-muted)' }}>
                          {API_URL}/telemetry?phone={incomingNumber}
                        </span>
                      </div>
                      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '3px', marginTop: '3px' }}>
                        <strong style={{ color: '#6366f1' }}>[POST] VAPI OUTBOUND TRUNK:</strong>
                        <span style={{ display: 'block', color: 'var(--text-muted)' }}>
                          https://api.vapi.ai/call
                        </span>
                      </div>
                      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '3px', marginTop: '3px' }}>
                        <strong style={{ color: '#e11d48' }}>[POST] VAPI WEB CALL STREAM:</strong>
                        <span style={{ display: 'block', color: 'var(--text-muted)' }}>
                          https://api.vapi.ai/call/web
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', color: 'var(--text-muted)' }}>
                  <Clock size={28} style={{ opacity: 0.3, marginBottom: '6px' }} />
                  <span style={{ fontSize: '0.72rem' }}>Start a ContextHub call to load live farm data</span>
                </div>
              )}
            </div>

            {/* Existing chat AI */}
            <div className="glass-panel" style={{ padding: '0.75rem', maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                <Volume2 size={12} /> {t.voiceTitle}
                <select value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)} style={{ marginLeft: 'auto', padding: '1px 4px', fontSize: '0.65rem', borderRadius: '4px' }}>
                  <option value="en-IN">EN</option>
                  <option value="hi-IN">हि</option>
                  <option value="mr-IN">म</option>
                </select>
              </h4>
              <div style={{ flex: 1, background: '#f8fafc', border: '1px solid var(--border-gov)', borderRadius: '4px', padding: '0.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {voiceLogs.slice(-4).map((log, idx) => (
                  <div key={idx} style={{ alignSelf: log.sender === 'user' ? 'flex-end' : 'flex-start', background: log.sender === 'user' ? 'var(--primary-mint)' : '#fff', border: '1px solid var(--border-gov)', padding: '4px 8px', borderRadius: '4px', maxWidth: '85%', fontSize: '0.68rem' }}>
                    {voiceLang === 'hi-IN' && log.textHi ? log.textHi : voiceLang === 'mr-IN' && log.textMr ? log.textMr : log.text}
                  </div>
                ))}
                {isTyping && <span style={{ fontSize: '0.65rem', color: 'var(--primary-emerald)', fontWeight: 700 }}>AI computing...</span>}
              </div>
              <form onSubmit={onVoiceSend} style={{ display: 'flex', gap: '4px' }}>
                <input type="text" value={voiceQuery} onChange={(e) => setVoiceQuery(e.target.value)} placeholder={t.voicePlaceholder} style={{ flex: 1, padding: '0.3rem 0.4rem', fontSize: '0.68rem' }} />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem' }}><Send size={10} /></button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB 2: CALL LOGS ============ */}
      {activeSubTab === 'logs' && (
        <div className="glass-panel" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Activity size={16} style={{ color: 'var(--primary-emerald)' }} /> Telephony Call Logs & Telemetry Snapshots
            </h3>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <form onSubmit={handleSimulateCall} style={{ display: 'flex', gap: '4px' }}>
                <input type="text" value={incomingNumber} onChange={(e) => setIncomingNumber(e.target.value)} placeholder="+91..." style={{ padding: '3px 6px', fontSize: '0.68rem', width: '140px' }} />
                <button type="submit" disabled={simulating} className="btn btn-primary" style={{ fontSize: '0.62rem', padding: '3px 8px' }}>
                  <PhoneCall size={10} /> {simulating ? '...' : 'Simulate'}
                </button>
              </form>
              <button onClick={fetchLogs} disabled={loadingLogs} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem' }}>
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', flex: 1, overflow: 'hidden' }} className="grid-sub-cols">
            {/* Logs List */}
            <div style={{ borderRight: '1px solid var(--border-gov)', paddingRight: '0.75rem', overflowY: 'auto', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {callLogs.map((log, idx) => (
                <div key={log.id} onClick={() => setSelectedCallIdx(idx)} style={{ padding: '6px', borderRadius: '4px', background: selectedCallIdx === idx ? '#f1f5f9' : 'transparent', border: '1px solid ' + (selectedCallIdx === idx ? 'var(--tech-blue)' : '#f1f5f9'), cursor: 'pointer', fontSize: '0.68rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>{log.farmer_name || 'Guest'}</span>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{log.call_duration_seconds}s</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{log.phone_number}</span>
                    <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
              {callLogs.length === 0 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>No calls logged.</span>}
            </div>

            {/* Selected call details */}
            <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
              {selectedCall ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className="animate-fade-up">
                  <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-gov)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.78rem' }}>{selectedCall.farmer_name}</strong>
                      <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)' }}>📞 {selectedCall.phone_number} • {selectedCall.farm_name} ({selectedCall.crop_type})</span>
                    </div>
                    <button onClick={() => downloadCallAuditPDF(selectedCall)} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <FileText size={10} /> Audit PDF
                    </button>
                  </div>
                  
                  {/* Telemetry */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.66rem' }}>
                    {['moisture', 'nitrogen', 'phosphorus', 'potassium'].map(k => (
                      <div key={k} style={{ background: '#f8fafc', border: '1px solid var(--border-gov)', padding: '3px', borderRadius: '4px' }}>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.56rem' }}>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                        <strong>{selectedCall.telemetry_snapshot?.[k]}{k === 'moisture' ? '%' : ''}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Weather */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.66rem' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px', borderRadius: '4px' }}>
                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.56rem' }}>Temp</span>
                      <strong>{selectedCall.weather_snapshot?.temp}°C</strong>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid var(--border-gov)', padding: '3px', borderRadius: '4px' }}>
                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.56rem' }}>Rain</span>
                      <strong>{selectedCall.weather_snapshot?.rain} mm</strong>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid var(--border-gov)', padding: '3px', borderRadius: '4px' }}>
                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.56rem' }}>Wind</span>
                      <strong>{selectedCall.weather_snapshot?.wind} km/h</strong>
                    </div>
                  </div>

                  {/* Transcript */}
                  <div style={{ border: '1px solid var(--border-gov)', padding: '6px', borderRadius: '4px', fontSize: '0.68rem', lineHeight: '1.4' }}>
                    <strong style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>AI Transcript:</strong>
                    <p style={{ margin: '4px 0 0 0' }}>{selectedCall.ai_transcript}</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  <Clock size={24} style={{ opacity: 0.3 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoicePage;