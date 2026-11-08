const path       = require('path');
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const { apiLimiter } = require('./src/middleware/rateLimiter');

const authRoutes      = require('./src/routes/auth');
const userRoutes      = require('./src/routes/users');
const songRoutes      = require('./src/routes/songs');
const recommendRoutes = require('./src/routes/recommend');

const app = express();

// Security and utility middleware
// Disable strict CSP/COEP so embedded Spotify player and web fonts render smoothly
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: '*' })); // Allow cross-origin requests
app.use(morgan('dev'));
app.use(express.json());
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/songs',     songRoutes);
app.use('/api/recommend', recommendRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'node-backend' }));

// Serve compiled React frontend assets
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Client-side routing fallback: serve index.html for all non-API GET requests (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  }
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

module.exports = app;
