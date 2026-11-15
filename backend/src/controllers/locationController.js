/**
 * Location Controller
 * Handles incoming location ingestion packets and spatial retrieval requests.
 */

const locationService = require('../services/locationService');

async function ingestLocation(req, res, next) {
  try {
    const result = await locationService.ingestLocation(req.body);
    res.status(201).json({
      success: true,
      status: 'accepted',
      device_id: result.device_id,
      timestamp: result.timestamp,
      data: result,
      message: 'Location ingested and persisted successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getLatestLocations(req, res, next) {
  try {
    const { building_id, floor_id } = req.query;
    const locations = await locationService.getLatestLocations({ building_id, floor_id });
    const frontendLocations = locations.map((loc) => ({
      device_id: loc.device_id,
      building_id: loc.building?.id || 'BUILDING_001',
      floor_id: loc.floor?.id || 'GROUND',
      position: loc.position,
      timestamp: loc.timestamp,
    }));

    res.status(200).json({
      success: true,
      data: locations,
      locations: frontendLocations,
      count: locations.length,
    });
  } catch (error) {
    next(error);
  }
}

async function getDeviceLatestLocation(req, res, next) {
  try {
    const { deviceId } = req.params;
    const location = await locationService.getDeviceLatestLocation(deviceId);
    res.status(200).json({
      success: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
}

async function getDeviceLocationHistory(req, res, next) {
  try {
    const { deviceId } = req.params;
    const { from, to, limit, offset, sort } = req.query;
    const history = await locationService.getDeviceLocationHistory(deviceId, {
      from,
      to,
      limit,
      offset,
      sort,
    });
    const frontendHistory = history.map((h) => ({
      floor_id: h.floor?.id || 'GROUND',
      position: h.position,
      timestamp: h.timestamp,
    }));

    res.status(200).json({
      success: true,
      device_id: deviceId,
      data: history,
      history: frontendHistory,
      count: history.length,
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0,
    });
  } catch (error) {
    next(error);
  }
}

async function getBuildingCurrentLocations(req, res, next) {
  try {
    const { buildingId } = req.params;
    const locations = await locationService.getLatestLocations({ building_id: buildingId });
    res.status(200).json({
      success: true,
      data: locations,
      count: locations.length,
    });
  } catch (error) {
    next(error);
  }
}

async function getFloorCurrentLocations(req, res, next) {
  try {
    const { floorId } = req.params;
    const locations = await locationService.getLatestLocations({ floor_id: floorId });
    res.status(200).json({
      success: true,
      data: locations,
      count: locations.length,
    });
  } catch (error) {
    next(error);
  }
}

async function getDeviceMovementSummary(req, res, next) {
  try {
    const { deviceId } = req.params;
    const summary = await locationService.getDeviceMovementSummary(deviceId);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  ingestLocation,
  getLatestLocations,
  getDeviceLatestLocation,
  getDeviceLocationHistory,
  getBuildingCurrentLocations,
  getFloorCurrentLocations,
  getDeviceMovementSummary,
};
