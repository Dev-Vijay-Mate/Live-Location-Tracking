/**
 * Mock Devices Dataset conforming to the Live Location Tracking Data Contract.
 * 
 * Data Contract Schema:
 * {
 *   "device_id": string,
 *   "building_id": string,
 *   "floor_id": "BASEMENT" | "FLOOR_00" | "FLOOR_01" | "FLOOR_02",
 *   "position": { "x": number, "z": number },
 *   "source": "SIMULATION" | "DEVICE",
 *   "timestamp": string (ISO 8601),
 *   "status"?: "online" | "stale" | "offline"
 * }
 */

export const INITIAL_MOCK_DEVICES = [
  {
    device_id: 'DEVICE_001',
    name: 'HIT Alpha-1 (Lead)',
    building_id: 'BUILDING_001',
    floor_id: 'FLOOR_01',
    position: {
      x: 12.5,
      z: 8.2
    },
    source: 'SIMULATION',
    status: 'online',
    timestamp: new Date().toISOString()
  },
  {
    device_id: 'DEVICE_002',
    name: 'HIT Alpha-2 (Breacher)',
    building_id: 'BUILDING_001',
    floor_id: 'FLOOR_00',
    position: {
      x: 5.5,
      z: 11.0
    },
    source: 'SIMULATION',
    status: 'online',
    timestamp: new Date().toISOString()
  },
  {
    device_id: 'DEVICE_003',
    name: 'HIT Bravo-1 (Overwatch)',
    building_id: 'BUILDING_001',
    floor_id: 'FLOOR_02',
    position: {
      x: 23.5,
      z: 10.5
    },
    source: 'SIMULATION',
    status: 'online',
    timestamp: new Date().toISOString()
  },
  {
    device_id: 'DEVICE_004',
    name: 'HIT Charlie-1 (Basement Support)',
    building_id: 'BUILDING_001',
    floor_id: 'BASEMENT',
    position: {
      x: 15.0,
      z: 6.4
    },
    source: 'SIMULATION',
    status: 'stale',
    timestamp: new Date(Date.now() - 45 * 1000).toISOString() // 45 seconds old (stale)
  },
  {
    device_id: 'DEVICE_005',
    name: 'HIT Charlie-2 (Reserve)',
    building_id: 'BUILDING_001',
    floor_id: 'FLOOR_00',
    position: {
      x: 25.0,
      z: 15.0
    },
    source: 'SIMULATION',
    status: 'offline',
    timestamp: new Date(Date.now() - 180 * 1000).toISOString() // 3 minutes old (offline)
  }
];

/**
 * Generates slightly randomized real-time coordinate nudges for testing
 * marker position interpolation (smooth gliding) in standalone preview mode.
 */
export function simulateMovementTick(devices) {
  return devices.map((dev) => {
    // Only animate active online devices
    if (dev.status === 'offline') return dev;

    const dx = (Math.random() - 0.5) * 1.2;
    const dz = (Math.random() - 0.5) * 1.2;

    const newX = Math.max(2, Math.min(28, dev.position.x + dx));
    const newZ = Math.max(2, Math.min(18, dev.position.z + dz));

    return {
      ...dev,
      position: {
        x: Number(newX.toFixed(2)),
        z: Number(newZ.toFixed(2))
      },
      timestamp: new Date().toISOString()
    };
  });
}

