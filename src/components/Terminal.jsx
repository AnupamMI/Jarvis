import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Send, ShieldAlert, RotateCw } from 'lucide-react';
import { playTick, playChirp } from '../utils/audio';

export default function Terminal({ logs, onSendCommand, isOfflineMode }) {
  const [input, setInput] = useState('');
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    playChirp();
    onSendCommand(input.trim());
    setInput('');
  };

  const typeColor = (type) => {
    switch (type) {
      case 'error': return 'var(--danger)';
      case 'success': return 'var(--success)';
      case 'warning': return 'var(--warning)';
      case 'user': return 'var(--accent)';
      default: return 'var(--border-strong)';
    }
  };

  return (
    <div className="hud-panel">
      <div className="hud-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <TerminalIcon size={13} /> Activity log
        </span>
        <span className="hud-mono-val" style={{ fontSize: '0.65rem', color: isOfflineMode ? 'var(--text-faint)' : 'var(--accent)' }}>
          {isOfflineMode ? 'local' : 'groq'}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.18)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          lineHeight: '1.5',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          marginBottom: '10px',
          minHeight: '120px'
        }}
      >
        {logs.map((log, idx) => (
          <div
            key={idx}
            style={{
              color: log.type === 'jarvis' ? 'var(--text)' : 'var(--text-muted)',
              borderLeft: `2px solid ${typeColor(log.type)}`,
              paddingLeft: '8px',
              padding: '3px 0 3px 8px',
              wordBreak: 'break-word'
            }}
          >
            <span style={{ color: 'var(--text-faint)', marginRight: '8px' }}>{log.timestamp}</span>
            {log.text}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={playTick}
          placeholder="Type a command or directive…"
          style={{
            flex: 1,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            outline: 'none'
          }}
        />
        <button type="submit" className="btn-hud" style={{ padding: '9px 14px' }}>
          <Send size={13} />
        </button>
      </form>

      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => onSendCommand('diagnostics')} className="btn-hud" style={{ fontSize: '0.66rem', padding: '5px 10px' }}>
          <RotateCw size={11} /> Diagnostics
        </button>
        <button type="button" onClick={() => onSendCommand('help')} className="btn-hud" style={{ fontSize: '0.66rem', padding: '5px 10px' }}>
          Help
        </button>
        <button type="button" onClick={() => onSendCommand('clear')} className="btn-hud" style={{ fontSize: '0.66rem', padding: '5px 10px' }}>
          Clear log
        </button>
        <button
          type="button"
          onClick={() => onSendCommand('red alert')}
          className="btn-hud"
          style={{ fontSize: '0.66rem', padding: '5px 10px', color: 'var(--danger)', borderColor: 'rgba(240,70,92,0.3)' }}
        >
          <ShieldAlert size={11} /> Alarm
        </button>
      </div>
    </div>
  );
}
