const express = require('express');
const auth    = require('../middleware/auth');
const db      = require('../db/database');
const router  = express.Router();

// Get listening history
router.get('/history', auth, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM listening_history WHERE user_id = ? ORDER BY played_at DESC'
    ).all(req.userId);
    res.json({ history: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history', message: err.message });
  }
});

// Add a song to history (when user likes or plays a song)
router.post('/history', auth, (req, res) => {
  const { track_name, artists, genre, rating = 5 } = req.body;
  if (!track_name) return res.status(400).json({ error: 'track_name required' });

  try {
    const info = db.prepare(
      'INSERT INTO listening_history (user_id, track_name, artists, genre, rating) VALUES (?, ?, ?, ?, ?)'
    ).run(req.userId, track_name, artists || '', genre || '', rating);

    res.status(201).json({ message: 'Added to history', id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to history', message: err.message });
  }
});

// Delete a song from history
router.delete('/history/:id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM listening_history WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.userId);
    res.json({ message: 'Removed from history' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from history', message: err.message });
  }
});

module.exports = router;
