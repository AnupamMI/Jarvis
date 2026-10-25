import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Activity } from 'lucide-react';

const Row = ({ icon, label, value, history, color, makePath }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
        {icon}
        <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>{label}</span>
      </div>
      <span className="hud-mono-val" style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{value}</span>
    </div>
    <div style={{ height: '32px', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <svg width="100%" height="32" viewBox="0 0 160 32" preserveAspectRatio="none">
        <path d={makePath(history)} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all .4s ease' }} />
      </svg>
    </div>
  </div>
);

export default function SystemMonitor({ prefersReducedMotion }) {
  const [cpu, setCpu] = useState(25);
  const [ram, setRam] = useState(54);
  const [net, setNet] = useState(15);

  const [cpuHistory, setCpuHistory] = useState([20, 25, 22, 28, 32, 30, 28, 35, 38, 32, 35, 40]);
  const [ramHistory, setRamHistory] = useState([54, 54, 55, 55, 54, 55, 56, 55, 54, 55, 55, 56]);
  const [netHistory, setNetHistory] = useState([10, 15, 12, 18, 22, 15, 28, 20, 24, 30, 25, 28]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setCpu(prev => {
        const next = Math.max(10, Math.min(95, prev + (Math.random() * 16 - 8)));
        setCpuHistory(hist => [...hist.slice(1), Math.floor(next)]);
        return Math.floor(next);
      });
      setRam(prev => {
        const next = Math.max(40, Math.min(85, prev + (Math.random() * 4 - 2)));
        setRamHistory(hist => [...hist.slice(1), Math.floor(next)]);
        return Math.floor(next);
      });
      setNet(prev => {
        const next = Math.max(2, Math.min(99, prev + (Math.random() * 20 - 10)));
        setNetHistory(hist => [...hist.slice(1), Math.floor(next)]);
        return Math.floor(next);
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const makePath = (history, width = 160, height = 32) => {
    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - (val / 100) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  return (
    <div className="hud-panel">
      <div className="hud-title">
        <span>Resources</span>
        <span className="hud-mono-val" style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>live</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'space-around' }}>
        <Row icon={<Cpu size={13} />} label="CPU" value={`${cpu}%`} history={cpuHistory} color="var(--accent)" makePath={makePath} />
        <Row icon={<HardDrive size={13} />} label="Memory" value={`${ram}%`} history={ramHistory} color="var(--neon-secondary)" makePath={makePath} />
        <Row icon={<Activity size={13} />} label="Network" value={`${net} MB`} history={netHistory} color="var(--accent)" makePath={makePath} />
      </div>
    </div>
  );
}
