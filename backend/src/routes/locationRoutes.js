/**
 * Location Routes
 * REST API endpoints for location ingestion, current state, and historical query.
 */

const express = require('express');
const locationController = require('../controllers/locationController');

const router = express.Router();

// Ingestion
router.post('/', locationController.ingestLocation);

// Real-time current positions
router.get('/latest', locationController.getLatestLocations);
router.get('/latest/:deviceId', locationController.getDeviceLatestLocation);

// Spatial aggregations for dashboard & 3D model
router.get('/building/:buildingId', locationController.getBuildingCurrentLocations);
router.get('/floor/:floorId', locationController.getFloorCurrentLocations);

// Historical trails & analytics
router.get('/history/:deviceId', locationController.getDeviceLocationHistory);
router.get('/summary/:deviceId', locationController.getDeviceMovementSummary);

module.exports = router;
