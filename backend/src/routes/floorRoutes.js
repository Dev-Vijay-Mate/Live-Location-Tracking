/**
 * Floor Routes
 * REST API routes for direct floor resource operations.
 */

const express = require('express');
const floorController = require('../controllers/floorController');

const router = express.Router();

router.get('/:floorId', floorController.getFloor);
router.put('/:floorId', floorController.updateFloor);

module.exports = router;
