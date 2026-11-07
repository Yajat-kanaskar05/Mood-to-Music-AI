import axios from 'axios';

// All calls go to Node.js backend (port 4000 via Vite proxy or direct)
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (username, email, password) => api.post('/auth/register', { username, email, password });

export const getRecommendations = (params) => api.post('/recommend', params);
export const searchSongs = (q) => api.get(`/songs/search?q=${encodeURIComponent(q)}`);
export const getMoods = () => api.get('/songs/moods');
export const getGenres = () => api.get('/songs/genres');

export const getHistory = () => api.get('/users/history');
export const addToHistory = (song) => api.post('/users/history', song);
export const removeHistory = (id) => api.delete(`/users/history/${id}`);

export default api;
