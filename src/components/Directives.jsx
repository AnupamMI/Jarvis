import React, { useState } from 'react';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import { playTick, playChirp } from '../utils/audio';

export default function Directives() {
  const [directives, setDirectives] = useState([
    { id: 1, text: "CALIBRATE MARK LXXXV THRUSTERS", completed: true },
    { id: 2, text: "OVERHAUL HOME TERMINAL INTEGRITY", completed: false },
    { id: 3, text: "ANALYZING REACTOR SIGNALS", completed: false },
    { id: 4, text: "REFRESH MANSION CORE THERMAL SYSTEM", completed: true }
  ]);
  const [input, setInput] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    playChirp();
    setDirectives(prev => [
      ...prev,
      { id: Date.now(), text: input.trim().toUpperCase(), completed: false }
    ]);
    setInput('');
  };

  const handleToggle = (id) => {
    playTick();
    setDirectives(prev =>
      prev.map(d => d.id === id ? { ...d, completed: !d.completed } : d)
    );
  };

  const handleDelete = (id) => {
    playChirp();
    setDirectives(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="hud-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="hud-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ClipboardList size={12} /> Active Directives
        </span>
        <span className="hud-mono-val" style={{ fontSize: '0.6rem' }}>ACTIVE_SET</span>
      </div>

      {/* Task List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '2px', minHeight: '120px' }}>
        {directives.map(d => (
          <div
            key={d.id}
            onClick={() => handleToggle(d.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: d.completed ? 'rgba(0, 240, 255, 0.02)' : 'rgba(0, 0, 0, 0.25)',
              border: d.completed ? '1px dashed var(--neon-dim)' : '1px solid rgba(255, 255, 255, 0.05)',
              padding: '6px 8px',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <input
                type="checkbox"
                checked={d.completed}
                readOnly
                style={{
                  accentColor: 'var(--neon-primary)',
                  cursor: 'pointer'
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.02em',
                  textDecoration: d.completed ? 'line-through' : 'none',
                  color: d.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                  opacity: d.completed ? 0.65 : 1,
                  wordBreak: 'break-all'
                }}
              >
                {d.text}
              </span>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(d.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 62, 62, 0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              onMouseEnter={playTick}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={playTick}
          placeholder="NEW DIRECTIVE PROTOCOL..."
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid var(--neon-dim)',
            color: 'var(--neon-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            padding: '4px 6px',
            borderRadius: '2px',
            outline: 'none'
          }}
        />
        <button type="submit" className="btn-hud" style={{ padding: '4px 8px' }}>
          <Plus size={10} />
        </button>
      </form>
    </div>
  );
}
