/**
 * Coordinate Mapping Utility for 3D Indoor Tracking
 * Bridges incoming telemetry to Three.js Y-up world coordinates.
 */

import {
  mapPositionTo3D,
  getFloorElevation,
  clampCoordinates,
  resolveRoom,
  normalizeFloorId
} from '../components/building3d/buildingConfig';

export {
  mapPositionTo3D,
  getFloorElevation,
  clampCoordinates,
  resolveRoom,
  normalizeFloorId
};

/**
 * Backwards-compatible coordinate clamp
 */
export function clampToBounds(x, z) {
  return clampCoordinates(x, z);
}

/**
 * Backwards-compatible mapTo3DPosition
 */
export function mapTo3DPosition(position, floorId, markerYOffset = 0.5) {
  return mapPositionTo3D(position, floorId, markerYOffset);
}

/**
 * Backwards-compatible resolveRoomName
 */
export function resolveRoomName(x, z, floorId = 'FLOOR_00') {
  return resolveRoom(x, z, floorId);
}
