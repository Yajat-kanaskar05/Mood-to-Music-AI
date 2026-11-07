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
app.use(helmet());
app.use(cors({ origin: '*' })); // Allow frontend calls (port 3000 or custom)
app.use(morgan('dev'));
app.use(express.json());
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/songs',     songRoutes);
app.use('/api/recommend', recommendRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'node-backend' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

module.exports = app;
