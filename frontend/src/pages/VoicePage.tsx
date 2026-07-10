import React from 'react';
import { Volume2, Droplet, TrendingUp, Send } from 'lucide-react';
import { translations, type LangType } from '../lib/locale';

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
  isListening,
  voiceQuery,
  setVoiceQuery,
  speakText,
  onVoiceSend,
  onStartMockSpeech,
  onTriggerQuickVoice,
  lang,
}) => {
  const t = translations[lang];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '650px', minHeight: '500px' }} className="animate-fade-up">
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflow: 'hidden' }}>

        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-gov)', paddingBottom: '0.5rem', flexShrink: 0 }}>
          <h3 style={{ fontSize: '0.98rem', color: 'var(--primary-deep)', fontWeight: 800 }}>{t.voiceTitle}</h3>
          <div>
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value)}
              style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem' }}
            >
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
              <option value="mr-IN">मराठी (Marathi)</option>
              <option value="te-IN">తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>

        {/* Conversational list (Scrollable) */}
        <div style={{ flex: 1, background: '#f8fafc', border: '1px solid var(--border-gov)', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {voiceLogs.map((log, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: log.sender === 'user' ? 'flex-end' : 'flex-start',
                background: log.sender === 'user' ? 'var(--primary-mint)' : '#ffffff',
                border: log.sender === 'user' ? '1px solid rgba(21, 128, 61, 0.2)' : '1px solid var(--border-gov)',
                color: 'var(--text-dark)',
                padding: '8px 12px',
                borderRadius: '6px',
                maxWidth: '85%',
                fontSize: '0.82rem',
              }}
            >
              <p>{voiceLang === 'hi-IN' && log.textHi ? log.textHi : voiceLang === 'mr-IN' && log.textMr ? log.textMr : log.text}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '12px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{log.time}</span>
                {log.sender === 'ai' && (
                  <button
                    onClick={() => speakText(voiceLang === 'hi-IN' && log.textHi ? log.textHi : voiceLang === 'mr-IN' && log.textMr ? log.textMr : log.text)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-emerald)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold', fontSize: '0.7rem' }}
                  >
                    <Volume2 size={12} /> Listen
                  </button>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ alignSelf: 'flex-start', color: 'var(--primary-emerald)', fontSize: '0.75rem', fontWeight: 'bold' }}>AI computing advice...</div>
          )}
        </div>

        {/* Microphone controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={onStartMockSpeech}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: isListening ? 'var(--danger)' : 'var(--primary-deep)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Volume2 size={22} />
          </button>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {isListening ? t.voiceListening : 'Tap micro-button to speak'}
          </span>
        </div>

        {/* Action prompts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={() => onTriggerQuickVoice(voiceLang === 'hi-IN' ? 'क्या मेरी फसल में तनाव है?' : voiceLang === 'mr-IN' ? 'माझ्या पिकाला पाणी पाहिजे का?' : 'Check crop stress')}
            className="btn btn-secondary"
            style={{ padding: '6px', justifyContent: 'center', fontSize: '0.78rem' }}
          >
            <Droplet size={14} style={{ color: 'var(--tech-blue)' }} />
            <span>{voiceLang === 'hi-IN' ? 'पानी जांचें' : voiceLang === 'mr-IN' ? 'पाणी तपासा' : 'Check Soil Water'}</span>
          </button>
          <button
            onClick={() => onTriggerQuickVoice(voiceLang === 'hi-IN' ? 'सोयाबीन का बाजार भाव क्या है?' : voiceLang === 'mr-IN' ? 'सोयाबीन बाजार दर सांगा' : 'Check soybean price')}
            className="btn btn-secondary"
            style={{ padding: '6px', justifyContent: 'center', fontSize: '0.78rem' }}
          >
            <TrendingUp size={14} style={{ color: 'var(--accent-orange)' }} />
            <span>{voiceLang === 'hi-IN' ? 'फसल भाव' : voiceLang === 'mr-IN' ? 'पिकाचे दर' : 'Market Rates'}</span>
          </button>
        </div>

        {/* Text Form */}
        <form onSubmit={onVoiceSend} style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <input
            type="text"
            value={voiceQuery}
            onChange={(e) => setVoiceQuery(e.target.value)}
            placeholder={t.voicePlaceholder}
            style={{ flex: 1, padding: '0.4rem 0.6rem' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}>
            <Send size={15} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default VoicePage;
