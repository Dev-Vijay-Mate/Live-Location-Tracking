/**
 * Frontend Contract Compatibility Test Suite
 * Verifies exact compatibility between the Node.js backend and the React/Three.js frontend.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { WebSocket } = require('ws');
const app = require('../src/app');
const { pool, query } = require('../src/db');
const { initWebSocketServer, closeWebSocketServer } = require('../src/websocket');
const { runMigrations } = require('../src/db/migrate');
const { seed } = require('../src/db/seed');

describe('Frontend Contract Compatibility (React & Three.js Integration)', () => {
  let server;
  let baseUrl;
  let wsUrl;
  const testDeviceId = `DEV_FRONTEND_${Date.now()}`;

  before(async () => {
    await runMigrations();
    await seed();

    // Register test operator
    await query(`
      INSERT INTO devices (device_id, device_name, callsign, admin_status, is_active)
      VALUES ($1, 'HIT Assault Unit', 'Spectre Alpha', 'DEPLOYED', TRUE);
    `, [testDeviceId]);
    await query(`
      INSERT INTO device_assignments (device_id, building_id, assigned_at, unassigned_at, assigned_by)
      VALUES ($1, 'BUILDING_001', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL, 'Integration Test');
    `, [testDeviceId]);

    await new Promise((resolve) => {
      server = http.createServer(app);
      initWebSocketServer(server);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        wsUrl = `ws://127.0.0.1:${port}/ws/locations`;
        resolve();
      });
    });
  });

  after(async () => {
    closeWebSocketServer();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  it('1. GET /api/health satisfies frontend fetchHealth() contract', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.status === 'OK' || body.status === 'healthy');
    assert.ok(body.timestamp);
  });

  it('2. GET /api/devices satisfies frontend useDevices() contract with "devices" array', async () => {
    const res = await fetch(`${baseUrl}/api/devices`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    // Must have devices array for frontend useDevices hook
    assert.ok(Array.isArray(body.devices), 'Response must include "devices" array for frontend');
    assert.ok(body.devices.length >= 4);

    const dev = body.devices.find((d) => d.device_id === testDeviceId);
    assert.ok(dev);
    assert.strictEqual(dev.name, 'Spectre Alpha');
    assert.ok(['online', 'stale', 'offline', 'unknown', 'maintenance', 'decommissioned'].includes(dev.status));
    assert.ok(dev.position && typeof dev.position.x === 'number' && typeof dev.position.z === 'number');
    assert.ok(dev.last_seen);
  });

  it('3. POST /api/locations accepts frontend postLocation() payload and returns accepted status', async () => {
    const payload = {
      device_id: testDeviceId,
      building_id: 'BUILDING_001',
      floor_id: 'FLOOR_00',
      position: { x: 18.5, z: 22.0 },
      source: 'SIMULATION',
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();

    assert.strictEqual(body.status, 'accepted');
    assert.strictEqual(body.device_id, testDeviceId);
    assert.ok(body.timestamp);
  });

  it('4. GET /api/locations/latest returns "locations" array conforming to API_CONTRACT.md', async () => {
    const res = await fetch(`${baseUrl}/api/locations/latest`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.ok(Array.isArray(body.locations), 'Must include "locations" array for frontend');
    const loc = body.locations.find((l) => l.device_id === testDeviceId);
    assert.ok(loc);
    assert.strictEqual(loc.floor_id, 'FLOOR_00');
    assert.strictEqual(loc.position.x, 18.5);
    assert.strictEqual(loc.position.z, 22.0);
  });

  it('5. GET /api/locations/history/:id returns "history" array for 3D trajectory trails', async () => {
    const res = await fetch(`${baseUrl}/api/locations/history/${testDeviceId}?limit=50`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.device_id, testDeviceId);
    assert.ok(Array.isArray(body.history), 'Must include "history" array for useDevices trajectory tracking');
    assert.ok(body.history.length >= 1);
    assert.strictEqual(body.history[0].floor_id, 'FLOOR_00');
    assert.strictEqual(body.history[0].position.x, 18.5);
    assert.strictEqual(body.history[0].position.z, 22.0);
  });

  it('6. WebSocket handles /ws/locations URL, connection_ack, and raw string ping/pong', async () => {
    const ws = new WebSocket(wsUrl);

    // Collect initial messages
    const messages = [];
    ws.on('message', (data) => messages.push(data.toString()));

    await new Promise((resolve) => ws.on('open', resolve));

    // Wait for connection_ack
    const ack = await new Promise((resolve) => {
      const check = () => {
        const found = messages.find((m) => m.includes('connection_ack'));
        if (found) return resolve(JSON.parse(found));
        setTimeout(check, 10);
      };
      check();
    });
    assert.strictEqual(ack.type, 'connection_ack');

    // Send raw string 'ping' (matching frontend websocketClient.js heartbeat)
    const pongPromise = new Promise((resolve) => {
      ws.on('message', (data) => {
        if (data.toString().trim() === 'pong') {
          resolve('pong');
        }
      });
    });
    ws.send('ping');

    const pong = await pongPromise;
    assert.strictEqual(pong, 'pong');

    ws.close();
  });

  it('7. WebSocket emits lowercase "location_update" event subscribed by useWebSocket hook', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.on('open', resolve));

    const updatePromise = new Promise((resolve) => {
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'location_update' && msg.data.device_id === testDeviceId) {
            resolve(msg);
          }
        } catch (e) {
          // ignore pong or non-JSON
        }
      });
    });

    // Ingest location update
    await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: 'BUILDING_001',
        floor_id: 'FLOOR_01',
        position: { x: 20.0, z: 15.0 },
        source: 'SIMULATION',
        timestamp: new Date().toISOString(),
      }),
    });

    const update = await updatePromise;
    assert.strictEqual(update.type, 'location_update');
    assert.strictEqual(update.data.device_id, testDeviceId);
    assert.strictEqual(update.data.floor_id, 'FLOOR_01');
    assert.strictEqual(update.data.position.x, 20.0);
    assert.strictEqual(update.data.position.z, 15.0);

    ws.close();
  });
});
