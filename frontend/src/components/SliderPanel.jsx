import React from 'react';
import { Sliders, RotateCcw, Activity, Disc, Zap, Volume2, Mic, Clock } from 'lucide-react';
import { DEFAULT_SLIDERS } from '../constants/sliders';

const SLIDER_CONFIGS = [
  {
    key: 'valence',
    label: 'Valence (Mood)',
    lowLabel: 'Melancholic / Dark',
    highLabel: 'Euphoric / Uplifting',
    icon: Activity,
    color: '#38bdf8'
  },
  {
    key: 'energy',
    label: 'Energy (Intensity)',
    lowLabel: 'Gentle / Relaxed',
    highLabel: 'High-Octane / Loud',
    icon: Zap,
    color: '#fbbf24'
  },
  {
    key: 'danceability',
    label: 'Danceability (Groove)',
    lowLabel: 'Static / Ambient',
    highLabel: 'Club Rhythm',
    icon: Disc,
    color: '#ec4899'
  },
  {
    key: 'acousticness',
    label: 'Acousticness',
    lowLabel: 'Synthesizers / EDM',
    highLabel: 'Organic / Unplugged',
    icon: Volume2,
    color: '#10b981'
  },
  {
    key: 'tempo_norm',
    label: 'Tempo (Pace)',
    lowLabel: 'Slow Ballad (~60 BPM)',
    highLabel: 'Fast Beat (>140 BPM)',
    icon: Clock,
    color: '#a855f7'
  },
  {
    key: 'instrumentalness',
    label: 'Instrumentalness',
    lowLabel: 'Vocal Dominant',
    highLabel: 'Pure Instrumentals',
    icon: Mic,
    color: '#f97316'
  }
];

const PRESETS = [
  {
    name: 'Club Night',
    emoji: '🔥',
    values: { valence: 0.85, energy: 0.95, danceability: 0.9, acousticness: 0.05, tempo_norm: 0.8, instrumentalness: 0.1 }
  },
  {
    name: 'Deep Focus',
    emoji: '🎧',
    values: { valence: 0.45, energy: 0.35, danceability: 0.25, acousticness: 0.4, tempo_norm: 0.45, instrumentalness: 0.85 }
  },
  {
    name: 'Coffee Chill',
    emoji: '☕',
    values: { valence: 0.65, energy: 0.3, danceability: 0.45, acousticness: 0.85, tempo_norm: 0.3, instrumentalness: 0.2 }
  },
  {
    name: 'Late Night Melancholy',
    emoji: '🌙',
    values: { valence: 0.15, energy: 0.25, danceability: 0.3, acousticness: 0.75, tempo_norm: 0.25, instrumentalness: 0.35 }
  }
];

export default function SliderPanel({ sliders, onChange }) {
  const currentValues = { ...DEFAULT_SLIDERS, ...(sliders || {}) };

  const handleSliderChange = (key, value) => {
    onChange({
      ...currentValues,
      [key]: parseFloat(value)
    });
  };

  const applyPreset = (presetValues) => {
    onChange(presetValues);
  };

  const resetDefaults = () => {
    onChange(DEFAULT_SLIDERS);
  };

  return (
    <div className="glass-card slider-panel-container">
      <div className="section-header">
        <div className="section-title-wrap">
          <Sliders className="icon-accent" size={20} />
          <h3 className="section-title">2. Audio Feature Tuning</h3>
        </div>
        <button
          type="button"
          className="btn-text-icon"
          onClick={resetDefaults}
          title="Reset to 50% neutral defaults"
        >
          <RotateCcw size={14} />
          Reset Defaults
        </button>
      </div>

      <p className="section-subtitle">
        Fine-tune musical dimensions directly. The hybrid engine mathematically aligns tracks to these target acoustics.
      </p>

      {/* Preset Pills */}
      <div className="preset-row">
        <span className="preset-label">Quick Presets:</span>
        <div className="preset-chips">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="preset-chip"
              onClick={() => applyPreset(p.values)}
            >
              <span>{p.emoji}</span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="sliders-grid">
        {SLIDER_CONFIGS.map((cfg) => {
          const val = currentValues[cfg.key] ?? 0.5;
          const percentage = Math.round(val * 100);
          const Icon = cfg.icon;

          return (
            <div key={cfg.key} className="slider-item">
              <div className="slider-label-row">
                <div className="slider-title-wrap">
                  <Icon size={16} style={{ color: cfg.color }} />
                  <span className="slider-title">{cfg.label}</span>
                </div>
                <span className="slider-val-badge" style={{ borderColor: cfg.color, color: cfg.color }}>
                  {percentage}%
                </span>
              </div>

              <input
                id={`slider-${cfg.key}`}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={val}
                className="custom-range"
                style={{
                  background: `linear-gradient(to right, ${cfg.color} 0%, ${cfg.color} ${percentage}%, rgba(255, 255, 255, 0.1) ${percentage}%, rgba(255, 255, 255, 0.1) 100%)`
                }}
                onChange={(e) => handleSliderChange(cfg.key, e.target.value)}
              />

              <div className="slider-limits">
                <span>{cfg.lowLabel}</span>
                <span>{cfg.highLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
