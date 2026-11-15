/**
 * Automated Tests for Phase 11: Synthetic Location Simulator
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const { pool, query } = require('../src/db');
const { runMigrations } = require('../src/db/migrate');
const { seed } = require('../src/db/seed');
const { LocationSimulator } = require('../simulator/simulator');

describe('Phase 11: Synthetic Movement Simulator', () => {
  let server;
  let baseUrl;
  let apiBaseUrl;

  before(async () => {
    await runMigrations();
    await seed();

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        apiBaseUrl = `${baseUrl}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  it('1. Simulator initializes device states within floor boundaries', async () => {
    const simulator = new LocationSimulator({
      apiBaseUrl,
      buildingId: 'BUILDING_001',
      deviceIds: ['DEVICE_001', 'DEVICE_002'],
      logger: () => {}, // silent
    });

    const states = await simulator.init();
    assert.strictEqual(states.size, 2);

    for (const [deviceId, state] of states.entries()) {
      assert.ok(['DEVICE_001', 'DEVICE_002'].includes(deviceId));
      assert.ok(state.floorId);
      assert.ok(typeof state.x === 'number');
      assert.ok(typeof state.z === 'number');
      const floor = simulator.floors.find((f) => f.floor_id === state.floorId);
      assert.ok(floor, `Floor ${state.floorId} must be found in simulator floors`);
      assert.ok(
        state.x >= parseFloat(floor.min_x) && state.x <= parseFloat(floor.max_x),
        `X coordinate ${state.x} must be within [${floor.min_x}, ${floor.max_x}] for ${floor.floor_id}`
      );
      assert.ok(
        state.z >= parseFloat(floor.min_z) && state.z <= parseFloat(floor.max_z),
        `Z coordinate ${state.z} must be within [${floor.min_z}, ${floor.max_z}] for ${floor.floor_id}`
      );
    }
  });

  it('2. step() generates schema-compliant location packets', async () => {
    const simulator = new LocationSimulator({
      apiBaseUrl,
      buildingId: 'BUILDING_001',
      deviceIds: ['DEVICE_001'],
      logger: () => {},
    });

    await simulator.init();
    const packets = simulator.step();

    assert.strictEqual(packets.length, 1);
    const packet = packets[0];

    assert.strictEqual(packet.device_id, 'DEVICE_001');
    assert.strictEqual(packet.building_id, 'BUILDING_001');
    assert.ok(packet.floor_id);
    assert.strictEqual(typeof packet.position.x, 'number');
    assert.strictEqual(typeof packet.position.z, 'number');
    assert.strictEqual(packet.source, 'SIMULATION');
    assert.ok(new Date(packet.timestamp).getTime() > 0);
  });

  it('3. Simulator enforces boundary reflections over multiple movement steps', async () => {
    const simulator = new LocationSimulator({
      apiBaseUrl,
      buildingId: 'BUILDING_001',
      deviceIds: ['DEVICE_001'],
      speed: 4.0, // high speed to provoke boundary collisions
      logger: () => {},
    });

    await simulator.init();

    // Run 50 continuous kinematic steps
    for (let i = 0; i < 50; i++) {
      const packets = simulator.step();
      const p = packets[0];
      const floor = simulator.floors.find((f) => f.floor_id === p.floor_id);
      assert.ok(
        p.position.x >= parseFloat(floor.min_x) && p.position.x <= parseFloat(floor.max_x),
        `Step ${i}: X=${p.position.x} must stay within [${floor.min_x}, ${floor.max_x}] for ${floor.floor_id}`
      );
      assert.ok(
        p.position.z >= parseFloat(floor.min_z) && p.position.z <= parseFloat(floor.max_z),
        `Step ${i}: Z=${p.position.z} must stay within [${floor.min_z}, ${floor.max_z}] for ${floor.floor_id}`
      );
    }
  });

  it('4. sendStep() successfully persists simulated telemetry to backend API', async () => {
    const simulator = new LocationSimulator({
      apiBaseUrl,
      buildingId: 'BUILDING_001',
      deviceIds: ['DEVICE_001', 'DEVICE_002'],
      logger: () => {},
    });

    await simulator.init();
    const results = await simulator.sendStep();

    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].success, true);
    assert.strictEqual(results[0].status, 201);
    assert.strictEqual(results[1].success, true);
    assert.strictEqual(results[1].status, 201);

    // Verify latest location from API
    const res = await fetch(`${apiBaseUrl}/locations/latest/DEVICE_001`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.device_id, 'DEVICE_001');
    assert.strictEqual(body.data.source, 'SIMULATION');
  });

  it('5. start() and stop() lifecycle manages timer and telemetry stats cleanly', async () => {
    const simulator = new LocationSimulator({
      apiBaseUrl,
      buildingId: 'BUILDING_001',
      deviceIds: ['DEVICE_001'],
      updateIntervalMs: 50,
      logger: () => {},
    });

    await simulator.start();
    assert.strictEqual(simulator.isRunning, true);
    assert.ok(simulator.timer !== null);

    // Allow 2-3 ticks
    await new Promise((resolve) => setTimeout(resolve, 160));

    simulator.stop();
    assert.strictEqual(simulator.isRunning, false);
    assert.strictEqual(simulator.timer, null);
    assert.ok(simulator.stats.totalTicks >= 2);
    assert.ok(simulator.stats.totalSuccess >= 2);
  });
});
