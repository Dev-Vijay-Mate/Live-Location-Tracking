/**
 * Device Routes
 * REST API routes for devices, statuses, connectivity, and building assignments.
 */

const express = require('express');
const deviceController = require('../controllers/deviceController');

const router = express.Router();

router.get('/', deviceController.getAllDevices);
router.post('/', deviceController.registerDevice);
router.get('/monitoring/health', deviceController.getFleetHealth);
router.get('/:deviceId', deviceController.getDevice);
router.put('/:deviceId', deviceController.updateDevice);
router.patch('/:deviceId/status', deviceController.setDeviceStatus);
router.patch('/:deviceId/admin-status', deviceController.setDeviceAdminStatus);
router.get('/:deviceId/connectivity', deviceController.getDeviceConnectivity);

// Assignment routes
router.get('/:deviceId/assignments', deviceController.getDeviceAssignments);
router.post('/:deviceId/assignments', deviceController.assignDevice);
router.patch('/:deviceId/assignments/unassign', deviceController.unassignDevice);

module.exports = router;
