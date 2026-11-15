/**
 * Phase 13: End-to-End System Integration & Mission Cycle Test
 * Validates full multi-module workflow:
 * Building/Floor provisioning -> Device registration -> Assignment -> WebSocket subscription ->
 * Telemetry ingestion -> Real-time broadcasting -> Spatial constraints -> Reassignment -> Health summary.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { WebSocket } = require('ws');
const app = require('../src/app');
const { pool } = require('../src/db');
const { initWebSocketServer, closeWebSocketServer } = require('../src/websocket');
const { runMigrations } = require('../src/db/migrate');
const { seed } = require('../src/db/seed');

function waitForMessage(ws, predicate, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMsg);
      reject(new Error(`Timed out waiting for WebSocket message after ${timeoutMs}ms`));
    }, timeoutMs);

    function onMsg(data) {
      try {
        const msg = JSON.parse(data.toString());
        if (predicate(msg)) {
          clearTimeout(timer);
          ws.off('message', onMsg);
          resolve(msg);
        }
      } catch (e) {
        // ignore
      }
    }

    ws.on('message', onMsg);
  });
}

describe('Phase 13: End-to-End Mission Workflow Integration', () => {
  let server;
  let baseUrl;
  let wsUrl;
  const uniqueSuffix = Date.now();
  const testBuildingId = `BLD_E2E_${uniqueSuffix}`;
  const testFloor1 = `FLR_E2E_01_${uniqueSuffix}`;
  const testFloor2 = `FLR_E2E_02_${uniqueSuffix}`;
  const testDeviceId = `DEV_E2E_${uniqueSuffix}`;

  before(async () => {
    await runMigrations();
    await seed();

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

  it('1. Provisions a new operational building and tactical floors', async () => {
    // Create building
    const bldRes = await fetch(`${baseUrl}/api/buildings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        building_id: testBuildingId,
        name: 'Embassy Compound Alpha',
        description: 'Hostage extraction scenario site',
        address: 'Diplomatic Enclave',
        is_active: true,
      }),
    });
    assert.strictEqual(bldRes.status, 201);

    // Create Floor 1: Ground floor (0..40m x 0..30m)
    const flr1Res = await fetch(`${baseUrl}/api/buildings/${testBuildingId}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floor_id: testFloor1,
        floor_name: 'Ground Security Floor',
        floor_number: 0,
        elevation: 0.0,
        min_x: 0.0,
        max_x: 40.0,
        min_z: 0.0,
        max_z: 30.0,
      }),
    });
    assert.strictEqual(flr1Res.status, 201);

    // Create Floor 2: Upper floor (0..40m x 0..30m, elevation 4.5m)
    const flr2Res = await fetch(`${baseUrl}/api/buildings/${testBuildingId}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floor_id: testFloor2,
        floor_name: 'Command Level 1',
        floor_number: 1,
        elevation: 4.5,
        min_x: 0.0,
        max_x: 40.0,
        min_z: 0.0,
        max_z: 30.0,
      }),
    });
    assert.strictEqual(flr2Res.status, 201);
  });

  it('2. Registers operator device and assigns to new building', async () => {
    // Register device
    const devRes = await fetch(`${baseUrl}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        device_name: 'Operator Ghost Unit',
        callsign: 'Spectre 1',
        admin_status: 'DEPLOYED',
        initial_building_id: testBuildingId,
      }),
    });
    assert.strictEqual(devRes.status, 201);
    const body = await devRes.json();
    assert.strictEqual(body.data.current_building_id, testBuildingId);
  });

  it('3. Streams real-time telemetry over WebSocket to subscribed mission monitor', async () => {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.on('open', resolve));

    // Subscribe to the test building
    const subPromise = waitForMessage(ws, (m) => m.type === 'SUBSCRIBED');
    ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      building_id: testBuildingId,
    }));
    await subPromise;

    // Listen for incoming broadcast
    const broadcastPromise = waitForMessage(
      ws,
      (m) => m.type === 'LOCATION_UPDATE' && m.data.device_id === testDeviceId
    );

    // Ingest location on Floor 1
    const locRes = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: testBuildingId,
        floor_id: testFloor1,
        position: { x: 15.0, z: 20.0 },
        source: 'UWB',
        timestamp: new Date().toISOString(),
      }),
    });
    assert.strictEqual(locRes.status, 201);

    const broadcast = await broadcastPromise;
    assert.strictEqual(broadcast.data.device_id, testDeviceId);
    assert.strictEqual(broadcast.data.position.x, 15.0);
    assert.strictEqual(broadcast.data.position.z, 20.0);

    ws.close();
  });

  it('4. Rejects out-of-bounds coordinates according to floor boundary triggers', async () => {
    // Floor 1 bounds: max_x is 40.0, position x: 45.0 must fail
    const locRes = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: testBuildingId,
        floor_id: testFloor1,
        position: { x: 45.0, z: 20.0 },
        source: 'UWB',
        timestamp: new Date().toISOString(),
      }),
    });
    assert.strictEqual(locRes.status, 400);
    const body = await locRes.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error.message, /out of bounds/i);
  });

  it('5. Rejects location update referencing non-assigned building', async () => {
    // Device is assigned to testBuildingId, NOT BUILDING_001
    const locRes = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: 'BUILDING_001',
        floor_id: 'FLOOR_00',
        position: { x: 10.0, z: 10.0 },
        source: 'UWB',
        timestamp: new Date().toISOString(),
      }),
    });
    assert.strictEqual(locRes.status, 400);
    const body = await locRes.json();
    assert.match(body.error.message, /not assigned to building/i);
  });

  it('6. Records floor transition and verifies latest & historical queries', async () => {
    // Move operator to Floor 2
    const locRes = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: testBuildingId,
        floor_id: testFloor2,
        position: { x: 22.5, z: 12.0 },
        source: 'UWB',
        timestamp: new Date().toISOString(),
      }),
    });
    assert.strictEqual(locRes.status, 201);

    // Query current location
    const latestRes = await fetch(`${baseUrl}/api/locations/latest/${testDeviceId}`);
    assert.strictEqual(latestRes.status, 200);
    const latest = await latestRes.json();
    assert.strictEqual(latest.data.floor.id, testFloor2);
    assert.strictEqual(latest.data.floor.elevation, 4.5);
    assert.strictEqual(latest.data.position.x, 22.5);
    assert.strictEqual(latest.data.position.z, 12.0);

    // Query history
    const histRes = await fetch(`${baseUrl}/api/locations/history/${testDeviceId}?sort=ASC`);
    assert.strictEqual(histRes.status, 200);
    const hist = await histRes.json();
    assert.strictEqual(hist.data.length, 2);
    assert.strictEqual(hist.data[0].floor.id, testFloor1);
    assert.strictEqual(hist.data[1].floor.id, testFloor2);
  });

  it('7. Fleet health summary accurately aggregates the new active operator', async () => {
    const healthRes = await fetch(`${baseUrl}/api/devices/monitoring/health`);
    assert.strictEqual(healthRes.status, 200);
    const health = await healthRes.json();

    assert.ok(health.data.by_building[testBuildingId]);
    assert.strictEqual(health.data.by_building[testBuildingId].ONLINE, 1);
    assert.strictEqual(health.data.by_building[testBuildingId].total, 1);
  });

  it('8. Unassigns device and verifies subsequent location update is rejected', async () => {
    // Unassign device
    const unassignRes = await fetch(`${baseUrl}/api/devices/${testDeviceId}/assignments/unassign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.strictEqual(unassignRes.status, 200);

    // Small delay so subsequent observation timestamp is strictly after unassignment time
    await new Promise((r) => setTimeout(r, 50));

    // Attempt location update while unassigned
    const locRes = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: testBuildingId,
        floor_id: testFloor2,
        position: { x: 22.5, z: 12.0 },
        source: 'UWB',
        timestamp: new Date().toISOString(),
      }),
    });
    assert.strictEqual(locRes.status, 400);
    const body = await locRes.json();
    assert.match(body.error.message, /not assigned to building/i);
  });
});
