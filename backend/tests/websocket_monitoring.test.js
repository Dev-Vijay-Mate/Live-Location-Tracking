/**
 * Automated Tests for Phase 9 & Phase 10: Device Monitoring & WebSocket Real-Time Broadcasting
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

describe('Phase 9 & 10: Device Monitoring & WebSocket Broadcasting', () => {
  let server;
  let baseUrl;
  let wsUrl;
  const testDeviceId = `DEV_WS_${Date.now()}`;

  before(async () => {
    await runMigrations();
    await seed();

    // Register test device and assignment
    await query(`
      INSERT INTO devices (device_id, device_name, callsign, admin_status, is_active)
      VALUES ($1, 'WebSocket Test Tag', 'HIT Team Delta', 'DEPLOYED', TRUE);
    `, [testDeviceId]);
    await query(`
      INSERT INTO device_assignments (device_id, building_id, assigned_at, unassigned_at, assigned_by)
      VALUES ($1, 'BUILDING_001', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL, 'WS Test Runner');
    `, [testDeviceId]);

    await new Promise((resolve) => {
      server = http.createServer(app);
      initWebSocketServer(server);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        wsUrl = `ws://127.0.0.1:${port}/ws`;
        resolve();
      });
    });
  });

  after(async () => {
    closeWebSocketServer();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  it('GET /api/devices/monitoring/health returns fleet health metrics', async () => {
    const res = await fetch(`${baseUrl}/api/devices/monitoring/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.total_active_devices >= 4);
    assert.ok(body.data.counts.ONLINE !== undefined);
    assert.ok(body.data.counts.OFFLINE !== undefined);
    assert.ok(body.data.by_building.BUILDING_001 !== undefined);
    assert.ok(body.data.by_building.BUILDING_001.total >= 4);
  });

  it('WebSocket client connects and receives welcome handshake', async () => {
    const ws = new WebSocket(wsUrl);

    const welcomeMsg = await new Promise((resolve, reject) => {
      ws.on('open', () => {});
      ws.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
      ws.on('error', reject);
    });

    assert.strictEqual(welcomeMsg.type, 'CONNECTED');
    assert.ok(welcomeMsg.clientId);
    assert.strictEqual(welcomeMsg.server, 'live-location-tracking-backend');
    ws.close();
  });

  it('WebSocket client can send PING and receive PONG', async () => {
    const ws = new WebSocket(wsUrl);

    await new Promise((resolve) => ws.on('open', resolve));

    // Consume welcome message
    await new Promise((resolve) => ws.once('message', resolve));

    // Send PING
    ws.send(JSON.stringify({ type: 'PING' }));

    const pongMsg = await new Promise((resolve) => {
      ws.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    assert.strictEqual(pongMsg.type, 'PONG');
    assert.ok(pongMsg.timestamp);
    ws.close();
  });

  it('WebSocket broadcasts LOCATION_UPDATE when location is ingested via REST API', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.on('open', resolve));

    // Consume welcome message
    await new Promise((resolve) => ws.once('message', resolve));

    // Prepare promise for incoming broadcast
    const broadcastPromise = new Promise((resolve) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'LOCATION_UPDATE') {
          resolve(msg);
        }
      });
    });

    // Ingest location update via HTTP POST
    const locationPayload = {
      device_id: testDeviceId,
      building_id: 'BUILDING_001',
      floor_id: 'FLOOR_00',
      position: { x: 25.5, z: 30.2 },
      source: 'SIMULATION',
      timestamp: new Date().toISOString(),
    };

    const httpRes = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationPayload),
    });
    assert.strictEqual(httpRes.status, 201);

    // Await WebSocket broadcast
    const broadcastMsg = await broadcastPromise;
    assert.strictEqual(broadcastMsg.type, 'LOCATION_UPDATE');
    assert.strictEqual(broadcastMsg.data.device_id, testDeviceId);
    assert.strictEqual(broadcastMsg.data.building_id, 'BUILDING_001');
    assert.strictEqual(broadcastMsg.data.floor_id, 'FLOOR_00');
    assert.strictEqual(broadcastMsg.data.position.x, 25.5);
    assert.strictEqual(broadcastMsg.data.position.z, 30.2);

    ws.close();
  });

  it('WebSocket filtered subscription receives only matching updates', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.on('open', resolve));
    await new Promise((resolve) => ws.once('message', resolve)); // welcome

    // Subscribe ONLY to FLOOR_B1
    ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      floor_id: 'FLOOR_B1',
    }));

    // Wait for subscription confirmation
    const subConfirm = await new Promise((resolve) => {
      ws.once('message', (data) => resolve(JSON.parse(data.toString())));
    });
    assert.strictEqual(subConfirm.type, 'SUBSCRIBED');
    assert.strictEqual(subConfirm.filters.floor_id, 'FLOOR_B1');

    let receivedUnmatched = false;
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'LOCATION_UPDATE' && msg.data.floor_id !== 'FLOOR_B1') {
        receivedUnmatched = true;
      }
    });

    // Send update for FLOOR_02 (which this client did NOT subscribe to)
    await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: 'BUILDING_001',
        floor_id: 'FLOOR_02',
        position: { x: 12.0, z: 15.0 },
        timestamp: new Date().toISOString(),
      }),
    });

    // Small delay to allow any event to arrive
    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(receivedUnmatched, false, 'Client should NOT receive update for unsubscribed floor');

    ws.close();
  });
});

