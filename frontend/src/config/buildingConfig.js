/**
 * Building Configuration for NSG CQB 3D Indoor Tracking
 * 
 * Central configuration for building dimensions, floor elevations,
 * room partitions, and spatial coordinate boundaries.
 */

export const BUILDING_CONFIG = {
  id: 'DEMO_BUILDING_001',
  name: 'NSG Tactical Training Complex',
  dimensions: {
    width: 30,    // X axis (meters)
    depth: 20,    // Z axis (meters)
    floorHeight: 3.5, // Standard floor elevation delta (meters)
    wallHeight: 2.8,  // Clear internal wall height (meters)
    wallThickness: 0.2, // Structural wall thickness
    slabThickness: 0.25 // Concrete slab thickness
  },

  // Centralized Floor Elevation Mapping
  // Elevation is along Three.js Y-axis in meters
  floors: {
    BASEMENT: {
      id: 'BASEMENT',
      name: 'Basement Level',
      shortName: 'B1',
      elevation: -3.5,
      color: '#475569',
      wireframeColor: '#64748b',
      description: 'Underground parking, server room, and ventilation ducts'
    },
    GROUND: {
      id: 'GROUND',
      name: 'Ground Floor',
      shortName: 'GF',
      elevation: 0.0,
      color: '#334155',
      wireframeColor: '#0ea5e9',
      description: 'Main lobby, reception, perimeter security, and cafeteria'
    },
    FIRST: {
      id: 'FIRST',
      name: 'First Floor',
      shortName: '1F',
      elevation: 3.5,
      color: '#1e293b',
      wireframeColor: '#22d3ee',
      description: 'Administrative offices, conference suites, and briefing room'
    },
    SECOND: {
      id: 'SECOND',
      name: 'Second Floor',
      shortName: '2F',
      elevation: 7.0,
      color: '#0f172a',
      wireframeColor: '#38bdf8',
      description: 'Executive suites, server core, and rooftop access stairs'
    }
  },

  // Coordinate spatial boundaries in local meters
  // Centered at (0, 0)
  bounds: {
    minX: -14.5,
    maxX: 14.5,
    minZ: -9.5,
    maxZ: 9.5
  },

  // Schematic Room Layout for demo building
  rooms: [
    { id: 'ROOM_W_1', name: 'West Wing Section A', bounds: { minX: -14, maxX: -4, minZ: -9, maxZ: -1 } },
    { id: 'ROOM_W_2', name: 'West Wing Section B', bounds: { minX: -14, maxX: -4, minZ: 1, maxZ: 9 } },
    { id: 'ROOM_HALL', name: 'Central Tactical Corridor', bounds: { minX: -3.5, maxX: 3.5, minZ: -9, maxZ: 9 } },
    { id: 'ROOM_E_1', name: 'East Wing Section A', bounds: { minX: 4, maxX: 14, minZ: -9, maxZ: -1 } },
    { id: 'ROOM_E_2', name: 'East Wing Section B', bounds: { minX: 4, maxX: 14, minZ: 1, maxZ: 9 } }
  ]
};

export const ORDERED_FLOOR_IDS = ['BASEMENT', 'GROUND', 'FIRST', 'SECOND'];
