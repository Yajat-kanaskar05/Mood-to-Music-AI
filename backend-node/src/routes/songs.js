const express = require('express');
const { searchSongs, getMoods, getGenres } = require('../services/mlService');
const { DEFAULT_GENRES, DEFAULT_MOODS } = require('../constants/genres');
const router  = express.Router();

// Search songs (delegates to ML service)
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
    const data = await searchSongs(q, Number(limit) || 10);
    res.json(data);
  } catch (err) {
    console.error('Song search error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'ML service is unavailable. Make sure Python service is running on port 8000.' });
    }
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

// Get predefined moods
router.get('/moods', async (req, res) => {
  try {
    const data = await getMoods();
    if (data && (Array.isArray(data.moods) || Array.isArray(data))) {
      return res.json(data);
    }
    res.json({ moods: DEFAULT_MOODS });
  } catch (err) {
    // If ML service is offline, gracefully return fallback catalog moods
    res.json({ moods: DEFAULT_MOODS });
  }
});

// Get genres
router.get('/genres', async (req, res) => {
  try {
    const data = await getGenres();
    if (data && (Array.isArray(data.genres) || Array.isArray(data))) {
      return res.json(data);
    }
    res.json({ genres: DEFAULT_GENRES });
  } catch (err) {
    // If ML service is offline, gracefully return fallback catalog genres
    res.json({ genres: DEFAULT_GENRES });
  }
});

module.exports = router;
