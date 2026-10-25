import React, { useState } from 'react';
import { Palette, Volume2, Key, Eye, EyeOff } from 'lucide-react';
import { playTick } from '../utils/audio';

export default function Settings({
  theme,
  setTheme,
  groqKey,
  setGroqKey,
  groqModel,
  setGroqModel,
  voiceRate,
  setVoiceRate,
  voicePitch,
  setVoicePitch,
  selectedVoice,
  setSelectedVoice,
  voices,
  isOfflineMode,
  handsFree,
  setHandsFree
}) {
  const [showKey, setShowKey] = useState(false);

  const fieldLabelStyle = {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    fontWeight: 500
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.78rem',
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    outline: 'none'
  };

  return (
    <div className="hud-panel settings-panel">
      <div className="hud-title">
        <span>Settings</span>
        <span className="hud-mono-val" style={{ fontSize: '0.65rem', color: isOfflineMode ? 'var(--text-faint)' : 'var(--accent)' }}>
          {isOfflineMode ? 'offline' : 'connected'}
        </span>
      </div>

      <div className="settings-fields" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>

        {/* Theme */}
        <div>
          <label style={fieldLabelStyle}>
            <Palette size={12} /> Theme
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {[
              { id: 'cyan', label: 'Cyan', color: '#5b8cff' },
              { id: 'red', label: 'Alert', color: '#f0465c' },
              { id: 'gold', label: 'Gold', color: '#e8a33d' },
              { id: 'green', label: 'Stealth', color: '#34d399' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="btn-hud"
                style={{
                  borderColor: theme === t.id ? t.color : 'var(--border)',
                  background: theme === t.id ? `${t.color}1a` : 'var(--surface-2)',
                  color: theme === t.id ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: '0.64rem',
                  padding: '7px 2px',
                  flexDirection: 'column',
                  gap: '5px'
                }}
              >
                <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: t.color }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Groq API Key */}
        <div>
          <label style={fieldLabelStyle}>
            <Key size={12} /> Groq API key
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showKey ? "text" : "password"}
              placeholder="Paste your key…"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              onFocus={playTick}
              style={{ ...inputStyle, paddingRight: '36px' }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex' }}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-faint)', marginTop: '6px', display: 'block', lineHeight: '1.4' }}>
            Stored for this session only. Leave blank to run offline.
          </span>
        </div>

        {/* Model */}
        <div>
          <label style={fieldLabelStyle}>Model</label>
          <select
            value={groqModel}
            onChange={(e) => { playTick(); setGroqModel(e.target.value); }}
            onFocus={playTick}
            style={{ ...inputStyle, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}
          >
            <option value="openai/gpt-oss-20b">GPT-OSS 20B — fastest</option>
            <option value="openai/gpt-oss-120b">GPT-OSS 120B — smarter</option>
            <option value="qwen/qwen3.6-27b">Qwen 3.6 27B — best reasoning</option>
          </select>
        </div>

        {/* Hands-Free toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text)' }}>Hands-free</span>
            <span style={{ fontSize: '0.64rem', color: 'var(--text-faint)' }}>Keep listening continuously</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={handsFree}
            onClick={() => setHandsFree(!handsFree)}
            style={{
              width: '38px',
              height: '22px',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              background: handsFree ? 'var(--accent)' : 'var(--surface)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background .2s var(--ease)',
              flexShrink: 0
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: handsFree ? '18px' : '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left .2s var(--ease)'
              }}
            />
          </button>
        </div>

        {/* Voice */}
        <div>
          <label style={fieldLabelStyle}>
            <Volume2 size={12} /> Voice
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select
              value={selectedVoice ? selectedVoice.name : ''}
              onChange={(e) => {
                playTick();
                const found = voices.find(v => v.name === e.target.value);
                if (found) setSelectedVoice(found);
              }}
              onFocus={playTick}
              style={{ ...inputStyle, fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}
            >
              {voices.length === 0 ? (
                <option value="">No voices found</option>
              ) : (
                voices.map((v, i) => (
                  <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                ))
              )}
            </select>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>Speed</span>
                <span className="hud-mono-val">{voiceRate}×</span>
              </div>
              <input
                type="range" min="0.5" max="2.0" step="0.1"
                value={voiceRate}
                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                onInput={playTick}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>Pitch</span>
                <span className="hud-mono-val">{voicePitch}×</span>
              </div>
              <input
                type="range" min="0.5" max="1.5" step="0.1"
                value={voicePitch}
                onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                onInput={playTick}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
