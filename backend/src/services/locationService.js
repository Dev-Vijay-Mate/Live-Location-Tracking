/**
 * Location Service
 * Core location ingestion pipeline, validation, transactional persistence,
 * and high-performance spatial query retrievals.
 */

const { query, getClient } = require('../db');
const { AppError } = require('../middleware/errorHandler');

// Registered listeners for post-commit location broadcasts (e.g. WebSocket broadcaster)
const broadcastListeners = new Set();

/**
 * Register a callback to receive validated location updates after successful DB commit
 * @param {Function} listener - (locationPacket) => void
 */
function onLocationPersisted(listener) {
  broadcastListeners.add(listener);
}

/**
 * Unregister a broadcast listener
 */
function removeLocationListener(listener) {
  broadcastListeners.delete(listener);
}

/**
 * Ingest and validate a location update packet
 * Strictly adheres to the shared integration contract:
 * {
 *   "device_id": "DEVICE_001",
 *   "building_id": "BUILDING_001",
 *   "floor_id": "FLOOR_01",
 *   "position": { "x": 12.5, "z": 8.2 },
 *   "source": "SIMULATION",
 *   "timestamp": "2026-11-13T10:30:00Z"
 * }
 */
async function ingestLocation(packet) {
  // 1. Structure validation
  if (!packet || typeof packet !== 'object') {
    throw new AppError('Location payload must be a JSON object', 400);
  }

  const { device_id, building_id, floor_id, position, source = 'SIMULATION', timestamp } = packet;

  if (!device_id || typeof device_id !== 'string') {
    throw new AppError('device_id is required and must be a string', 400);
  }
  if (!building_id || typeof building_id !== 'string') {
    throw new AppError('building_id is required and must be a string', 400);
  }
  if (!floor_id || typeof floor_id !== 'string') {
    throw new AppError('floor_id is required and must be a string', 400);
  }
  if (!position || typeof position !== 'object' || position.x === undefined || position.z === undefined) {
    throw new AppError('position object with numeric x and z coordinates is required', 400);
  }

  const posX = parseFloat(position.x);
  const posZ = parseFloat(position.z);
  if (Number.isNaN(posX) || Number.isNaN(posZ)) {
    throw new AppError('position coordinates x and z must be valid numbers', 400);
  }

  if (!timestamp) {
    throw new AppError('timestamp in ISO 8601 format is required', 400);
  }
  const observationTime = new Date(timestamp);
  if (Number.isNaN(observationTime.getTime())) {
    throw new AppError(`Invalid ISO 8601 timestamp format: ${timestamp}`, 400);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 2. Validate device existence and active status
    const devRes = await client.query(
      'SELECT device_id, admin_status, is_active FROM devices WHERE device_id = $1',
      [device_id]
    );
    if (devRes.rows.length === 0) {
      throw new AppError(`Unrecognized device_id: ${device_id}`, 404);
    }
    const device = devRes.rows[0];
    if (!device.is_active || device.admin_status === 'DECOMMISSIONED') {
      throw new AppError(`Device ${device_id} is inactive or decommissioned`, 400);
    }

    // 3. Validate assignment: Device must have an active assignment covering this timestamp
    const assnRes = await client.query(
      `SELECT assignment_id FROM device_assignments
       WHERE device_id = $1 AND building_id = $2
         AND assigned_at <= $3
         AND (unassigned_at IS NULL OR unassigned_at >= $3)`,
      [device_id, building_id, observationTime]
    );
    if (assnRes.rows.length === 0) {
      throw new AppError(
        `Device ${device_id} was not assigned to building ${building_id} at timestamp ${observationTime.toISOString()}`,
        400
      );
    }

    // 4. Insert into location_history (database trigger trg_validate_location_history will validate bounds & timestamp)
    const historySql = `
      INSERT INTO location_history (
        device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING location_id, timestamp, created_at;
    `;
    const histRes = await client.query(historySql, [
      device_id,
      building_id,
      floor_id,
      posX,
      posZ,
      source,
      observationTime,
    ]);

    // 5. Upsert into current_locations with out-of-order write protection
    const currentSql = `
      INSERT INTO current_locations (
        device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (device_id) DO UPDATE SET
        building_id = EXCLUDED.building_id,
        floor_id = EXCLUDED.floor_id,
        x_coordinate = EXCLUDED.x_coordinate,
        z_coordinate = EXCLUDED.z_coordinate,
        source = EXCLUDED.source,
        timestamp = EXCLUDED.timestamp,
        updated_at = CURRENT_TIMESTAMP
      WHERE EXCLUDED.timestamp > current_locations.timestamp
      RETURNING *;
    `;
    const currentRes = await client.query(currentSql, [
      device_id,
      building_id,
      floor_id,
      posX,
      posZ,
      source,
      observationTime,
    ]);

    const isCurrentUpdated = currentRes.rows.length > 0;

    // 6. Update device last_seen_at
    await client.query(
      `UPDATE devices
       SET last_seen_at = GREATEST(COALESCE(last_seen_at, $2), $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE device_id = $1`,
      [device_id, observationTime]
    );

    await client.query('COMMIT');

    // 7. Prepared broadcast payload matching contract
    const broadcastPayload = {
      device_id,
      building_id,
      floor_id,
      position: {
        x: posX,
        z: posZ,
      },
      source,
      timestamp: observationTime.toISOString(),
      location_id: histRes.rows[0].location_id,
      is_current_position: isCurrentUpdated,
    };

    // 8. Invoke post-commit listeners (WebSocket broadcast)
    for (const listener of broadcastListeners) {
      try {
        listener(broadcastPayload);
      } catch (err) {
        console.error('[BROADCAST LISTENER ERROR]', err.message);
      }
    }

    return broadcastPayload;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieve latest positions for all devices, optionally filtered by building or floor
 */
async function getLatestLocations({ building_id, floor_id } = {}) {
  let sql = `
    SELECT cl.device_id,
           d.device_name,
           d.callsign,
           d.admin_status,
           d.last_seen_at,
           cl.building_id,
           b.name AS building_name,
           cl.floor_id,
           f.floor_name,
           f.floor_number,
           f.elevation,
           cl.x_coordinate AS x,
           cl.z_coordinate AS z,
           cl.source,
           cl.timestamp,
           cl.updated_at
    FROM current_locations cl
    JOIN devices d ON cl.device_id = d.device_id
    JOIN buildings b ON cl.building_id = b.building_id
    JOIN floors f ON cl.floor_id = f.floor_id
    WHERE 1=1
  `;
  const params = [];

  if (building_id) {
    params.push(building_id);
    sql += ` AND cl.building_id = $${params.length}`;
  }
  if (floor_id) {
    params.push(floor_id);
    sql += ` AND cl.floor_id = $${params.length}`;
  }

  sql += ' ORDER BY cl.timestamp DESC;';
  const result = await query(sql, params);

  return result.rows.map((row) => ({
    device_id: row.device_id,
    device_name: row.device_name,
    callsign: row.callsign,
    admin_status: row.admin_status,
    last_seen_at: row.last_seen_at,
    building: {
      id: row.building_id,
      name: row.building_name,
    },
    floor: {
      id: row.floor_id,
      name: row.floor_name,
      number: row.floor_number,
      elevation: parseFloat(row.elevation),
    },
    position: {
      x: parseFloat(row.x),
      z: parseFloat(row.z),
    },
    source: row.source,
    timestamp: row.timestamp,
  }));
}

/**
 * Retrieve current position of a specific device
 */
async function getDeviceLatestLocation(deviceId) {
  const sql = `
    SELECT cl.device_id,
           d.device_name,
           d.callsign,
           d.admin_status,
           d.last_seen_at,
           cl.building_id,
           b.name AS building_name,
           cl.floor_id,
           f.floor_name,
           f.floor_number,
           f.elevation,
           cl.x_coordinate AS x,
           cl.z_coordinate AS z,
           cl.source,
           cl.timestamp
    FROM current_locations cl
    JOIN devices d ON cl.device_id = d.device_id
    JOIN buildings b ON cl.building_id = b.building_id
    JOIN floors f ON cl.floor_id = f.floor_id
    WHERE cl.device_id = $1;
  `;
  const result = await query(sql, [deviceId]);
  if (result.rows.length === 0) {
    throw new AppError(`No current location recorded for device: ${deviceId}`, 404);
  }
  const row = result.rows[0];
  return {
    device_id: row.device_id,
    device_name: row.device_name,
    callsign: row.callsign,
    admin_status: row.admin_status,
    last_seen_at: row.last_seen_at,
    building: {
      id: row.building_id,
      name: row.building_name,
    },
    floor: {
      id: row.floor_id,
      name: row.floor_name,
      number: row.floor_number,
      elevation: parseFloat(row.elevation),
    },
    position: {
      x: parseFloat(row.x),
      z: parseFloat(row.z),
    },
    source: row.source,
    timestamp: row.timestamp,
  };
}

/**
 * Retrieve historical trail of a device with pagination and time bounds
 */
async function getDeviceLocationHistory(deviceId, {
  from = null,
  to = null,
  limit = 100,
  offset = 0,
  sort = 'DESC',
} = {}) {
  // Check device exists
  const dCheck = await query('SELECT device_id FROM devices WHERE device_id = $1', [deviceId]);
  if (dCheck.rows.length === 0) {
    throw new AppError(`Device not found with ID: ${deviceId}`, 404);
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const sortDirection = sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let sql = `
    SELECT h.location_id,
           h.device_id,
           h.building_id,
           b.name AS building_name,
           h.floor_id,
           f.floor_name,
           f.floor_number,
           f.elevation,
           h.x_coordinate AS x,
           h.z_coordinate AS z,
           h.source,
           h.timestamp,
           h.created_at
    FROM location_history h
    JOIN buildings b ON h.building_id = b.building_id
    JOIN floors f ON h.floor_id = f.floor_id
    WHERE h.device_id = $1
  `;
  const params = [deviceId];

  if (from) {
    params.push(new Date(from));
    sql += ` AND h.timestamp >= $${params.length}`;
  }
  if (to) {
    params.push(new Date(to));
    sql += ` AND h.timestamp <= $${params.length}`;
  }

  sql += ` ORDER BY h.timestamp ${sortDirection} LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
  params.push(parsedLimit, parsedOffset);

  const result = await query(sql, params);

  return result.rows.map((row) => ({
    location_id: row.location_id,
    device_id: row.device_id,
    building: {
      id: row.building_id,
      name: row.building_name,
    },
    floor: {
      id: row.floor_id,
      name: row.floor_name,
      number: row.floor_number,
      elevation: parseFloat(row.elevation),
    },
    position: {
      x: parseFloat(row.x),
      z: parseFloat(row.z),
    },
    source: row.source,
    timestamp: row.timestamp,
    recorded_at: row.created_at,
  }));
}

/**
 * Retrieve movement summary metrics for a device
 */
async function getDeviceMovementSummary(deviceId) {
  const dCheck = await query('SELECT device_id, callsign FROM devices WHERE device_id = $1', [deviceId]);
  if (dCheck.rows.length === 0) {
    throw new AppError(`Device not found with ID: ${deviceId}`, 404);
  }

  const sql = `
    SELECT COUNT(*) AS total_points,
           MIN(timestamp) AS first_observed,
           MAX(timestamp) AS last_observed,
           MIN(x_coordinate) AS min_x,
           MAX(x_coordinate) AS max_x,
           MIN(z_coordinate) AS min_z,
           MAX(z_coordinate) AS max_z,
           COUNT(DISTINCT floor_id) AS floors_visited
    FROM location_history
    WHERE device_id = $1;
  `;
  const result = await query(sql, [deviceId]);
  const row = result.rows[0];

  return {
    device_id: deviceId,
    callsign: dCheck.rows[0].callsign,
    total_locations_recorded: parseInt(row.total_points, 10),
    first_observed_at: row.first_observed,
    last_observed_at: row.last_observed,
    floors_visited_count: parseInt(row.floors_visited, 10),
    bounding_box: row.min_x !== null ? {
      min_x: parseFloat(row.min_x),
      max_x: parseFloat(row.max_x),
      min_z: parseFloat(row.min_z),
      max_z: parseFloat(row.max_z),
    } : null,
  };
}

module.exports = {
  onLocationPersisted,
  removeLocationListener,
  ingestLocation,
  getLatestLocations,
  getDeviceLatestLocation,
  getDeviceLocationHistory,
  getDeviceMovementSummary,
};
