import React, { useState } from 'react';
import { CloudRain, Sun, Cloud, Search, MapPin } from 'lucide-react';
import { generateMockWeather } from '../utils/weather';
import { playTick, playChirp } from '../utils/audio';

export default function WeatherWidget() {
  const [cityInput, setCityInput] = useState('');
  const [currentCity, setCurrentCity] = useState('Malibu');
  const weatherData = generateMockWeather(currentCity);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    playChirp();
    setCurrentCity(cityInput.trim());
    setCityInput('');
  };

  const getWeatherIcon = (cond) => {
    const c = cond.toLowerCase();
    if (c.includes('sunny') || c.includes('clear')) {
      return <Sun size={24} style={{ color: 'var(--warning)' }} />;
    }
    if (c.includes('rain') || c.includes('drizzle')) {
      return <CloudRain size={24} style={{ color: 'var(--accent)' }} />;
    }
    return <Cloud size={24} style={{ color: 'var(--text-muted)' }} />;
  };

  return (
    <div className="hud-panel" style={{ gap: '10px' }}>
      <div className="hud-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <MapPin size={12} /> Weather
        </span>
        <span className="hud-mono-val" style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>synced</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {weatherData.location}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            {weatherData.condition}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getWeatherIcon(weatherData.condition)}
          <span className="hud-mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            {weatherData.temp}°C
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[
          { label: 'Humidity', value: `${weatherData.humidity}%` },
          { label: 'Wind', value: weatherData.windSpeed },
          { label: 'Pressure', value: weatherData.pressure }
        ].map((stat) => (
          <div key={stat.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-faint)', marginBottom: '3px' }}>{stat.label}</div>
            <div className="hud-mono-val" style={{ fontSize: '0.68rem' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '0.65rem', color: 'var(--text-faint)', lineHeight: '1.4' }}>
        {weatherData.status}
      </div>

      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
        <input
          type="text"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          onFocus={playTick}
          placeholder="Search a city…"
          style={{
            flex: 1,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: '0.72rem',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            outline: 'none'
          }}
        />
        <button type="submit" className="btn-hud" style={{ padding: '7px 10px' }}>
          <Search size={12} />
        </button>
      </form>
    </div>
  );
}
