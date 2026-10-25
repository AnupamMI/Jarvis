import React, { useMemo } from 'react';
import { Mic } from 'lucide-react';
import JarvisBlob from './JarvisBlob';

// One color triple per theme — deep / mid / highlight — fed straight
// into the shader as hex strings, no CSS-var read needed.
const BLOB_THEME = {
  cyan: { colorA: '#03140f', colorB: '#0c8f59', colorC: '#c8ffe2' },
  red: { colorA: '#5c0f1a', colorB: '#f0465c', colorC: '#ffd0d6' },
  gold: { colorA: '#5c3c0a', colorB: '#e8a33d', colorC: '#ffe3b0' },
  green: { colorA: '#063d29', colorB: '#34d399', colorC: '#c8ffe9' },
};
const ALERT_COLORS = { colorA: '#5c0f1a', colorB: '#ff2d47', colorC: '#ffb3bd' };

export default function ArcReactor({ state, volume = 0, onClickMic, micSupported, micError, prefersReducedMotion, theme = 'cyan' }) {
  // state: 'idle' | 'listening' | 'speaking' | 'alert'

  const stateLabel = {
    idle: 'Idle',
    listening: 'Listening',
    speaking: 'Speaking',
    alert: 'Alert'
  }[state] || 'Idle';

  const colors = state === 'alert' ? ALERT_COLORS : (BLOB_THEME[theme] || BLOB_THEME.cyan);

  // Drives how agitated the blob surface looks — quiet at idle,
  // reactive to mic level while listening, gently pulsing while speaking.
  const intensity = useMemo(() => {
    if (state === 'listening') return Math.min(volume / 45, 1.6);
    if (state === 'speaking') return 0.85;
    if (state === 'alert') return 1.4;
    return 0.3;
  }, [state, volume]);

  return (
    <div className="hud-panel reactor-panel" style={{ minHeight: '760px' }}>
      <div className="hud-title" style={{ width: '100%' }}>
        <span>Voice core</span>
        <span className="hud-mono-val" style={{ color: state === 'alert' ? 'var(--danger)' : 'var(--accent)' }}>
          {stateLabel}
        </span>
      </div>

      {/* Everything below is centered as ONE group, so the blob and the
          controls stay visually tied together no matter how tall the
          panel ends up being next to the side columns. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px' }}>

        <div className={`reactor-stage reactor-stage-${state}`} style={{ position: 'relative', width: 'min(100%, 620px)', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* faint ambient ring behind the blob */}
          <div className="reactor-ring reactor-ring-outer" style={{ animation: prefersReducedMotion ? 'none' : 'spin-clockwise 70s linear infinite' }} />
          <div className="reactor-ring reactor-ring-inner" style={{ animation: prefersReducedMotion ? 'none' : 'spin-counter 28s linear infinite' }} />
          <div className="reactor-crosshair" />
          <JarvisBlob intensity={intensity} colorA={colors.colorA} colorB={colors.colorB} colorC={colors.colorC} className="jarvis-blob-canvas" />
        </div>

        {state !== 'idle' && (
          <div className={`reactor-readout reactor-readout-${state}`} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-faint)',
            textAlign: 'center'
          }}>
            {state === 'listening' && `${Math.floor(volume)} dB`}
            {state === 'speaking' && 'responding'}
            {state === 'alert' && 'locked'}
          </div>
        )}

        <div className="reactor-controls" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <button
            aria-label={state === 'listening' ? 'Stop listening' : 'Start listening'}
            onClick={onClickMic}
            disabled={!micSupported}
            className="btn-hud reactor-mic-button"
            style={{
              borderColor: state === 'listening' ? 'var(--accent-line)' : 'var(--border)',
              color: state === 'listening' ? 'var(--accent)' : 'var(--text)',
              background: state === 'listening' ? 'var(--accent-soft)' : 'var(--surface-2)',
              padding: '10px 22px',
              fontSize: '0.78rem',
              width: 'min(100%, 260px)',
              maxWidth: '260px',
              borderRadius: 'var(--radius-md)'
            }}
          >
            {state === 'listening' ? (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: prefersReducedMotion ? 'none' : 'pulse-soft 1.2s ease-in-out infinite' }} />
                <span>Listening…</span>
              </>
            ) : (
              <>
                <Mic size={13} />
                <span>Start listening</span>
              </>
            )}
          </button>

          {!micSupported && (
            <span style={{ color: 'var(--danger)', fontSize: '0.68rem', marginTop: '8px', textAlign: 'center' }}>
              Speech input isn't supported in this browser
            </span>
          )}
          {micSupported && micError && (
            <span style={{ color: 'var(--danger)', fontSize: '0.68rem', marginTop: '8px', textAlign: 'center' }}>
              Mic error: {micError}
            </span>
          )}
          {micSupported && !micError && state !== 'listening' && (
            <span className="reactor-hint" style={{ color: 'var(--text-faint)', fontSize: '0.68rem', marginTop: '8px', textAlign: 'center' }}>
              Click, or press space, to talk
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
