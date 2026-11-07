import React, { useState, useEffect } from 'react';
import { Search, Heart, Plus, X, Music, Check, Loader2 } from 'lucide-react';
import { searchSongs } from '../api/api';

export default function LikedSongSearch({ likedSongs = [], onAddLikedSong, onRemoveLikedSong }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchSongs(trimmed, 6);
        if (active) setResults(res.data?.results || []);
      } catch (err) {
        console.error('Failed to search songs:', err);
        if (active) setResults([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleAdd = (trackName) => {
    if (!likedSongs.includes(trackName)) {
      onAddLikedSong(trackName);
    }
  };

  return (
    <div className="glass-card liked-songs-container">
      <div className="section-header">
        <div className="section-title-wrap">
          <Heart className="icon-accent" size={20} />
          <h3 className="section-title">4. Anchor Tracks (Songs You Love)</h3>
        </div>
        <span className="badge-count">
          {likedSongs.length} Selected
        </span>
      </div>

      <p className="section-subtitle">
        Add 1–5 songs to ground the Content-Based (CBF) engine. Recommendations will inherit acoustic DNA from these tracks.
      </p>

      {/* Search Input Box */}
      <div className="search-input-wrapper">
        <Search className="search-icon" size={18} />
        <input
          id="search-songs-input"
          type="text"
          className="search-input"
          placeholder="Search catalog by song title or artist (e.g. Coldplay, Queen, Dua Lipa)..."
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (val.trim().length < 2) {
              setResults([]);
              setIsLoading(false);
            }
          }}
        />
        {isLoading && <Loader2 className="spinner-icon" size={18} />}
        {query && !isLoading && (
          <button
            type="button"
            className="clear-input-btn"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Search Results Dropdown/List */}
      {results.length > 0 && (
        <div className="search-results-list">
          {results.map((song) => {
            const isAdded = likedSongs.includes(song.track_name);
            return (
              <div key={song.index || `${song.track_name}-${song.artists}`} className="search-result-item">
                <div className="song-info-meta">
                  <Music size={16} className="text-accent flex-shrink-0" />
                  <div className="song-text-wrap">
                    <span className="song-title">{song.track_name}</span>
                    <span className="song-artist-genre">
                      {song.artists} {song.genre ? `• ${song.genre}` : ''}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id={`add-song-${song.index}`}
                  className={`btn-add-song ${isAdded ? 'added' : ''}`}
                  disabled={isAdded}
                  onClick={() => handleAdd(song.track_name)}
                >
                  {isAdded ? (
                    <>
                      <Check size={14} /> Added
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Add
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Song Chips */}
      {likedSongs.length > 0 && (
        <div className="selected-chips-wrapper">
          <span className="chips-title">Active Liked Seeds:</span>
          <div className="chips-container">
            {likedSongs.map((name) => (
              <span key={name} className="liked-chip">
                <span className="chip-name">{name}</span>
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={() => onRemoveLikedSong(name)}
                  title={`Remove ${name}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
