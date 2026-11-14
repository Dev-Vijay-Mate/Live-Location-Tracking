/**
 * Building Controller
 * Handles HTTP requests for building resources.
 */

const buildingService = require('../services/buildingService');
const floorService = require('../services/floorService');
const deviceAssignmentService = require('../services/deviceAssignmentService');

async function getAllBuildings(req, res, next) {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const buildings = await buildingService.listBuildings({ includeInactive });
    res.status(200).json({
      success: true,
      data: buildings,
      count: buildings.length,
    });
  } catch (error) {
    next(error);
  }
}

async function getBuilding(req, res, next) {
  try {
    const { buildingId } = req.params;
    const building = await buildingService.getBuildingById(buildingId);
    res.status(200).json({
      success: true,
      data: building,
    });
  } catch (error) {
    next(error);
  }
}

async function createBuilding(req, res, next) {
  try {
    const building = await buildingService.createBuilding(req.body);
    res.status(201).json({
      success: true,
      data: building,
      message: 'Building created successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function updateBuilding(req, res, next) {
  try {
    const { buildingId } = req.params;
    const building = await buildingService.updateBuilding(buildingId, req.body);
    res.status(200).json({
      success: true,
      data: building,
      message: 'Building updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function setBuildingStatus(req, res, next) {
  try {
    const { buildingId } = req.params;
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'is_active boolean parameter is required', status: 400 },
      });
    }
    const building = await buildingService.setBuildingStatus(buildingId, is_active);
    res.status(200).json({
      success: true,
      data: building,
      message: `Building ${building.is_active ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
}

async function getBuildingFloors(req, res, next) {
  try {
    const { buildingId } = req.params;
    const includeInactive = req.query.include_inactive === 'true';
    const floors = await floorService.listFloorsByBuilding(buildingId, { includeInactive });
    res.status(200).json({
      success: true,
      data: floors,
      count: floors.length,
    });
  } catch (error) {
    next(error);
  }
}

async function createBuildingFloor(req, res, next) {
  try {
    const { buildingId } = req.params;
    const floor = await floorService.createFloor({
      ...req.body,
      building_id: buildingId,
    });
    res.status(201).json({
      success: true,
      data: floor,
      message: 'Floor created successfully in building',
    });
  } catch (error) {
    next(error);
  }
}

async function getBuildingDevices(req, res, next) {
  try {
    const { buildingId } = req.params;
    const devices = await deviceAssignmentService.listDevicesByBuilding(buildingId);
    res.status(200).json({
      success: true,
      data: devices,
      count: devices.length,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllBuildings,
  getBuilding,
  createBuilding,
  updateBuilding,
  setBuildingStatus,
  getBuildingFloors,
  createBuildingFloor,
  getBuildingDevices,
};
