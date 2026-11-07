import React, { useState } from 'react';
import { Play, Pause, Heart, Info, Check, Sparkles, ExternalLink } from 'lucide-react';

export default function SongCard({
  song,
  rank,
  onLike,
  isLiked = false
}) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [justLiked, setJustLiked] = useState(false);

  const spotifyUrl = song.track_id
    ? `https://open.spotify.com/track/${song.track_id}`
    : `https://open.spotify.com/search/${encodeURIComponent(song.track_name + ' ' + song.artists)}`;

  const matchPercent = song.hybrid_score
    ? Math.min(Math.round(song.hybrid_score * 100), 100)
    : 85;

  const handleLikeClick = async () => {
    if (onLike && !isLiked && !justLiked) {
      setJustLiked(true);
      await onLike(song);
    }
  };

  const explanation = song.explanation || {};
  const reasons = explanation.reasons || [];
  const featureMatch = explanation.feature_match || {};

  return (
    <div className={`song-card ${showPlayer ? 'playing' : ''}`}>
      <div className="song-card-main">
        {/* Rank & Official Spotify Player Button */}
        <div className="song-media-preview">
          <span className="rank-indicator">#{rank}</span>
          <button
            type="button"
            className={`play-btn-circle ${showPlayer ? 'active spotify-active' : ''}`}
            onClick={() => setShowPlayer(!showPlayer)}
            title={showPlayer ? 'Close Spotify player' : 'Play with official Spotify player'}
          >
            {showPlayer ? <Pause size={18} /> : <Play size={18} className="translate-play" />}
          </button>
        </div>

        {/* Title, Artist, Tags */}
        <div className="song-details-col">
          <div className="song-heading-row">
            <h4 className="song-track-name">{song.track_name}</h4>
            <div className="match-score-pill" title="Hybrid Engine Composite Score">
              <Sparkles size={12} className="text-accent" />
              <span>{matchPercent}% Match</span>
            </div>
          </div>

          <div className="song-meta-row">
            <span className="song-artist-name">{song.artists}</span>
            {song.genre && <span className="genre-tag">{song.genre}</span>}
            {song.tempo && <span className="tempo-tag">{Math.round(song.tempo)} BPM</span>}
          </div>

          {/* Quick Explanation Summary */}
          {explanation.summary && (
            <p className="song-explanation-summary">
              💡 {explanation.summary}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="song-actions-col">
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-action-icon btn-spotify-link"
            title="Open in Spotify"
          >
            <ExternalLink size={16} />
          </a>

          <button
            type="button"
            className={`btn-action-icon ${isLiked || justLiked ? 'liked' : ''}`}
            onClick={handleLikeClick}
            disabled={isLiked || justLiked}
            title={isLiked || justLiked ? 'Saved to history' : 'Save & Like'}
          >
            {isLiked || justLiked ? <Check size={18} /> : <Heart size={18} />}
          </button>

          <button
            type="button"
            className={`btn-action-icon ${showExplanation ? 'active' : ''}`}
            onClick={() => setShowExplanation(!showExplanation)}
            title="Inspect Why This Song was Recommended"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* Embedded Official Spotify Player */}
      {showPlayer && (
        <div className="spotify-embed-wrapper">
          {song.track_id ? (
            <iframe
              src={`https://open.spotify.com/embed/track/${song.track_id}?utm_source=generator&theme=0`}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title={`Spotify Player: ${song.track_name}`}
            />
          ) : (
            <div className="spotify-fallback-box">
              <span>Track ID not available in local catalog.</span>
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-spotify-external"
              >
                Listen on Spotify ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* Mini Feature Meter Row */}
      <div className="mini-features-row">
        <div className="mini-feature">
          <span className="mini-feature-name">Energy</span>
          <div className="meter-bg">
            <div
              className="meter-fill energy"
              style={{ width: `${Math.round((song.energy || 0.5) * 100)}%` }}
            />
          </div>
          <span className="mini-feature-val">{Math.round((song.energy || 0.5) * 100)}%</span>
        </div>

        <div className="mini-feature">
          <span className="mini-feature-name">Valence</span>
          <div className="meter-bg">
            <div
              className="meter-fill valence"
              style={{ width: `${Math.round((song.valence || 0.5) * 100)}%` }}
            />
          </div>
          <span className="mini-feature-val">{Math.round((song.valence || 0.5) * 100)}%</span>
        </div>

        <div className="mini-feature">
          <span className="mini-feature-name">Dance</span>
          <div className="meter-bg">
            <div
              className="meter-fill dance"
              style={{ width: `${Math.round((song.danceability || 0.5) * 100)}%` }}
            />
          </div>
          <span className="mini-feature-val">{Math.round((song.danceability || 0.5) * 100)}%</span>
        </div>

        <div className="mini-feature">
          <span className="mini-feature-name">Acoustic</span>
          <div className="meter-bg">
            <div
              className="meter-fill acoustic"
              style={{ width: `${Math.round((song.acousticness || 0.5) * 100)}%` }}
            />
          </div>
          <span className="mini-feature-val">{Math.round((song.acousticness || 0.5) * 100)}%</span>
        </div>
      </div>

      {/* Expanded Explainability Drawer */}
      {showExplanation && (
        <div className="explanation-drawer">
          <div className="drawer-header">
            <span className="drawer-title">🔍 AI Recommendation Rationale:</span>
          </div>

          <ul className="reasons-list">
            {reasons.map((r, i) => (
              <li key={i} className="reason-item">
                <span className="reason-bullet">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>

          {Object.keys(featureMatch).length > 0 && (
            <div className="feature-comparison-table">
              <span className="comparison-title">Acoustic Alignment vs Your Preferences:</span>
              <div className="comparison-grid">
                {Object.entries(featureMatch).map(([feat, data]) => (
                  <div key={feat} className="comparison-cell">
                    <span className="feat-name">{feat}</span>
                    <span className="feat-song-val">Song: {Math.round(data.song_value * 100)}%</span>
                    {data.user_preference !== null && (
                      <span className="feat-pref-val">Pref: {Math.round(data.user_preference * 100)}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
