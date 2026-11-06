const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDatabase } = require('./models');
const { bibleService } = require('./services/bibleService');
const { initSocket } = require('./websocket');

// Route modules
const authRoutes = require('./routes/auth');
const churchRoutes = require('./routes/church');
const bibleRoutes = require('./routes/bible');
const scriptureRoutes = require('./routes/scripture');

const app = express();
const server = http.createServer(app);

// Port and environment
const PORT = parseInt(process.env.PORT || '5000', 10);
const isDev = process.env.NODE_ENV !== 'production';

// Ensure required upload and data directories exist
const uploadsDir = path.resolve(__dirname, '../uploads');
const logosDir = path.resolve(__dirname, '../uploads/logos');
const dataDir = path.resolve(__dirname, '../data');

[uploadsDir, logosDir, dataDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Security: Helmet with relaxed resource policy for static files
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false // Disabled for API server to prevent CORS issues with live projection
  })
);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching allowed origins
      if (!origin || allowedOrigins.includes(origin) || isDev) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in local environments
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting: general API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 300, // Limit each IP to 300 requests per 15 minutes (1000 in dev)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Stricter rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Static file serving for uploads (logos, etc.)
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    bibleDbAvailable: bibleService.isAvailable(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/church', churchRoutes);
app.use('/api/bible', bibleRoutes);
app.use('/api/scripture', scriptureRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
  return res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack || err.message);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Initialize Socket.IO
initSocket(server);

// Start server
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('         ScriptureLive AI Backend Server            ');
    console.log('----------------------------------------------------');

    // 1. Connect database (PostgreSQL with graceful SQLite fallback)
    await initDatabase();

    // 2. Initialize Bible database service (sql.js)
    await bibleService.init();

    // 3. Start listening on PORT
    server.listen(PORT, () => {
      console.log(`✓ HTTP Server running on http://localhost:${PORT}`);
      console.log(`✓ Socket.IO ready for real-time dashboard ↔ projection`);
      console.log(`✓ Health check available at http://localhost:${PORT}/api/health`);
      console.log('----------------------------------------------------');
    });
  } catch (err) {
    console.error('! Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown handling
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('✓ HTTP server closed.');
    process.exit(0);
  });

  // Force close if graceful shutdown takes too long
  setTimeout(() => {
    console.error('! Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
