/**
 * Automated Tests for Phase 5 & Phase 6: Device Management & Device Assignment APIs
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const { pool, query } = require('../src/db');
const { runMigrations } = require('../src/db/migrate');
const { seed } = require('../src/db/seed');

describe('Phase 5 & 6: Device & Assignment Management APIs', () => {
  let server;
  let baseUrl;

  before(async () => {
    await runMigrations();
    await seed();

    // Clean up test data from any previous test runs
    await query("DELETE FROM current_locations WHERE device_id LIKE 'DEVICE_TEST_%'");
    await query("DELETE FROM location_history WHERE device_id LIKE 'DEVICE_TEST_%'");
    await query("DELETE FROM device_assignments WHERE device_id LIKE 'DEVICE_TEST_%'");
    await query("DELETE FROM devices WHERE device_id LIKE 'DEVICE_TEST_%'");
    await query("DELETE FROM buildings WHERE building_id LIKE 'BUILDING_REASSIGN_%'");

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

  it('GET /api/devices returns seeded devices with connectivity status', async () => {
    const res = await fetch(`${baseUrl}/api/devices`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 4);

    const dev1 = body.data.find((d) => d.device_id === 'DEVICE_001');
    assert.ok(dev1);
    assert.strictEqual(dev1.callsign, 'HIT Team Alpha - Lead');
    assert.strictEqual(dev1.admin_status, 'DEPLOYED');
    assert.ok(['ONLINE', 'STALE', 'OFFLINE', 'UNKNOWN'].includes(dev1.connectivity_status));
  });

  it('POST /api/devices registers a new device with optional initial building', async () => {
    const res = await fetch(`${baseUrl}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: 'DEVICE_TEST_01',
        device_name: 'Test Tracking Tag',
        callsign: 'HIT Team Charlie - Lead',
        admin_status: 'DEPLOYED',
        initial_building_id: 'BUILDING_001',
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.device_id, 'DEVICE_TEST_01');
    assert.strictEqual(body.data.current_building_id, 'BUILDING_001');
  });

  it('POST /api/devices rejects duplicate device_id with 409', async () => {
    const res = await fetch(`${baseUrl}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: 'DEVICE_001',
        device_name: 'Duplicate Device',
      }),
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error.message, /already exists/);
  });

  it('POST /api/devices rejects invalid admin_status with 400', async () => {
    const res = await fetch(`${baseUrl}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: 'DEVICE_INVALID_STATUS',
        device_name: 'Invalid Device',
        admin_status: 'SUPER_ACTIVE', // Invalid!
      }),
    });
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/devices/:deviceId returns details for single device', async () => {
    const res = await fetch(`${baseUrl}/api/devices/DEVICE_001`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.device_id, 'DEVICE_001');
    assert.strictEqual(body.data.current_building_id, 'BUILDING_001');
  });

  it('PUT /api/devices/:deviceId updates device information', async () => {
    const res = await fetch(`${baseUrl}/api/devices/DEVICE_TEST_01`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_name: 'Test Tracking Tag — Updated',
        callsign: 'HIT Team Charlie — Sniper',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.device_name, 'Test Tracking Tag — Updated');
    assert.strictEqual(body.data.callsign, 'HIT Team Charlie — Sniper');
  });

  it('PATCH /api/devices/:deviceId/admin-status updates status and overrides connectivity', async () => {
    const res = await fetch(`${baseUrl}/api/devices/DEVICE_TEST_01/admin-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_status: 'MAINTENANCE' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.admin_status, 'MAINTENANCE');
    assert.strictEqual(body.data.connectivity_status, 'MAINTENANCE');
  });

  it('GET /api/devices/:deviceId/connectivity returns connectivity overview', async () => {
    const res = await fetch(`${baseUrl}/api/devices/DEVICE_TEST_01/connectivity`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.device_id, 'DEVICE_TEST_01');
    assert.strictEqual(body.data.connectivity_status, 'MAINTENANCE');
  });

  it('POST /api/devices/:deviceId/assignments reassigns device to new building', async () => {
    // 1. Ensure target building exists
    await query(`
      INSERT INTO buildings (building_id, name, description, is_active)
      VALUES ('BUILDING_REASSIGN_01', 'Tactical Safehouse', 'Secondary site', TRUE)
      ON CONFLICT (building_id) DO NOTHING;
    `);

    // 2. Reassign DEVICE_TEST_01
    const res = await fetch(`${baseUrl}/api/devices/DEVICE_TEST_01/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        building_id: 'BUILDING_REASSIGN_01',
        assigned_by: 'Incident Commander',
        notes: 'Redeployed for perimeter defense',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.building_id, 'BUILDING_REASSIGN_01');

    // 3. Verify current building changed on device
    const devRes = await fetch(`${baseUrl}/api/devices/DEVICE_TEST_01`);
    const devBody = await devRes.json();
    assert.strictEqual(devBody.data.current_building_id, 'BUILDING_REASSIGN_01');
  });

  it('GET /api/devices/:deviceId/assignments returns chronological assignment history', async () => {
    const res = await fetch(`${baseUrl}/api/devices/DEVICE_TEST_01/assignments`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 2); // Initial BUILDING_001 and now BUILDING_REASSIGN_01

    // First element must be current active assignment
    assert.strictEqual(body.data[0].building_id, 'BUILDING_REASSIGN_01');
    assert.strictEqual(body.data[0].unassigned_at, null);

    // Second element was closed with unassigned_at timestamp
    assert.strictEqual(body.data[1].building_id, 'BUILDING_001');
    assert.ok(body.data[1].unassigned_at !== null);
  });

  it('GET /api/buildings/:buildingId/devices lists actively deployed devices', async () => {
    const res = await fetch(`${baseUrl}/api/buildings/BUILDING_REASSIGN_01/devices`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    const found = body.data.find((d) => d.device_id === 'DEVICE_TEST_01');
    assert.ok(found);
  });

  it('PATCH /api/devices/:deviceId/assignments/unassign detaches device', async () => {
    const res = await fetch(`${baseUrl}/api/devices/DEVICE_TEST_01/assignments/unassign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Recalled to armory' }),
    });
    assert.strictEqual(res.status, 200);

    // Device now has no active building
    const devRes = await fetch(`${baseUrl}/api/devices/DEVICE_TEST_01`);
    const devBody = await devRes.json();
    assert.strictEqual(devBody.data.current_building_id, null);
  });
});
