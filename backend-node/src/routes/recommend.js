const express    = require('express');
const jwt        = require('jsonwebtoken');
const { getRecommendations } = require('../services/mlService');
const db         = require('../db/database');
const router     = express.Router();

// Optional auth helper: extracts userId if token provided, otherwise null
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_mood_music_jwt_key_2026');
      req.userId = decoded.userId;
    } catch {
      // invalid token, treat as guest
      req.userId = null;
    }
  }
  next();
};

// POST /api/recommend
router.post('/', optionalAuth, async (req, res) => {
  try {
    // Support both camelCase and snake_case request properties
    const moodText = req.body.moodText || req.body.mood_text || null;
    const sliderValues = req.body.sliderValues || req.body.slider_values || null;
    const topN = req.body.topN || req.body.top_n || 10;
    const genreFilter = req.body.genreFilter || req.body.genre_filter || null;
    const directLikedSongs = req.body.likedSongs || req.body.liked_songs || [];
    let likedSongs = Array.isArray(directLikedSongs) ? directLikedSongs : [];

    // If authenticated and no explicit likedSongs passed, fetch from user's history in DB
    if (req.userId && likedSongs.length === 0) {
      const history = db.prepare(
        'SELECT track_name FROM listening_history WHERE user_id = ? ORDER BY played_at DESC LIMIT 20'
      ).all(req.userId);
      likedSongs = history.map(h => h.track_name);
    }

    // Call Python ML service
    const mlResult = await getRecommendations({
      moodText,
      likedSongs,
      sliderValues,
      userId: req.userId,
      topN: Number(topN) || 10,
      genreFilter
    });

    res.json(mlResult);
  } catch (err) {
    console.error('ML service error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'ML service is unavailable. Please ensure the Python FastAPI service is running on port 8000.'
      });
    }
    res.status(500).json({ error: 'Failed to get recommendations', message: err.message });
  }
});

module.exports = router;
