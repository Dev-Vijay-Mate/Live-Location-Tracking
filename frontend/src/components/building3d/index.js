/**
 * 3D Building & Location Visualization Module
 * Member 1 Deliverable — Plug-and-play Three.js / React Three Fiber module
 */

export { default as BuildingCanvas } from './BuildingCanvas';
export { default as BuildingModel } from './BuildingModel';
export {
  default as DeviceMarker,
  DeviceMarkers,
  SingleDeviceMarker,
  resolveDeviceStatus
} from './DeviceMarker';

export {
  BUILDING_BOUNDS,
  DIMENSIONS,
  FLOOR_CONFIGS,
  ORDERED_FLOOR_IDS,
  normalizeFloorId,
  getFloorElevation,
  getFloorConfig,
  clampCoordinates,
  mapPositionTo3D,
  resolveRoom
} from './buildingConfig';

export {
  INITIAL_MOCK_DEVICES,
  simulateMovementTick
} from './mockDevices';

export { default } from './BuildingCanvas';

