import React from 'react';
import { Sparkles, Smile, Frown, Zap, Coffee, Target, Heart, CloudRain, Flame } from 'lucide-react';

const MOOD_EMOJIS = {
  happy: { emoji: '😊', icon: Smile, color: '#f59e0b', gradient: 'from-amber-500/20 to-orange-500/20' },
  sad: { emoji: '😢', icon: Frown, color: '#3b82f6', gradient: 'from-blue-500/20 to-indigo-500/20' },
  angry: { emoji: '💥', icon: Flame, color: '#ef4444', gradient: 'from-red-500/20 to-rose-500/20' },
  relaxed: { emoji: '🌿', icon: Coffee, color: '#10b981', gradient: 'from-emerald-500/20 to-teal-500/20' },
  focused: { emoji: '🎯', icon: Target, color: '#8b5cf6', gradient: 'from-purple-500/20 to-violet-500/20' },
  energetic: { emoji: '⚡', icon: Zap, color: '#eab308', gradient: 'from-yellow-500/20 to-amber-500/20' },
  romantic: { emoji: '💖', icon: Heart, color: '#ec4899', gradient: 'from-pink-500/20 to-rose-500/20' },
  melancholic: { emoji: '🌧️', icon: CloudRain, color: '#6366f1', gradient: 'from-indigo-500/20 to-slate-500/20' },
};

export default function MoodSelector({
  selectedMood,
  moodText,
  onSelectMood,
  onMoodTextChange,
  availableMoods = []
}) {
  const moodsList = availableMoods.length > 0
    ? availableMoods
    : Object.keys(MOOD_EMOJIS).map(name => ({
        name,
        description: name.charAt(0).toUpperCase() + name.slice(1)
      }));

  return (
    <div className="glass-card mood-selector-container">
      <div className="section-header">
        <div className="section-title-wrap">
          <Sparkles className="icon-accent" size={20} />
          <h3 className="section-title">1. What's Your Mood?</h3>
        </div>
        {selectedMood && (
          <span className="badge-active">
            Active: <strong>{selectedMood}</strong>
          </span>
        )}
      </div>

      <p className="section-subtitle">
        Pick an emotional preset or type exactly how you feel to align the AI recommendation engine.
      </p>

      {/* Preset Mood Grid */}
      <div className="mood-grid">
        {moodsList.map((m) => {
          const key = m.name.toLowerCase();
          const meta = MOOD_EMOJIS[key] || { emoji: '🎵', color: '#a855f7' };
          const isSelected = selectedMood?.toLowerCase() === key;

          return (
            <button
              key={m.name}
              type="button"
              id={`mood-btn-${key}`}
              className={`mood-card ${isSelected ? 'active' : ''}`}
              onClick={() => {
                if (isSelected) {
                  onSelectMood('');
                  onMoodTextChange('');
                } else {
                  onSelectMood(key);
                  onMoodTextChange(key);
                }
              }}
              style={{
                '--mood-color': meta.color
              }}
            >
              <span className="mood-emoji">{meta.emoji}</span>
              <span className="mood-name">{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Mood Text Input */}
      <div className="custom-mood-input-wrap">
        <label htmlFor="custom-mood-input" className="input-label">
          Or express in your own words:
        </label>
        <div className="input-with-icon">
          <input
            id="custom-mood-input"
            type="text"
            className="text-input"
            placeholder="e.g. late night coding in the rain, intense gym workout, cozy Sunday morning..."
            value={moodText}
            onChange={(e) => {
              onMoodTextChange(e.target.value);
              if (selectedMood && e.target.value !== selectedMood) {
                onSelectMood('');
              }
            }}
          />
          {moodText && (
            <button
              type="button"
              className="clear-input-btn"
              onClick={() => {
                onMoodTextChange('');
                onSelectMood('');
              }}
              title="Clear mood"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
