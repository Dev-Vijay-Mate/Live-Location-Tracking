/**
 * Building Configuration & Coordinate System for Live Indoor Tracking
 * 
 * Strict Three.js Y-UP Convention:
 * - X-axis: Horizontal width (0 to 30 meters)
 * - Y-axis: Vertical elevation (-4m Basement, 0m Ground, +4m First, +8m Second)
 * - Z-axis: Depth / Length (0 to 20 meters)
 * 
 * Member 1 Deliverable — 3D Building & Spatial Engineering
 */

export const BUILDING_BOUNDS = {
  minX: 0,
  maxX: 30,
  minZ: 0,
  maxZ: 20,
  width: 30,
  depth: 20
};

export const DIMENSIONS = {
  width: 30,          // meters along X-axis
  depth: 20,          // meters along Z-axis
  floorHeight: 4.0,   // vertical spacing between floors
  wallHeight: 3.2,    // structural wall height
  wallThickness: 0.25,// wall thickness
  slabThickness: 0.35 // concrete slab thickness
};

export const FLOOR_CONFIGS = {
  BASEMENT: {
    id: 'BASEMENT',
    name: 'Basement Level',
    shortName: 'B1',
    elevation: -4.0,
    color: '#1a1f29',
    accentColor: '#d97706',
    gridColor: '#b45309',
    description: 'Underground server room, power grid & tactical staging',
    rooms: [
      { id: 'B_SERVER', name: 'Server Core & Power Grid', bounds: { minX: 1, maxX: 9, minZ: 1, maxZ: 19 } },
      { id: 'B_STAGING', name: 'Tactical Equipment Bay', bounds: { minX: 11, maxX: 19, minZ: 1, maxZ: 19 } },
      { id: 'B_HVAC', name: 'HVAC & Ventilation Tunnel', bounds: { minX: 21, maxX: 29, minZ: 1, maxZ: 19 } }
    ]
  },
  FLOOR_00: {
    id: 'FLOOR_00',
    aliases: ['GROUND', 'GF'],
    name: 'Ground Floor',
    shortName: 'GF',
    elevation: 0.0,
    color: '#151c28',
    accentColor: '#f59e0b',
    gridColor: '#f59e0b',
    description: 'Main entrance lobby, command post & perimeter security',
    rooms: [
      { id: 'G_LOBBY', name: 'Main Reception & Lobby', bounds: { minX: 1, maxX: 9, minZ: 1, maxZ: 19 } },
      { id: 'G_CORRIDOR', name: 'Central Tactical Corridor', bounds: { minX: 10, maxX: 20, minZ: 7, maxZ: 13 } },
      { id: 'G_BRIEFING', name: 'Command Briefing Room', bounds: { minX: 10, maxX: 20, minZ: 1, maxZ: 6 } },
      { id: 'G_ARMORY', name: 'Security Ops & Armory', bounds: { minX: 10, maxX: 20, minZ: 14, maxZ: 19 } },
      { id: 'G_LOGISTICS', name: 'East Wing Logistics', bounds: { minX: 21, maxX: 29, minZ: 1, maxZ: 19 } }
    ]
  },
  FLOOR_01: {
    id: 'FLOOR_01',
    aliases: ['FIRST', '1F'],
    name: 'First Floor',
    shortName: '1F',
    elevation: 4.0,
    color: '#111722',
    accentColor: '#fbbf24',
    gridColor: '#d97706',
    description: 'Cyber intelligence lab, operations center & comms hub',
    rooms: [
      { id: 'F1_CYBER', name: 'Cyber Intelligence Lab', bounds: { minX: 1, maxX: 9, minZ: 1, maxZ: 19 } },
      { id: 'F1_CORRIDOR', name: 'Central Ops Corridor', bounds: { minX: 10, maxX: 20, minZ: 7, maxZ: 13 } },
      { id: 'F1_CRISIS', name: 'Crisis Management Suite', bounds: { minX: 10, maxX: 20, minZ: 1, maxZ: 6 } },
      { id: 'F1_COMMS', name: 'Tactical Communications Hub', bounds: { minX: 10, maxX: 20, minZ: 14, maxZ: 19 } },
      { id: 'F1_ANALYSIS', name: 'Forensics & Data Analysis', bounds: { minX: 21, maxX: 29, minZ: 1, maxZ: 19 } }
    ]
  },
  FLOOR_02: {
    id: 'FLOOR_02',
    aliases: ['SECOND', '2F'],
    name: 'Second Floor',
    shortName: '2F',
    elevation: 8.0,
    color: '#0d131c',
    accentColor: '#f59e0b',
    gridColor: '#b45309',
    description: 'Executive command suite, overwatch & rooftop access',
    rooms: [
      { id: 'F2_COMMAND', name: 'Executive Command Suite', bounds: { minX: 1, maxX: 9, minZ: 1, maxZ: 19 } },
      { id: 'F2_STAGING', name: 'Rooftop Access & Staging', bounds: { minX: 11, maxX: 19, minZ: 1, maxZ: 19 } },
      { id: 'F2_OVERWATCH', name: 'Sniper Overwatch & Balcony', bounds: { minX: 21, maxX: 29, minZ: 1, maxZ: 19 } }
    ]
  }
};

export const ORDERED_FLOOR_IDS = ['BASEMENT', 'FLOOR_00', 'FLOOR_01', 'FLOOR_02'];

/**
 * Normalizes any floor string (e.g. 'GROUND', 'GF', 'FLOOR_00', '1F', 'FIRST')
 * to standard canonical floor ID ('BASEMENT', 'FLOOR_00', 'FLOOR_01', 'FLOOR_02').
 */
export function normalizeFloorId(rawFloorId) {
  if (!rawFloorId) return 'FLOOR_00';
  const upper = String(rawFloorId).trim().toUpperCase();

  if (FLOOR_CONFIGS[upper]) return upper;

  for (const [key, config] of Object.entries(FLOOR_CONFIGS)) {
    if (config.aliases && config.aliases.includes(upper)) {
      return key;
    }
  }

  // Fallback pattern matching
  if (upper.includes('BASE') || upper === 'B1') return 'BASEMENT';
  if (upper.includes('GROUND') || upper === 'GF' || upper === '0') return 'FLOOR_00';
  if (upper.includes('FIRST') || upper === '1F' || upper === '1') return 'FLOOR_01';
  if (upper.includes('SECOND') || upper === '2F' || upper === '2') return 'FLOOR_02';

  return 'FLOOR_00';
}

/**
 * Returns exact Three.js Y-elevation (meters) for a given floor ID.
 * BASEMENT = -4.0, FLOOR_00 = 0.0, FLOOR_01 = 4.0, FLOOR_02 = 8.0
 */
export function getFloorElevation(floorId) {
  const canonicalId = normalizeFloorId(floorId);
  return FLOOR_CONFIGS[canonicalId]?.elevation ?? 0.0;
}

/**
 * Returns floor configuration object.
 */
export function getFloorConfig(floorId) {
  const canonicalId = normalizeFloorId(floorId);
  return FLOOR_CONFIGS[canonicalId] || FLOOR_CONFIGS.FLOOR_00;
}

/**
 * Clamps coordinates strictly within building physical footprint.
 */
export function clampCoordinates(x, z) {
  let validX = Number.isFinite(Number(x)) ? Number(x) : BUILDING_BOUNDS.width / 2;
  let validZ = Number.isFinite(Number(z)) ? Number(z) : BUILDING_BOUNDS.depth / 2;

  // Support both centered origin [-15, 15] and absolute [0, 30] coordinate frames
  if (validX < 0) {
    validX += BUILDING_BOUNDS.width / 2;
  }
  if (validZ < 0) {
    validZ += BUILDING_BOUNDS.depth / 2;
  }

  return {
    x: Math.max(BUILDING_BOUNDS.minX, Math.min(BUILDING_BOUNDS.maxX, validX)),
    z: Math.max(BUILDING_BOUNDS.minZ, Math.min(BUILDING_BOUNDS.maxZ, validZ))
  };
}

/**
 * Maps incoming telemetry (position {x, z} + floor_id) to 3D Three.js Vector [X, Y, Z].
 * Includes vertical clearance offset so markers float visibly above floor surface.
 */
export function mapPositionTo3D(position, floorId, verticalOffset = 0.5) {
  const posX = position?.x ?? BUILDING_BOUNDS.width / 2;
  const posZ = position?.z ?? BUILDING_BOUNDS.depth / 2;
  const clamped = clampCoordinates(posX, posZ);
  const elevation = getFloorElevation(floorId);

  return [clamped.x, elevation + verticalOffset, clamped.z];
}

/**
 * Resolves which room contains the given (x, z) coordinates on a specific floor.
 */
export function resolveRoom(x, z, floorId) {
  const config = getFloorConfig(floorId);
  if (!config || !config.rooms) return 'Common Area';

  for (const room of config.rooms) {
    if (
      x >= room.bounds.minX &&
      x <= room.bounds.maxX &&
      z >= room.bounds.minZ &&
      z <= room.bounds.maxZ
    ) {
      return room.name;
    }
  }

  return 'Central Corridor';
}

