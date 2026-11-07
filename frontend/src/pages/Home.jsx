import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Music,
  History,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Volume2,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import MoodSelector from '../components/MoodSelector';
import SliderPanel from '../components/SliderPanel';
import { DEFAULT_SLIDERS } from '../constants/sliders';
import { DEFAULT_GENRES } from '../constants/genres';
import GenreFilter from '../components/GenreFilter';
import LikedSongSearch from '../components/LikedSongSearch';
import SongCard from '../components/SongCard';
import {
  getRecommendations,
  getMoods,
  getGenres,
  getHistory,
  addToHistory,
  removeHistory
} from '../api/api';

export default function Home({ user, onOpenLogin, onLogout }) {
  // Recommendation control state
  const [selectedMood, setSelectedMood] = useState('energetic');
  const [moodText, setMoodText] = useState('energetic');
  const [sliders, setSliders] = useState(DEFAULT_SLIDERS);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [likedSongs, setLikedSongs] = useState([]);

  // Catalog meta
  const [availableMoods, setAvailableMoods] = useState([]);
  const [availableGenres, setAvailableGenres] = useState(DEFAULT_GENRES);

  // Recommendation output state
  const [recommendations, setRecommendations] = useState([]);
  const [detectedMood, setDetectedMood] = useState(null);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // History drawer state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const res = await getHistory();
      setHistoryList(res.data?.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  // Load initial moods, genres, and user history
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [moodsRes, genresRes] = await Promise.all([
          getMoods().catch(() => ({ data: { moods: [] } })),
          getGenres().catch(() => ({ data: { genres: [] } }))
        ]);
        setAvailableMoods(moodsRes.data?.moods || []);

        const fetchedGenres = Array.isArray(genresRes.data)
          ? genresRes.data
          : (genresRes.data?.genres || []);
        if (fetchedGenres.length > 0) {
          setAvailableGenres(fetchedGenres);
        }
      } catch (err) {
        console.error('Error fetching catalog data:', err);
      }
    };
    fetchCatalog();
  }, []);

  const handleOpenHistory = () => {
    setIsHistoryOpen(true);
    loadHistory();
  };

  const handleFetchRecommendations = async () => {
    setIsLoadingRecs(true);
    setErrorMsg('');

    try {
      const payload = {
        mood_text: moodText || selectedMood || null,
        moodText: moodText || selectedMood || null,
        liked_songs: likedSongs,
        likedSongs: likedSongs,
        slider_values: sliders,
        sliderValues: sliders,
        top_n: 12,
        topN: 12,
        genre_filter: selectedGenre || null,
        genreFilter: selectedGenre || null
      };

      const res = await getRecommendations(payload);
      const recs = res.data?.recommendations || [];
      setRecommendations(recs);
      setDetectedMood(res.data?.detected_mood || null);

      if (recs.length === 0) {
        setErrorMsg('No tracks matched the exact combination of filters. Try broadening your genre or sliders.');
      } else {
        showToast(`Discovered ${recs.length} recommended songs!`);
      }
    } catch (err) {
      console.error('Recommendation failed:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to generate recommendations. Please ensure Python and Node.js backend services are active.';
      setErrorMsg(msg);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleLikeSong = async (song) => {
    if (!user) {
      showToast('Please sign in to save songs to your listening profile', 'info');
      onOpenLogin();
      return;
    }

    try {
      await addToHistory({
        track_name: song.track_name,
        artists: song.artists,
        genre: song.genre,
        rating: 5
      });
      showToast(`Saved "${song.track_name}" to your history!`);
      if (isHistoryOpen) loadHistory();
    } catch (err) {
      console.error('Failed to save song:', err);
      showToast('Could not save to history', 'error');
    }
  };

  const handleRemoveHistoryItem = async (id) => {
    try {
      await removeHistory(id);
      setHistoryList(prev => prev.filter(item => item.id !== id));
      showToast('Track removed from history');
    } catch (err) {
      console.error('Failed to remove history track:', err);
    }
  };

  return (
    <div className="home-layout">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={16} />}
          {toast.type === 'error' && <AlertCircle size={16} />}
          {toast.type === 'info' && <Sparkles size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <header className="hero-header">
        <div className="hero-content">
          <div className="hero-brand">
            <div className="brand-logo-pill">
              <Music className="text-accent" size={24} />
            </div>
            <div>
              <h1 className="hero-title">Mood-to-Music AI</h1>
              <p className="hero-tagline">
                PyTorch Neural Collaborative Filtering + Acoustic Cosine Similarity + Explainability Layer
              </p>
            </div>
          </div>

          <div className="hero-actions">
            {user ? (
              <div className="user-profile-badge">
                <button
                  type="button"
                  id="open-history-btn"
                  className="btn-history-toggle"
                  onClick={handleOpenHistory}
                  title="View Listening History"
                >
                  <History size={16} />
                  <span>History ({historyList.length})</span>
                </button>

                <div className="user-meta">
                  <span className="username-display">@{user.username}</span>
                  <button
                    type="button"
                    className="btn-text-logout"
                    onClick={onLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                id="header-login-btn"
                className="btn-primary-gradient"
                onClick={onOpenLogin}
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid: Control Panel vs Results View */}
      <main className="main-content-grid">
        {/* Controls Column (Left) */}
        <div className="controls-column">
          <div className="controls-stack">
            {/* 1. Mood Selector */}
            <MoodSelector
              selectedMood={selectedMood}
              moodText={moodText}
              onSelectMood={setSelectedMood}
              onMoodTextChange={setMoodText}
              availableMoods={availableMoods}
            />

            {/* 2. Audio Sliders */}
            <SliderPanel
              sliders={sliders}
              onChange={setSliders}
            />

            {/* 3. Genre Filter */}
            <GenreFilter
              genres={availableGenres}
              selectedGenre={selectedGenre}
              onSelectGenre={setSelectedGenre}
            />

            {/* 4. Anchor Songs Search */}
            <LikedSongSearch
              likedSongs={likedSongs}
              onAddLikedSong={(name) => setLikedSongs(prev => [...prev, name])}
              onRemoveLikedSong={(name) => setLikedSongs(prev => prev.filter(s => s !== name))}
            />

            {/* Action CTA */}
            <button
              type="button"
              id="generate-recs-btn"
              className="btn-generate-main"
              onClick={handleFetchRecommendations}
              disabled={isLoadingRecs}
            >
              {isLoadingRecs ? (
                <>
                  <Loader2 className="spinner-icon" size={20} />
                  <span>Computing Neural & Acoustic Embeddings...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Generate AI Recommendations</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Column (Right) */}
        <div className="results-column">
          <div className="results-panel glass-card">
            <div className="results-header">
              <div className="results-title-group">
                <SlidersHorizontal size={20} className="text-accent" />
                <h2 className="results-title">Recommended Tracks</h2>
                {recommendations.length > 0 && (
                  <span className="results-count-pill">{recommendations.length} Tracks</span>
                )}
              </div>

              {detectedMood && (
                <div className="detected-mood-badge">
                  <span>Detected Mood:</span>
                  <strong>{detectedMood}</strong>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="error-banner">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Results Display */}
            {isLoadingRecs ? (
              <div className="loading-state-container">
                <div className="pulse-loader">
                  <div className="pulse-ring"></div>
                  <Music className="pulse-icon" size={36} />
                </div>
                <h3 className="loading-heading">Mining 80,000+ Songs Catalog</h3>
                <p className="loading-desc">
                  Extracting 13 audio dimensions, computing vector cosine similarity, and passing through the Neural CF rating layer...
                </p>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="recommendations-list">
                {recommendations.map((song, idx) => (
                  <SongCard
                    key={`${song.track_name}-${idx}`}
                    song={song}
                    rank={idx + 1}
                    onLike={handleLikeSong}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state-container">
                <div className="empty-icon-wrap">
                  <Volume2 size={44} className="text-muted" />
                </div>
                <h3 className="empty-heading">Ready for Your Taste</h3>
                <p className="empty-desc">
                  Select your current mood, tweak audio sliders to your liking, and click <strong>"Generate AI Recommendations"</strong> to experience hybrid recommendation with deep explainability.
                </p>
                <button
                  type="button"
                  className="btn-preset-trigger"
                  onClick={handleFetchRecommendations}
                >
                  ⚡ Try Sample Recommendation
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Slide-over Drawer */}
      {isHistoryOpen && (
        <div className="history-drawer-overlay" onClick={() => setIsHistoryOpen(false)}>
          <div className="history-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top">
              <div className="drawer-title-group">
                <History size={20} className="text-accent" />
                <h3>Your Listening History</h3>
              </div>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setIsHistoryOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p className="drawer-desc">
              Songs recorded in SQLite. Collaborative filtering (CF) uses this history to train and personalize future predictions.
            </p>

            {isLoadingHistory ? (
              <div className="drawer-loading">
                <Loader2 className="spinner-icon" size={24} />
                <span>Loading saved history...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="drawer-empty">
                <p>No listening history recorded yet.</p>
                <span className="text-muted">Like recommended songs above to build your profile!</span>
              </div>
            ) : (
              <div className="drawer-history-list">
                {historyList.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-item-info">
                      <span className="history-track-title">{item.track_name}</span>
                      <span className="history-track-artists">{item.artists || 'Unknown Artist'}</span>
                      {item.genre && <span className="history-genre-pill">{item.genre}</span>}
                    </div>

                    <button
                      type="button"
                      className="btn-history-remove"
                      onClick={() => handleRemoveHistoryItem(item.id)}
                      title="Remove from history"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
