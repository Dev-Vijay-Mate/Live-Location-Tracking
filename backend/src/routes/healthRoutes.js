/**
 * Health Check Route
 * Exposes GET /api/health for system status, heartbeat, and monitoring.
 */

const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'live-location-tracking-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime() * 100) / 100,
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;

