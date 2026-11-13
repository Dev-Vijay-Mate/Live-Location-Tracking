/**
 * Central Server Entry Point
 * Wraps Express in a native Node.js HTTP server.
 * Enables shared HTTP port for both Express REST APIs and WebSocket upgrades.
 */

const http = require('http');
const app = require('./app');
const config = require('./config');

const server = http.createServer(app);

// Server startup
server.listen(config.port, () => {
  console.log('====================================================');
  console.log(`Live Location Tracking Backend`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Server URL:  http://localhost:${config.port}`);
  console.log(`Health:      http://localhost:${config.port}/api/health`);
  console.log(`WebSocket:   ws://localhost:${config.port}${config.wsPath}`);
  console.log('====================================================');
});

// Server error handling (e.g. port already in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${config.port} is already in use. Please configure a free PORT in your .env file.`);
  } else {
    console.error('[ERROR] Server failure:', err);
  }
  process.exit(1);
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close if graceful shutdown hangs
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;

