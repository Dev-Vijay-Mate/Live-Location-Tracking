/**
 * Floor Service
 * Business logic and database operations for multi-level building floors.
 */

const { query } = require('../db');
const { AppError } = require('../middleware/errorHandler');

/**
 * List all floors for a given building, ordered by floor_number ASC
 */
async function listFloorsByBuilding(buildingId, { includeInactive = false } = {}) {
  // Verify building exists
  const buildingCheck = await query('SELECT building_id FROM buildings WHERE building_id = $1', [buildingId]);
  if (buildingCheck.rows.length === 0) {
    throw new AppError(`Building not found with ID: ${buildingId}`, 404);
  }

  const sql = includeInactive
    ? 'SELECT * FROM floors WHERE building_id = $1 ORDER BY floor_number ASC'
    : 'SELECT * FROM floors WHERE building_id = $1 AND is_active = TRUE ORDER BY floor_number ASC';
  const result = await query(sql, [buildingId]);
  return result.rows;
}

/**
 * Retrieve a single floor by floor_id
 */
async function getFloorById(floorId) {
  const result = await query('SELECT * FROM floors WHERE floor_id = $1', [floorId]);
  if (result.rows.length === 0) {
    throw new AppError(`Floor not found with ID: ${floorId}`, 404);
  }
  return result.rows[0];
}

/**
 * Create a new floor in a building
 */
async function createFloor({
  floor_id,
  building_id,
  floor_name,
  floor_number,
  elevation = 0.00,
  min_x = 0.00,
  max_x = 100.00,
  min_z = 0.00,
  max_z = 100.00,
  is_active = true,
}) {
  if (!floor_id || !floor_id.trim()) {
    throw new AppError('floor_id is required', 400);
  }
  if (!building_id || !building_id.trim()) {
    throw new AppError('building_id is required', 400);
  }
  if (!floor_name || !floor_name.trim()) {
    throw new AppError('floor_name is required', 400);
  }
  if (floor_number === undefined || Number.isNaN(parseInt(floor_number, 10))) {
    throw new AppError('Valid integer floor_number is required', 400);
  }

  const parsedMinX = parseFloat(min_x);
  const parsedMaxX = parseFloat(max_x);
  const parsedMinZ = parseFloat(min_z);
  const parsedMaxZ = parseFloat(max_z);
  const parsedElevation = parseFloat(elevation);

  if (Number.isNaN(parsedMinX) || Number.isNaN(parsedMaxX) || parsedMinX >= parsedMaxX) {
    throw new AppError(`Invalid X coordinate boundaries: min_x (${min_x}) must be strictly less than max_x (${max_x})`, 400);
  }
  if (Number.isNaN(parsedMinZ) || Number.isNaN(parsedMaxZ) || parsedMinZ >= parsedMaxZ) {
    throw new AppError(`Invalid Z coordinate boundaries: min_z (${min_z}) must be strictly less than max_z (${max_z})`, 400);
  }

  // Check building existence
  const bCheck = await query('SELECT building_id FROM buildings WHERE building_id = $1', [building_id.trim()]);
  if (bCheck.rows.length === 0) {
    throw new AppError(`Referenced building does not exist: ${building_id.trim()}`, 404);
  }

  // Check for duplicate floor_id
  const idCheck = await query('SELECT floor_id FROM floors WHERE floor_id = $1', [floor_id.trim()]);
  if (idCheck.rows.length > 0) {
    throw new AppError(`Floor already exists with ID: ${floor_id.trim()}`, 409);
  }

  // Check for duplicate floor_number in building
  const numCheck = await query(
    'SELECT floor_id FROM floors WHERE building_id = $1 AND floor_number = $2',
    [building_id.trim(), parseInt(floor_number, 10)]
  );
  if (numCheck.rows.length > 0) {
    throw new AppError(`Floor number ${floor_number} already exists in building ${building_id.trim()}`, 409);
  }

  const sql = `
    INSERT INTO floors (
      floor_id, building_id, floor_name, floor_number, elevation,
      min_x, max_x, min_z, max_z, is_active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *;
  `;

  const result = await query(sql, [
    floor_id.trim(),
    building_id.trim(),
    floor_name.trim(),
    parseInt(floor_number, 10),
    parsedElevation,
    parsedMinX,
    parsedMaxX,
    parsedMinZ,
    parsedMaxZ,
    Boolean(is_active),
  ]);

  return result.rows[0];
}

/**
 * Update floor configuration and boundaries
 */
async function updateFloor(floorId, data) {
  const current = await getFloorById(floorId);

  const floor_name = data.floor_name !== undefined ? data.floor_name.trim() : current.floor_name;
  const floor_number = data.floor_number !== undefined ? parseInt(data.floor_number, 10) : current.floor_number;
  const elevation = data.elevation !== undefined ? parseFloat(data.elevation) : parseFloat(current.elevation);
  const min_x = data.min_x !== undefined ? parseFloat(data.min_x) : parseFloat(current.min_x);
  const max_x = data.max_x !== undefined ? parseFloat(data.max_x) : parseFloat(current.max_x);
  const min_z = data.min_z !== undefined ? parseFloat(data.min_z) : parseFloat(current.min_z);
  const max_z = data.max_z !== undefined ? parseFloat(data.max_z) : parseFloat(current.max_z);
  const is_active = data.is_active !== undefined ? Boolean(data.is_active) : current.is_active;

  if (min_x >= max_x) {
    throw new AppError(`Invalid X boundaries: min_x (${min_x}) must be strictly less than max_x (${max_x})`, 400);
  }
  if (min_z >= max_z) {
    throw new AppError(`Invalid Z boundaries: min_z (${min_z}) must be strictly less than max_z (${max_z})`, 400);
  }

  const sql = `
    UPDATE floors
    SET floor_name = $1, floor_number = $2, elevation = $3,
        min_x = $4, max_x = $5, min_z = $6, max_z = $7,
        is_active = $8, updated_at = CURRENT_TIMESTAMP
    WHERE floor_id = $9
    RETURNING *;
  `;

  const result = await query(sql, [
    floor_name,
    floor_number,
    elevation,
    min_x,
    max_x,
    min_z,
    max_z,
    is_active,
    floorId,
  ]);

  return result.rows[0];
}

module.exports = {
  listFloorsByBuilding,
  getFloorById,
  createFloor,
  updateFloor,
};
