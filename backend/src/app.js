/**
 * Express Application Configuration
 * Configures global middleware, routes, and error handling.
 * Kept separate from the HTTP/WebSocket server for modularity and testability.
 */

const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const floorRoutes = require('./routes/floorRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

const app = express();

// 1. CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman, or simulator scripts)
    if (!origin) return callback(null, true);

    // Allow configured frontend origin (e.g. http://localhost:5173 for Vite)
    if (config.corsOrigin === '*' || origin === config.corsOrigin) {
      return callback(null, true);
    }

    const corsError = new Error(`Origin ${origin} not allowed by CORS`);
    corsError.statusCode = 403;
    return callback(corsError);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// 2. Request Body Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 3. Lightweight Request Logger (for development and observability)
if (config.nodeEnv !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// 4. API Routes
app.use('/api', healthRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/devices', deviceRoutes);

// 5. 404 Handler (for non-existent endpoints)
app.use(notFoundHandler);

// 6. Centralized Error Handler
app.use(errorHandler);

module.exports = app;

