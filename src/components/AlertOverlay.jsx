import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { startAlarm, stopAlarm, playSuccess, playWarning } from '../utils/audio';

export default function AlertOverlay({ activeMode, onAbort, prefersReducedMotion }) {
  const [countdown, setCountdown] = useState(10);
  const [isTerminated, setIsTerminated] = useState(false);

  // Reset state when mode changes
  useEffect(() => {
    if (activeMode !== 'self_destruct') {
      setTimeout(() => {
        setCountdown(10);
        setIsTerminated(false);
      }, 0);
    }
  }, [activeMode]);

  // Handle self-destruct countdown
  useEffect(() => {
    if (activeMode !== 'self_destruct') return;

    playWarning();
    startAlarm();

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          stopAlarm();
          setIsTerminated(true);
          return 0;
        }
        playWarning();
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      stopAlarm();
    };
  }, [activeMode]);

  if (!activeMode) return null;

  if (isTerminated) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: '#020202',
          color: 'var(--danger)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          fontFamily: 'var(--font-mono)',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <div style={{
          fontSize: '2.5rem',
          fontWeight: '900',
          letterSpacing: '0.15em',
          textShadow: '0 0 15px #ff3e3e',
          animation: prefersReducedMotion ? 'none' : 'text-flicker 0.15s infinite',
          marginBottom: '15px'
        }}>
          SYSTEM OFFLINE
        </div>
        <div style={{ fontSize: '0.85rem', opacity: 0.7, letterSpacing: '0.1em', marginBottom: '24px', maxWidth: '500px', lineHeight: '1.4' }}>
          STARK ENTERPRISE CORE DISCONNECTED. SECURITY ENVELOPE SEVERED. REBOOT CORE TO RESTORE.
        </div>
        <button
          type="button"
          onClick={() => {
            playSuccess();
            setIsTerminated(false);
            onAbort();
          }}
          className="btn-hud"
          style={{ borderColor: 'var(--danger)', color: '#ff3e3e', fontSize: '0.9rem', padding: '10px 20px' }}
        >
          REBOOT CORE COGNITION
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(15, 4, 4, 0.93)',
        border: '6px solid var(--danger)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: prefersReducedMotion ? 'none' : 'pulse-ring 2s ease-in-out infinite',
        fontFamily: 'var(--font-orbitron)',
        gap: '16px'
      }}
    >
      <ShieldAlert size={64} style={{ color: 'var(--danger)', filter: 'drop-shadow(0 0 15px var(--danger))' }} />
      
      {activeMode === 'self_destruct' ? (
        <>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)', letterSpacing: '0.08em', textAlign: 'center', textShadow: '0 0 8px rgba(255, 62, 62, 0.5)' }}>
            CRITICAL DESTRUCTION PROTOCOL
          </div>
          <div
            style={{
              fontSize: '5rem',
              fontWeight: '900',
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              textShadow: '0 0 20px var(--danger)',
              margin: '10px 0'
            }}
          >
            T-MINUS {countdown}
          </div>
          <button
            type="button"
            onClick={() => {
              playSuccess();
              onAbort();
            }}
            className="btn-hud"
            style={{
              borderColor: '#fff',
              color: '#fff',
              fontSize: '1rem',
              padding: '14px 28px',
              backgroundColor: 'var(--danger)',
              boxShadow: '0 0 15px var(--danger)'
            }}
          >
            ABORT DESTRUCT SEQUENCE
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)', letterSpacing: '0.08em', textAlign: 'center', textShadow: '0 0 8px rgba(255, 62, 62, 0.5)' }}>
            RED ALERT ENFORCED
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', opacity: 0.8, textAlign: 'center', maxWidth: '400px', lineHeight: '1.4', fontFamily: 'var(--font-mono)', padding: '0 20px' }}>
            COGNITIVE SAFETY BUFFER INTRUDED. SECURING STARK MAINFRAME ENCRYPTION MATRICES.
          </div>
          <button
            type="button"
            onClick={() => {
              playSuccess();
              onAbort();
            }}
            className="btn-hud"
            style={{
              borderColor: 'var(--danger)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              padding: '8px 16px',
              marginTop: '8px'
            }}
          >
            DISMISS SECURITY ALARM
          </button>
        </>
      )}
    </div>
  );
}
