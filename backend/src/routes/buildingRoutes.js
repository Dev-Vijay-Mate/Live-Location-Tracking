/**
 * Building Routes
 * REST API routes for buildings and nested floors.
 */

const express = require('express');
const buildingController = require('../controllers/buildingController');

const router = express.Router();

router.get('/', buildingController.getAllBuildings);
router.post('/', buildingController.createBuilding);
router.get('/:buildingId', buildingController.getBuilding);
router.put('/:buildingId', buildingController.updateBuilding);
router.patch('/:buildingId/status', buildingController.setBuildingStatus);

// Nested floor routes under a building
router.get('/:buildingId/floors', buildingController.getBuildingFloors);
router.post('/:buildingId/floors', buildingController.createBuildingFloor);

module.exports = router;
