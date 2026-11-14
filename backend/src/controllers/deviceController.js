/**
 * Device Controller
 * Handles HTTP requests for device resources.
 */

const deviceService = require('../services/deviceService');
const deviceAssignmentService = require('../services/deviceAssignmentService');

async function getAllDevices(req, res, next) {
  try {
    const { admin_status, is_active, building_id } = req.query;
    const devices = await deviceService.listDevices({
      admin_status,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      building_id,
    });
    res.status(200).json({
      success: true,
      data: devices,
      count: devices.length,
    });
  } catch (error) {
    next(error);
  }
}

async function getDevice(req, res, next) {
  try {
    const { deviceId } = req.params;
    const device = await deviceService.getDeviceById(deviceId);
    res.status(200).json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
}

async function registerDevice(req, res, next) {
  try {
    const device = await deviceService.registerDevice(req.body);
    res.status(201).json({
      success: true,
      data: device,
      message: 'Device registered successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function updateDevice(req, res, next) {
  try {
    const { deviceId } = req.params;
    const device = await deviceService.updateDevice(deviceId, req.body);
    res.status(200).json({
      success: true,
      data: device,
      message: 'Device updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function setDeviceStatus(req, res, next) {
  try {
    const { deviceId } = req.params;
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'is_active boolean parameter is required', status: 400 },
      });
    }
    const device = await deviceService.setDeviceActiveStatus(deviceId, is_active);
    res.status(200).json({
      success: true,
      data: device,
      message: `Device ${device.is_active ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
}

async function setDeviceAdminStatus(req, res, next) {
  try {
    const { deviceId } = req.params;
    const { admin_status } = req.body;
    if (!admin_status) {
      return res.status(400).json({
        success: false,
        error: { message: 'admin_status parameter is required', status: 400 },
      });
    }
    const device = await deviceService.setDeviceAdminStatus(deviceId, admin_status);
    res.status(200).json({
      success: true,
      data: device,
      message: `Device admin status updated to ${device.admin_status}`,
    });
  } catch (error) {
    next(error);
  }
}

async function getDeviceConnectivity(req, res, next) {
  try {
    const { deviceId } = req.params;
    const device = await deviceService.getDeviceById(deviceId);
    res.status(200).json({
      success: true,
      data: {
        device_id: device.device_id,
        callsign: device.callsign,
        admin_status: device.admin_status,
        connectivity_status: device.connectivity_status,
        last_seen_at: device.last_seen_at,
        current_building_id: device.current_building_id,
        current_building_name: device.current_building_name,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getDeviceAssignments(req, res, next) {
  try {
    const { deviceId } = req.params;
    const assignments = await deviceAssignmentService.getAssignmentHistory(deviceId);
    res.status(200).json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (error) {
    next(error);
  }
}

async function assignDevice(req, res, next) {
  try {
    const { deviceId } = req.params;
    const { building_id, assigned_by, notes } = req.body;
    const assignment = await deviceAssignmentService.assignDeviceToBuilding({
      device_id: deviceId,
      building_id,
      assigned_by,
      notes,
    });
    res.status(200).json({
      success: true,
      data: assignment,
      message: `Device ${deviceId} assigned to building ${building_id} successfully`,
    });
  } catch (error) {
    next(error);
  }
}

async function unassignDevice(req, res, next) {
  try {
    const { deviceId } = req.params;
    const { notes } = req.body;
    const assignment = await deviceAssignmentService.unassignDevice(deviceId, { notes });
    res.status(200).json({
      success: true,
      data: assignment,
      message: `Device ${deviceId} unassigned successfully`,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllDevices,
  getDevice,
  registerDevice,
  updateDevice,
  setDeviceStatus,
  setDeviceAdminStatus,
  getDeviceConnectivity,
  getDeviceAssignments,
  assignDevice,
  unassignDevice,
};
