/**
 * Building Service
 * Business logic and database operations for buildings.
 */

const { query } = require('../db');
const { AppError } = require('../middleware/errorHandler');

/**
 * List all buildings, optionally including inactive ones
 */
async function listBuildings({ includeInactive = false } = {}) {
  const sql = includeInactive
    ? 'SELECT * FROM buildings ORDER BY name ASC'
    : 'SELECT * FROM buildings WHERE is_active = TRUE ORDER BY name ASC';
  const result = await query(sql);
  return result.rows;
}

/**
 * Retrieve a single building by ID
 */
async function getBuildingById(buildingId) {
  const result = await query('SELECT * FROM buildings WHERE building_id = $1', [buildingId]);
  if (result.rows.length === 0) {
    throw new AppError(`Building not found with ID: ${buildingId}`, 404);
  }
  return result.rows[0];
}

/**
 * Create a new building
 */
async function createBuilding({ building_id, name, description = null, is_active = true }) {
  if (!building_id || !building_id.trim()) {
    throw new AppError('building_id is required', 400);
  }
  if (!name || !name.trim()) {
    throw new AppError('name is required', 400);
  }

  // Check for duplicate ID
  const existing = await query('SELECT building_id FROM buildings WHERE building_id = $1', [building_id.trim()]);
  if (existing.rows.length > 0) {
    throw new AppError(`Building already exists with ID: ${building_id.trim()}`, 409);
  }

  const sql = `
    INSERT INTO buildings (building_id, name, description, is_active, created_at, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *;
  `;
  const result = await query(sql, [building_id.trim(), name.trim(), description, Boolean(is_active)]);
  return result.rows[0];
}

/**
 * Update building details
 */
async function updateBuilding(buildingId, { name, description, is_active }) {
  const current = await getBuildingById(buildingId);

  const updatedName = name !== undefined ? name.trim() : current.name;
  if (!updatedName) {
    throw new AppError('Building name cannot be empty', 400);
  }
  const updatedDesc = description !== undefined ? description : current.description;
  const updatedActive = is_active !== undefined ? Boolean(is_active) : current.is_active;

  const sql = `
    UPDATE buildings
    SET name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
    WHERE building_id = $4
    RETURNING *;
  `;
  const result = await query(sql, [updatedName, updatedDesc, updatedActive, buildingId]);
  return result.rows[0];
}

/**
 * Activate or deactivate a building
 */
async function setBuildingStatus(buildingId, isActive) {
  await getBuildingById(buildingId);
  const sql = `
    UPDATE buildings
    SET is_active = $1, updated_at = CURRENT_TIMESTAMP
    WHERE building_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [Boolean(isActive), buildingId]);
  return result.rows[0];
}

module.exports = {
  listBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  setBuildingStatus,
};
