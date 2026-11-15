/**
 * Synthetic Location Simulator (Phase 11)
 * Simulates realistic personnel movement within multi-storey buildings.
 * Produces smooth 2D/3D kinematic movement, enforces floor boundaries,
 * handles floor transitions, and streams telemetry to the location ingestion endpoint.
 */

const config = require('../src/config');

class LocationSimulator {
  /**
   * @param {object} [options]
   * @param {string} [options.apiBaseUrl] - Base URL for REST API (e.g. http://localhost:5001/api)
   * @param {string} [options.buildingId] - Target building identifier
   * @param {string[]} [options.deviceIds] - Array of device IDs to simulate
   * @param {number} [options.updateIntervalMs] - Interval between movement ticks in milliseconds
   * @param {number} [options.speed] - Max movement distance per tick in meters
   * @param {number} [options.floorChangeProbability] - Probability of floor transition per tick (0 to 1)
   * @param {Function} [options.logger] - Logger function
   */
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || process.env.API_BASE_URL || `http://localhost:${config.port}/api`;
    this.buildingId = options.buildingId || process.env.SIMULATOR_BUILDING_ID || 'BUILDING_001';
    this.deviceIds = options.deviceIds || (process.env.SIMULATOR_DEVICES
      ? process.env.SIMULATOR_DEVICES.split(',').map((s) => s.trim())
      : ['DEVICE_001', 'DEVICE_002', 'DEVICE_003', 'DEVICE_004']);
    this.updateIntervalMs = options.updateIntervalMs || parseInt(process.env.SIMULATOR_INTERVAL_MS, 10) || 2000;
    this.speed = options.speed || 1.5; // meters per tick
    this.floorChangeProbability = options.floorChangeProbability !== undefined ? options.floorChangeProbability : 0.05;
    this.logger = options.logger || console.log;

    this.floors = [];
    this.deviceStates = new Map();
    this.timer = null;
    this.isRunning = false;
    this.stats = {
      totalTicks: 0,
      totalPacketsSent: 0,
      totalSuccess: 0,
      totalFailures: 0,
      startTime: null,
    };
  }

  /**
   * Initialize simulator state: fetch floor geometry and set initial device positions
   */
  async init() {
    this.floors = await this.fetchBuildingFloors();
    if (this.floors.length === 0) {
      throw new Error(`No active floors discovered for building ${this.buildingId}`);
    }

    // Sort floors by elevation ascending
    this.floors.sort((a, b) => parseFloat(a.elevation) - parseFloat(b.elevation));

    // Initialize state for each device
    for (let i = 0; i < this.deviceIds.length; i++) {
      const deviceId = this.deviceIds[i];
      // Distribute devices across available floors initially
      const floor = this.floors[i % this.floors.length];
      const minX = parseFloat(floor.min_x);
      const maxX = parseFloat(floor.max_x);
      const minZ = parseFloat(floor.min_z);
      const maxZ = parseFloat(floor.max_z);

      // Place within safe boundary margin (2 meters away from boundary walls)
      const marginX = Math.max((maxX - minX) * 0.1, 1.0);
      const marginZ = Math.max((maxZ - minZ) * 0.1, 1.0);
      const startX = minX + marginX + Math.random() * (maxX - minX - 2 * marginX);
      const startZ = minZ + marginZ + Math.random() * (maxZ - minZ - 2 * marginZ);

      // Random initial direction vector
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * (this.speed * 0.8);
      const vz = Math.sin(angle) * (this.speed * 0.8);

      this.deviceStates.set(deviceId, {
        deviceId,
        floorId: floor.floor_id,
        floorNumber: floor.floor_number,
        x: Math.round(startX * 100) / 100,
        z: Math.round(startZ * 100) / 100,
        vx,
        vz,
      });
    }

    return this.deviceStates;
  }

  /**
   * Fetch floor boundaries from the REST API
   * Falls back to tactical default boundaries if the API endpoint is unavailable during offline setup
   */
  async fetchBuildingFloors() {
    try {
      const res = await fetch(`${this.apiBaseUrl}/buildings/${this.buildingId}/floors`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch (err) {
      this.logger(`[SIMULATOR WARN] Failed to fetch floors from API (${err.message}). Using fallback geometry.`);
    }

    // Fallback standard NSG HQ building floor layout
    return [
      { floor_id: 'FLOOR_B1', floor_name: 'Basement - Tactical Armory', floor_number: -1, elevation: -3.5, min_x: 0, max_x: 50, min_z: 0, max_z: 50 },
      { floor_id: 'FLOOR_00', floor_name: 'Ground Floor - Main Lobby', floor_number: 0, elevation: 0.0, min_x: 0, max_x: 50, min_z: 0, max_z: 50 },
      { floor_id: 'FLOOR_01', floor_name: 'First Floor - Command Center', floor_number: 1, elevation: 3.5, min_x: 0, max_x: 50, min_z: 0, max_z: 50 },
      { floor_id: 'FLOOR_02', floor_name: 'Second Floor - Briefing Rooms', floor_number: 2, elevation: 7.0, min_x: 0, max_x: 50, min_z: 0, max_z: 50 },
      { floor_id: 'FLOOR_ROOF', floor_name: 'Rooftop - Helipad & Extraction', floor_number: 3, elevation: 10.5, min_x: 0, max_x: 50, min_z: 0, max_z: 50 },
    ];
  }

  /**
   * Advance simulation by one tick and return generated location packets
   * @returns {Array<object>} Packets matching the shared contract
   */
  step() {
    const packets = [];
    const nowIso = new Date().toISOString();

    for (const [deviceId, state] of this.deviceStates.entries()) {
      let currentFloor = this.floors.find((f) => f.floor_id === state.floorId);
      if (!currentFloor) {
        currentFloor = this.floors[0];
        state.floorId = currentFloor.floor_id;
      }

      // 1. Smooth directional steering noise (random acceleration)
      const noiseAngle = (Math.random() - 0.5) * 0.6; // +/- ~17 degrees
      const cosN = Math.cos(noiseAngle);
      const sinN = Math.sin(noiseAngle);
      const newVx = state.vx * cosN - state.vz * sinN;
      const newVz = state.vx * sinN + state.vz * cosN;

      // Maintain configured speed magnitude
      const currentSpeed = Math.sqrt(newVx * newVx + newVz * newVz) || 1.0;
      const desiredSpeed = this.speed * (0.7 + Math.random() * 0.6); // slight speed variation
      state.vx = (newVx / currentSpeed) * desiredSpeed;
      state.vz = (newVz / currentSpeed) * desiredSpeed;

      // 2. Candidate position update
      let candidateX = state.x + state.vx;
      let candidateZ = state.z + state.vz;

      // 3. Boundary collision check with elastic bounce
      const minX = parseFloat(currentFloor.min_x);
      const maxX = parseFloat(currentFloor.max_x);
      const minZ = parseFloat(currentFloor.min_z);
      const maxZ = parseFloat(currentFloor.max_z);
      const wallBuffer = 0.5; // meters buffer from boundary

      if (candidateX <= minX + wallBuffer) {
        candidateX = minX + wallBuffer;
        state.vx = Math.abs(state.vx); // bounce east
      } else if (candidateX >= maxX - wallBuffer) {
        candidateX = maxX - wallBuffer;
        state.vx = -Math.abs(state.vx); // bounce west
      }

      if (candidateZ <= minZ + wallBuffer) {
        candidateZ = minZ + wallBuffer;
        state.vz = Math.abs(state.vz); // bounce south
      } else if (candidateZ >= maxZ - wallBuffer) {
        candidateZ = maxZ - wallBuffer;
        state.vz = -Math.abs(state.vz); // bounce north
      }

      state.x = Math.round(candidateX * 100) / 100;
      state.z = Math.round(candidateZ * 100) / 100;

      // 4. Floor transition simulation (stairwell / elevator transition)
      // When near building center and probability check passes, transition up or down
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const distFromCenter = Math.sqrt((state.x - centerX) ** 2 + (state.z - centerZ) ** 2);
      const coreThreshold = (maxX - minX) * 0.35;

      if (distFromCenter < coreThreshold && Math.random() < this.floorChangeProbability) {
        const floorIdx = this.floors.findIndex((f) => f.floor_id === state.floorId);
        // Move to adjacent floor
        const direction = Math.random() < 0.5 ? 1 : -1;
        const newFloorIdx = floorIdx + direction;
        if (newFloorIdx >= 0 && newFloorIdx < this.floors.length) {
          state.floorId = this.floors[newFloorIdx].floor_id;
          state.floorNumber = this.floors[newFloorIdx].floor_number;
          this.logger(`[SIMULATOR] Device ${deviceId} transitioned to floor ${state.floorId} (${this.floors[newFloorIdx].floor_name})`);
        }
      }

      // 5. Construct payload conforming to shared integration contract
      packets.push({
        device_id: deviceId,
        building_id: this.buildingId,
        floor_id: state.floorId,
        position: {
          x: state.x,
          z: state.z,
        },
        source: 'SIMULATION',
        timestamp: nowIso,
      });
    }

    return packets;
  }

  /**
   * Advance simulation and transmit packets via HTTP POST
   */
  async sendStep() {
    const packets = this.step();
    this.stats.totalTicks++;
    const results = [];

    for (const packet of packets) {
      this.stats.totalPacketsSent++;
      try {
        const res = await fetch(`${this.apiBaseUrl}/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet),
        });

        if (res.ok) {
          this.stats.totalSuccess++;
          results.push({ device_id: packet.device_id, status: res.status, success: true });
        } else {
          this.stats.totalFailures++;
          const errBody = await res.text();
          this.logger(`[SIMULATOR ERROR] Ingest failed for ${packet.device_id} [${res.status}]: ${errBody}`);
          results.push({ device_id: packet.device_id, status: res.status, success: false, error: errBody });
        }
      } catch (err) {
        this.stats.totalFailures++;
        this.logger(`[SIMULATOR NETWORK ERROR] ${packet.device_id}: ${err.message}`);
        results.push({ device_id: packet.device_id, status: 0, success: false, error: err.message });
      }
    }

    return results;
  }

  /**
   * Start recurring simulation loop
   */
  async start() {
    if (this.isRunning) return;
    await this.init();

    this.isRunning = true;
    this.stats.startTime = new Date();

    this.logger('====================================================');
    this.logger('Synthetic Location Simulator Initialized');
    this.logger(`API Base URL:     ${this.apiBaseUrl}`);
    this.logger(`Building ID:      ${this.buildingId}`);
    this.logger(`Simulated Devices:${this.deviceIds.join(', ')}`);
    this.logger(`Floors Active:    ${this.floors.map((f) => f.floor_id).join(', ')}`);
    this.logger(`Update Rate:      every ${this.updateIntervalMs} ms (${this.speed} m/s)`);
    this.logger('====================================================');

    // Run first step immediately
    await this.sendStep();

    this.timer = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await this.sendStep();
      } catch (err) {
        this.logger(`[SIMULATOR TICK EXCEPTION] ${err.message}`);
      }
    }, this.updateIntervalMs);
  }

  /**
   * Stop recurring simulation loop
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const elapsedSec = this.stats.startTime
      ? Math.round((Date.now() - this.stats.startTime.getTime()) / 1000)
      : 0;
    this.logger('\n[SIMULATOR] Simulation stopped.');
    this.logger(`Duration: ${elapsedSec}s | Ticks: ${this.stats.totalTicks} | Sent: ${this.stats.totalPacketsSent} | Success: ${this.stats.totalSuccess} | Failures: ${this.stats.totalFailures}`);
  }
}

// Standalone execution entrypoint
if (require.main === module) {
  const simulator = new LocationSimulator();

  const handleShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Gracefully stopping simulator...`);
    simulator.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  simulator.start().catch((err) => {
    console.error('[SIMULATOR FATAL]', err);
    process.exit(1);
  });
}

module.exports = {
  LocationSimulator,
};
