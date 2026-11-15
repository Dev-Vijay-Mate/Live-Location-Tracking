/**
 * Legacy configuration bridge forwarding to the unified 3D building configuration.
 * Maintained for backwards compatibility across existing frontend imports.
 */

export * from '../components/building3d/buildingConfig';
import {
  DIMENSIONS,
  FLOOR_CONFIGS,
  BUILDING_BOUNDS,
  ORDERED_FLOOR_IDS as NEW_ORDERED_IDS,
  getFloorElevation as newGetFloorElevation
} from '../components/building3d/buildingConfig';

export const BUILDING_CONFIG = {
  id: 'DEMO_BUILDING_001',
  name: 'NSG Tactical Training Complex',
  dimensions: {
    width: DIMENSIONS.width,
    depth: DIMENSIONS.depth,
    floorHeight: DIMENSIONS.floorHeight,
    wallHeight: DIMENSIONS.wallHeight,
    wallThickness: DIMENSIONS.wallThickness,
    slabThickness: DIMENSIONS.slabThickness
  },
  floors: {
    BASEMENT: FLOOR_CONFIGS.BASEMENT,
    GROUND: FLOOR_CONFIGS.FLOOR_00,
    FIRST: FLOOR_CONFIGS.FLOOR_01,
    SECOND: FLOOR_CONFIGS.FLOOR_02,
    FLOOR_00: FLOOR_CONFIGS.FLOOR_00,
    FLOOR_01: FLOOR_CONFIGS.FLOOR_01,
    FLOOR_02: FLOOR_CONFIGS.FLOOR_02
  },
  bounds: {
    minX: BUILDING_BOUNDS.minX,
    maxX: BUILDING_BOUNDS.maxX,
    minZ: BUILDING_BOUNDS.minZ,
    maxZ: BUILDING_BOUNDS.maxZ
  }
};

export const ORDERED_FLOOR_IDS = NEW_ORDERED_IDS;
