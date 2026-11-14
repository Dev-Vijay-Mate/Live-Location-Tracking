/**
 * Coordinate Mapping Utility for NSG CQB 3D Indoor Tracking
 * 
 * Maps incoming sensor/simulated local coordinates (x, z) + floor_id
 * into Three.js 3D world space (X = horizontal, Y = elevation, Z = depth).
 */

import { BUILDING_CONFIG } from './buildingConfig';

/**
 * Returns the Y-elevation (meters) for a given floor_id.
 * Defaults to Ground Floor (0.0) if floor_id is unrecognized.
 * 
 * @param {string} floorId - Floor identifier ('BASEMENT', 'GROUND', 'FIRST', 'SECOND')
 * @returns {number} Y elevation in Three.js coordinates
 */
export function getFloorElevation(floorId) {
  if (!floorId) return 0.0;
  const floor = BUILDING_CONFIG.floors[floorId.toUpperCase()];
  return floor ? floor.elevation : 0.0;
}

/**
 * Clamps raw (x, z) coordinates within the physical building boundary walls.
 * 
 * @param {number} x - Horizontal position
 * @param {number} z - Depth position
 * @returns {{ x: number, z: number }} Clamped coordinates
 */
export function clampToBounds(x, z) {
  const { minX, maxX, minZ, maxZ } = BUILDING_CONFIG.bounds;
  return {
    x: Math.max(minX, Math.min(maxX, Number(x) || 0)),
    z: Math.max(minZ, Math.min(maxZ, Number(z) || 0))
  };
}

/**
 * Converts a raw location telemetry payload into a Three.js [x, y, z] vector.
 * 
 * Marker elevation is placed slightly above the floor slab (+0.4m)
 * so markers float crisply above the floor surface.
 * 
 * @param {{ x: number, z: number }} position - Horizontal 2D coordinates
 * @param {string} floorId - Floor identifier
 * @param {number} markerYOffset - Vertical offset above floor slab (default: 0.4m)
 * @returns {[number, number, number]} [x, y, z] in Three.js world space
 */
export function mapTo3DPosition(position, floorId, markerYOffset = 0.4) {
  if (!position) {
    return [0, getFloorElevation(floorId) + markerYOffset, 0];
  }

  const clamped = clampToBounds(position.x, position.z);
  const floorElevation = getFloorElevation(floorId);
  const y = floorElevation + markerYOffset;

  return [clamped.x, y, clamped.z];
}

/**
 * Resolves which room a given (x, z) position falls into.
 * 
 * @param {number} x
 * @param {number} z
 * @returns {string} Room name or 'Central Area'
 */
export function resolveRoomName(x, z) {
  for (const room of BUILDING_CONFIG.rooms) {
    if (
      x >= room.bounds.minX &&
      x <= room.bounds.maxX &&
      z >= room.bounds.minZ &&
      z <= room.bounds.maxZ
    ) {
      return room.name;
    }
  }
  return 'Tactical Zone';
}
