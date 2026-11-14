/**
 * Device Assignment Service
 * Manages temporal deployments and reassignments of devices across operational buildings.
 */

const { query, getClient } = require('../db');
const { AppError } = require('../middleware/errorHandler');

/**
 * Assign or reassign a device to a building
 * Closes previous active assignment atomically in a transaction.
 */
async function assignDeviceToBuilding({
  device_id,
  building_id,
  assigned_by = 'SYSTEM',
  notes = null,
}) {
  if (!device_id) throw new AppError('device_id is required', 400);
  if (!building_id) throw new AppError('building_id is required', 400);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Check device existence and active status
    const devRes = await client.query('SELECT device_id, is_active FROM devices WHERE device_id = $1', [device_id]);
    if (devRes.rows.length === 0) {
      throw new AppError(`Device not found with ID: ${device_id}`, 404);
    }
    if (!devRes.rows[0].is_active) {
      throw new AppError(`Cannot assign deactivated device: ${device_id}`, 400);
    }

    // 2. Check building existence and active status
    const bRes = await client.query('SELECT building_id, is_active FROM buildings WHERE building_id = $1', [building_id]);
    if (bRes.rows.length === 0) {
      throw new AppError(`Building not found with ID: ${building_id}`, 404);
    }
    if (!bRes.rows[0].is_active) {
      throw new AppError(`Cannot assign to deactivated building: ${building_id}`, 400);
    }

    // 3. Check if device is already actively assigned to this exact building
    const currentActive = await client.query(
      'SELECT assignment_id, building_id FROM device_assignments WHERE device_id = $1 AND unassigned_at IS NULL',
      [device_id]
    );
    if (currentActive.rows.length > 0 && currentActive.rows[0].building_id === building_id) {
      await client.query('COMMIT');
      return getActiveAssignment(device_id);
    }

    // 4. Close any currently active assignment
    await client.query(
      'UPDATE device_assignments SET unassigned_at = CURRENT_TIMESTAMP WHERE device_id = $1 AND unassigned_at IS NULL',
      [device_id]
    );

    // 5. Create new active assignment
    const insertSql = `
      INSERT INTO device_assignments (device_id, building_id, assigned_at, unassigned_at, assigned_by, notes)
      VALUES ($1, $2, CURRENT_TIMESTAMP, NULL, $3, $4)
      RETURNING *;
    `;
    const newAssn = await client.query(insertSql, [device_id, building_id, assigned_by, notes]);

    await client.query('COMMIT');
    return newAssn.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Unassign/detach a device from its currently assigned building
 */
async function unassignDevice(deviceId, { unassigned_by = 'SYSTEM', notes = null } = {}) {
  const active = await getActiveAssignment(deviceId);
  if (!active) {
    throw new AppError(`Device ${deviceId} does not have an active assignment to unassign`, 400);
  }

  const sql = `
    UPDATE device_assignments
    SET unassigned_at = CURRENT_TIMESTAMP,
        notes = CASE WHEN $2::text IS NOT NULL THEN COALESCE(notes, '') || ' | ' || $2::text ELSE notes END
    WHERE device_id = $1 AND unassigned_at IS NULL
    RETURNING *;
  `;
  const result = await query(sql, [deviceId, notes]);
  return result.rows[0];
}

/**
 * Get active assignment for a device
 */
async function getActiveAssignment(deviceId) {
  const sql = `
    SELECT a.*, b.name AS building_name
    FROM device_assignments a
    JOIN buildings b ON a.building_id = b.building_id
    WHERE a.device_id = $1 AND a.unassigned_at IS NULL;
  `;
  const result = await query(sql, [deviceId]);
  return result.rows[0] || null;
}

/**
 * Retrieve the full chronological assignment history of a device
 */
async function getAssignmentHistory(deviceId) {
  // Check device exists
  const devCheck = await query('SELECT device_id FROM devices WHERE device_id = $1', [deviceId]);
  if (devCheck.rows.length === 0) {
    throw new AppError(`Device not found with ID: ${deviceId}`, 404);
  }

  const sql = `
    SELECT a.*, b.name AS building_name
    FROM device_assignments a
    JOIN buildings b ON a.building_id = b.building_id
    WHERE a.device_id = $1
    ORDER BY a.assigned_at DESC;
  `;
  const result = await query(sql, [deviceId]);
  return result.rows;
}

/**
 * List all devices currently actively assigned to a building
 */
async function listDevicesByBuilding(buildingId) {
  const bCheck = await query('SELECT building_id FROM buildings WHERE building_id = $1', [buildingId]);
  if (bCheck.rows.length === 0) {
    throw new AppError(`Building not found with ID: ${buildingId}`, 404);
  }

  const sql = `
    SELECT d.*, a.assigned_at, a.notes AS assignment_notes
    FROM devices d
    JOIN device_assignments a ON d.device_id = a.device_id AND a.unassigned_at IS NULL
    WHERE a.building_id = $1
    ORDER BY d.created_at ASC;
  `;
  const result = await query(sql, [buildingId]);
  return result.rows;
}

module.exports = {
  assignDeviceToBuilding,
  unassignDevice,
  getActiveAssignment,
  getAssignmentHistory,
  listDevicesByBuilding,
};
