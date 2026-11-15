/**
 * Application Configuration & Environment Variable Validator
 * Centralizes all configuration loaded from process.env with strict defaults and type conversions.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env file from the backend root if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'live_location_tracking',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_local_password',
    max: parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 20,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10) || 5000,
  },

  // Location tracking settings
  deviceStaleTimeoutSeconds: parseInt(process.env.DEVICE_STALE_TIMEOUT_SECONDS, 10) || 30,

  // WebSocket
  wsPath: process.env.WS_PATH || '/ws',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

// Validate critical values
if (Number.isNaN(config.port) || config.port <= 0 || config.port > 65535) {
  throw new Error(`Invalid PORT specified in environment: ${process.env.PORT}`);
}

module.exports = Object.freeze(config);

