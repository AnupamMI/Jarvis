import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Readout-style panel wrapper — an alternate flavor of .hud-panel with
 * a tracked uppercase title and an optional mono "code" tag, matching
 * the mission-control reference. Use the plain .hud-panel + .hud-title
 * classes (see other components) when you want the sentence-case look
 * instead; both share the same card chrome from index.css.
 */
export function HudPanel({ title, code, className = "", children }) {
  return (
    <section className={`hud-panel ${className}`}>
      <header
        style={{
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <h2 style={{ fontSize: '0.66rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
          {title}
        </h2>
        {code ? (
          <span className="hud-mono-val" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-faint)' }}>
            {code}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function Meter({ label, value, unit = "%" }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div className="hud-mono-val" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text)' }}>{value.toFixed(0)}{unit}</span>
      </div>
      <div style={{ height: '6px', overflow: 'hidden', borderRadius: '999px', background: 'var(--surface-2)' }}>
        <div
          style={{
            height: '100%',
            borderRadius: '999px',
            background: 'var(--gradient-core)',
            boxShadow: 'var(--glow-soft)',
            width: `${Math.min(100, Math.max(2, value))}%`,
            transition: 'width .5s ease-out'
          }}
        />
      </div>
    </div>
  );
}

export function useTelemetry(seedBase) {
  const [v, setV] = useState(seedBase);
  useEffect(() => {
    const id = setInterval(() => {
      setV((p) => {
        const next = p + (Math.random() - 0.5) * 14;
        return Math.min(98, Math.max(8, next));
      });
    }, 1400);
    return () => clearInterval(id);
  }, []);
  return v;
}

export function Waveform({ active }) {
  const bars = useMemo(() => Array.from({ length: 42 }, (_, i) => i), []);
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeed((s) => s + 1), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', height: '64px', alignItems: 'center', justifyContent: 'space-between', gap: '3px' }}>
      {bars.map((i) => {
        const base = Math.abs(Math.sin(i * 0.7 + seed * 0.5)) * (active ? 1 : 0.28);
        const h = 8 + base * 92 * (1 - Math.abs(i - bars.length / 2) / (bars.length * 0.9));
        return (
          <span
            key={i}
            style={{
              flex: 1,
              borderRadius: '999px',
              background: 'var(--gradient-core)',
              height: `${Math.max(6, h)}%`,
              transition: 'height 150ms ease-out'
            }}
          />
        );
      })}
    </div>
  );
}

export function Radar({ prefersReducedMotion }) {
  const blips = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        x: 50 + Math.cos(i * 1.9 + 0.6) * (18 + i * 4),
        y: 50 + Math.sin(i * 2.4 + 1.1) * (16 + i * 4),
        d: (i * 0.7) % 4,
      })),
    []
  );
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        {[46, 34, 22, 10].map((r) => (
          <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="0.4" />
        ))}
        <line x1="4" y1="50" x2="96" y2="50" stroke="var(--border)" strokeWidth="0.4" />
        <line x1="50" y1="4" x2="50" y2="96" stroke="var(--border)" strokeWidth="0.4" />
        <g
          style={{
            transformOrigin: 'center',
            animation: prefersReducedMotion ? 'none' : 'radar-rotate 4s linear infinite'
          }}
        >
          <path d="M50 50 L50 4 A46 46 0 0 1 82 18 Z" fill="var(--accent)" opacity="0.16" />
          <line x1="50" y1="50" x2="50" y2="4" stroke="var(--accent)" strokeWidth="0.6" />
        </g>
      </svg>
      {blips.map((b, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${b.x}%`,
            top: `${b.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: 'var(--glow-soft)',
            animation: prefersReducedMotion ? 'none' : `pulse-soft 1.6s ease-in-out infinite`,
            animationDelay: `${b.d}s` 
          }}
        />
      ))}
    </div>
  );
}

export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now ? now.toLocaleTimeString("en-GB", { hour12: false }) : "--:--:--";
  const date = now
    ? now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    : "";
  return (
    <div style={{ textAlign: 'right' }}>
      <p className="hud-mono-val" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {time}
      </p>
      <p style={{ fontSize: '0.66rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
        {date}
      </p>
    </div>
  );
}

export function LogStream({ lines }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [lines]);
  return (
    <div ref={ref} style={{ height: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', lineHeight: '1.6' }}>
      {lines.map((l, i) => (
        <p key={i} style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--accent)' }}>›</span> {l}
        </p>
      ))}
    </div>
  );
}
