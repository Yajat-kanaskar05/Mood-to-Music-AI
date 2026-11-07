const axios = require('axios');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const mlClient = axios.create({
  baseURL: ML_URL,
  timeout: 15000,
});

/**
 * Get recommendations from the Python ML microservice.
 */
const getRecommendations = async ({ moodText, likedSongs, sliderValues, userId, topN, genreFilter }) => {
  const payload = {
    mood_text:     moodText     || null,
    liked_songs:   likedSongs   || [],
    slider_values: sliderValues || null,
    user_id:       userId       || null,
    top_n:         topN         || 10,
    genre_filter:  genreFilter  || null,
  };

  const response = await mlClient.post('/recommend', payload);
  return response.data;
};

/**
 * Search songs in the ML service index.
 */
const searchSongs = async (query, limit = 10) => {
  const response = await mlClient.get(`/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

/**
 * Get all available moods.
 */
const getMoods = async () => {
  const response = await mlClient.get('/moods');
  return response.data;
};

/**
 * Get all available genres.
 */
const getGenres = async () => {
  const response = await mlClient.get('/genres');
  return response.data;
};

module.exports = { getRecommendations, searchSongs, getMoods, getGenres };
