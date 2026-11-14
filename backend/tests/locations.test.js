/**
 * Automated Tests for Phase 7 & Phase 8: Location Ingestion & Retrieval APIs
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const { pool, query } = require('../src/db');
const { runMigrations } = require('../src/db/migrate');
const { seed } = require('../src/db/seed');

describe('Phase 7 & 8: Location Ingestion & Spatial Retrieval APIs', () => {
  let server;
  let baseUrl;
  const testDeviceId = `DEV_LOC_${Date.now()}`;

  before(async () => {
    await runMigrations();
    await seed();

    // Register test device assigned to BUILDING_001
    await query(`
      INSERT INTO devices (device_id, device_name, callsign, admin_status, is_active)
      VALUES ($1, 'Location Test Tag', 'HIT Team Test', 'DEPLOYED', TRUE);
    `, [testDeviceId]);
    await query(`
      INSERT INTO device_assignments (device_id, building_id, assigned_at, unassigned_at, assigned_by)
      VALUES ($1, 'BUILDING_001', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL, 'Test Runner');
    `, [testDeviceId]);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  it('POST /api/locations successfully ingests valid location packet', async () => {
    const payload = {
      device_id: testDeviceId,
      building_id: 'BUILDING_001',
      floor_id: 'FLOOR_01',
      position: {
        x: 18.5,
        z: 22.0,
      },
      source: 'SIMULATION',
      timestamp: new Date(Date.now() - 5000).toISOString(),
    };

    const res = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.device_id, testDeviceId);
    assert.strictEqual(body.data.position.x, 18.5);
    assert.strictEqual(body.data.position.z, 22.0);
    assert.strictEqual(body.data.is_current_position, true);
  });

  it('Verifies location update updated devices.last_seen_at', async () => {
    const devRes = await fetch(`${baseUrl}/api/devices/${testDeviceId}`);
    const devBody = await devRes.json();
    assert.ok(devBody.data.last_seen_at !== null);
  });

  it('POST /api/locations rejects missing device_id with 400', async () => {
    const res = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        building_id: 'BUILDING_001',
        floor_id: 'FLOOR_01',
        position: { x: 10, z: 10 },
        timestamp: new Date().toISOString(),
      }),
    });
    assert.strictEqual(res.status, 400);
  });

  it('POST /api/locations rejects out-of-bounds coordinates with 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: 'BUILDING_001',
        floor_id: 'FLOOR_01', // max_x is 60.0
        position: { x: 95.0, z: 20.0 },
        timestamp: new Date().toISOString(),
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error.message, /out of bounds/);
  });

  it('POST /api/locations rejects future-dated timestamps with 400 Bad Request', async () => {
    const futureTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const res = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: 'BUILDING_001',
        floor_id: 'FLOOR_01',
        position: { x: 10, z: 10 },
        timestamp: futureTime,
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error.message, /future/);
  });

  it('Out-of-order location packet does not overwrite newer current position', async () => {
    const tNewer = new Date(Date.now() - 3000).toISOString(); // 3s ago
    const tDelayed = new Date(Date.now() - 10000).toISOString(); // 10s ago

    // 1. Send newer update
    await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: 'BUILDING_001',
        floor_id: 'FLOOR_01',
        position: { x: 35.0, z: 40.0 },
        timestamp: tNewer,
      }),
    });

    // 2. Send delayed older update
    const delayedRes = await fetch(`${baseUrl}/api/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: testDeviceId,
        building_id: 'BUILDING_001',
        floor_id: 'FLOOR_01',
        position: { x: 5.0, z: 5.0 },
        timestamp: tDelayed,
      }),
    });

    const delayedBody = await delayedRes.json();
    // Ingested into history, but not marked as current
    assert.strictEqual(delayedBody.data.is_current_position, false);

    // 3. Verify current position is still from tNewer (35.0, 40.0)
    const currentRes = await fetch(`${baseUrl}/api/locations/latest/${testDeviceId}`);
    const currentBody = await currentRes.json();
    assert.strictEqual(currentBody.data.position.x, 35.0);
    assert.strictEqual(currentBody.data.position.z, 40.0);
  });

  it('GET /api/locations/latest returns array of current locations', async () => {
    const res = await fetch(`${baseUrl}/api/locations/latest`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    const found = body.data.find((l) => l.device_id === testDeviceId);
    assert.ok(found);
    assert.strictEqual(found.position.x, 35.0);
    assert.strictEqual(found.floor.id, 'FLOOR_01');
  });

  it('GET /api/locations/history/:deviceId returns paginated movement history', async () => {
    const res = await fetch(`${baseUrl}/api/locations/history/${testDeviceId}?limit=10&sort=DESC`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 3);
    assert.strictEqual(body.limit, 10);
  });

  it('GET /api/locations/building/:buildingId returns locations in building', async () => {
    const res = await fetch(`${baseUrl}/api/locations/building/BUILDING_001`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.some((l) => l.device_id === testDeviceId));
  });

  it('GET /api/locations/floor/:floorId returns locations on specific floor', async () => {
    const res = await fetch(`${baseUrl}/api/locations/floor/FLOOR_01`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.some((l) => l.device_id === testDeviceId));
  });

  it('GET /api/locations/summary/:deviceId returns movement bounds & statistics', async () => {
    const res = await fetch(`${baseUrl}/api/locations/summary/${testDeviceId}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.total_locations_recorded >= 3);
    assert.ok(body.data.bounding_box !== null);
    assert.ok(body.data.bounding_box.min_x <= body.data.bounding_box.max_x);
  });
});
