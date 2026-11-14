/**
 * Device Service
 * Business logic for device registration, lifecycle, administrative and connectivity state.
 */

const { query, getClient } = require('../db');
const { AppError } = require('../middleware/errorHandler');
const config = require('../config');

/**
 * Dynamically computes connectivity status based on last_seen_at and stale threshold
 * @param {Date|string|null} lastSeenAt
 * @param {string} adminStatus
 * @returns {'ONLINE'|'STALE'|'OFFLINE'|'MAINTENANCE'|'DECOMMISSIONED'|'UNKNOWN'}
 */
function calculateConnectivityStatus(lastSeenAt, adminStatus) {
  if (adminStatus === 'DECOMMISSIONED') return 'DECOMMISSIONED';
  if (adminStatus === 'MAINTENANCE') return 'MAINTENANCE';
  if (!lastSeenAt) return 'UNKNOWN';

  const diffSeconds = (Date.now() - new Date(lastSeenAt).getTime()) / 1000;
  const staleThreshold = config.deviceStaleTimeoutSeconds || 30;
  const offlineThreshold = staleThreshold * 4; // e.g. 120s

  if (diffSeconds <= staleThreshold) return 'ONLINE';
  if (diffSeconds <= offlineThreshold) return 'STALE';
  return 'OFFLINE';
}

/**
 * List devices with optional filters and dynamic connectivity status
 */
async function listDevices({ admin_status, is_active, building_id } = {}) {
  let sql = `
    SELECT d.*, 
           a.building_id AS current_building_id,
           b.name AS current_building_name,
           a.assigned_at AS current_assigned_at
    FROM devices d
    LEFT JOIN device_assignments a ON d.device_id = a.device_id AND a.unassigned_at IS NULL
    LEFT JOIN buildings b ON a.building_id = b.building_id
    WHERE 1=1
  `;
  const params = [];

  if (admin_status) {
    params.push(admin_status);
    sql += ` AND d.admin_status = $${params.length}`;
  }
  if (is_active !== undefined) {
    params.push(Boolean(is_active));
    sql += ` AND d.is_active = $${params.length}`;
  }
  if (building_id) {
    params.push(building_id);
    sql += ` AND a.building_id = $${params.length}`;
  }

  sql += ' ORDER BY d.created_at ASC';
  const result = await query(sql, params);

  return result.rows.map((device) => ({
    ...device,
    connectivity_status: calculateConnectivityStatus(device.last_seen_at, device.admin_status),
  }));
}

/**
 * Retrieve device by ID with current assignment and connectivity status
 */
async function getDeviceById(deviceId) {
  const sql = `
    SELECT d.*, 
           a.building_id AS current_building_id,
           b.name AS current_building_name,
           a.assigned_at AS current_assigned_at,
           cl.floor_id AS current_floor_id,
           cl.x_coordinate AS current_x,
           cl.z_coordinate AS current_z,
           cl.timestamp AS current_location_time
    FROM devices d
    LEFT JOIN device_assignments a ON d.device_id = a.device_id AND a.unassigned_at IS NULL
    LEFT JOIN buildings b ON a.building_id = b.building_id
    LEFT JOIN current_locations cl ON d.device_id = cl.device_id
    WHERE d.device_id = $1
  `;
  const result = await query(sql, [deviceId]);
  if (result.rows.length === 0) {
    throw new AppError(`Device not found with ID: ${deviceId}`, 404);
  }

  const device = result.rows[0];
  return {
    ...device,
    connectivity_status: calculateConnectivityStatus(device.last_seen_at, device.admin_status),
  };
}

/**
 * Register a new device, optionally creating an initial building assignment
 */
async function registerDevice({
  device_id,
  device_name,
  callsign = null,
  admin_status = 'STANDBY',
  is_active = true,
  initial_building_id = null,
  assigned_by = 'SYSTEM',
}) {
  if (!device_id || !device_id.trim()) {
    throw new AppError('device_id is required', 400);
  }
  if (!device_name || !device_name.trim()) {
    throw new AppError('device_name is required', 400);
  }

  const validStatuses = ['DEPLOYED', 'STANDBY', 'MAINTENANCE', 'DECOMMISSIONED'];
  if (!validStatuses.includes(admin_status)) {
    throw new AppError(`Invalid admin_status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  // Check duplicate ID
  const existing = await query('SELECT device_id FROM devices WHERE device_id = $1', [device_id.trim()]);
  if (existing.rows.length > 0) {
    throw new AppError(`Device already exists with ID: ${device_id.trim()}`, 409);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const insertSql = `
      INSERT INTO devices (device_id, device_name, callsign, admin_status, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const deviceRes = await client.query(insertSql, [
      device_id.trim(),
      device_name.trim(),
      callsign ? callsign.trim() : null,
      admin_status,
      Boolean(is_active),
    ]);
    const device = deviceRes.rows[0];

    // Create initial building assignment if requested
    if (initial_building_id) {
      const bCheck = await client.query('SELECT building_id FROM buildings WHERE building_id = $1', [initial_building_id]);
      if (bCheck.rows.length === 0) {
        throw new AppError(`Referenced building does not exist: ${initial_building_id}`, 404);
      }

      await client.query(`
        INSERT INTO device_assignments (device_id, building_id, assigned_at, assigned_by, notes)
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'Initial assignment on registration')
      `, [device.device_id, initial_building_id, assigned_by]);
    }

    await client.query('COMMIT');
    return getDeviceById(device.device_id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update device information
 */
async function updateDevice(deviceId, data) {
  const current = await getDeviceById(deviceId);

  const device_name = data.device_name !== undefined ? data.device_name.trim() : current.device_name;
  if (!device_name) {
    throw new AppError('device_name cannot be empty', 400);
  }
  const callsign = data.callsign !== undefined ? data.callsign : current.callsign;
  const admin_status = data.admin_status !== undefined ? data.admin_status : current.admin_status;
  const is_active = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;

  const validStatuses = ['DEPLOYED', 'STANDBY', 'MAINTENANCE', 'DECOMMISSIONED'];
  if (!validStatuses.includes(admin_status)) {
    throw new AppError(`Invalid admin_status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const sql = `
    UPDATE devices
    SET device_name = $1, callsign = $2, admin_status = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
    WHERE device_id = $5
    RETURNING *;
  `;
  const result = await query(sql, [device_name, callsign, admin_status, is_active, deviceId]);
  return getDeviceById(result.rows[0].device_id);
}

/**
 * Set active or inactive status
 */
async function setDeviceActiveStatus(deviceId, isActive) {
  await getDeviceById(deviceId);
  await query('UPDATE devices SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE device_id = $2', [
    Boolean(isActive),
    deviceId,
  ]);
  return getDeviceById(deviceId);
}

/**
 * Set administrative status
 */
async function setDeviceAdminStatus(deviceId, adminStatus) {
  await getDeviceById(deviceId);
  const validStatuses = ['DEPLOYED', 'STANDBY', 'MAINTENANCE', 'DECOMMISSIONED'];
  if (!validStatuses.includes(adminStatus)) {
    throw new AppError(`Invalid admin_status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }
  await query('UPDATE devices SET admin_status = $1, updated_at = CURRENT_TIMESTAMP WHERE device_id = $2', [
    adminStatus,
    deviceId,
  ]);
  return getDeviceById(deviceId);
}

module.exports = {
  calculateConnectivityStatus,
  listDevices,
  getDeviceById,
  registerDevice,
  updateDevice,
  setDeviceActiveStatus,
  setDeviceAdminStatus,
};
