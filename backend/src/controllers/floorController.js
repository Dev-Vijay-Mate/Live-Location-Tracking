/**
 * Floor Controller
 * Handles HTTP requests for direct floor operations.
 */

const floorService = require('../services/floorService');

async function getFloor(req, res, next) {
  try {
    const { floorId } = req.params;
    const floor = await floorService.getFloorById(floorId);
    res.status(200).json({
      success: true,
      data: floor,
    });
  } catch (error) {
    next(error);
  }
}

async function updateFloor(req, res, next) {
  try {
    const { floorId } = req.params;
    const floor = await floorService.updateFloor(floorId, req.body);
    res.status(200).json({
      success: true,
      data: floor,
      message: 'Floor updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFloor,
  updateFloor,
};
