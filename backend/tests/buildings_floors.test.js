/**
 * Automated Tests for Phase 4: Building & Floor Management REST APIs
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/db');
const { runMigrations } = require('../src/db/migrate');
const { seed } = require('../src/db/seed');

describe('Phase 4: Building & Floor Management APIs', () => {
  let server;
  let baseUrl;

  before(async () => {
    await runMigrations();
    await seed();

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

  it('GET /api/buildings returns array containing seeded building', async () => {
    const res = await fetch(`${baseUrl}/api/buildings`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    const found = body.data.find((b) => b.building_id === 'BUILDING_001');
    assert.ok(found);
    assert.strictEqual(found.name, 'NSG Tactical Training Complex');
  });

  it('POST /api/buildings creates a new building', async () => {
    const res = await fetch(`${baseUrl}/api/buildings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        building_id: 'BUILDING_TEST_01',
        name: 'Metro Station Terminal',
        description: 'Underground transit hub training site',
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.building_id, 'BUILDING_TEST_01');
    assert.strictEqual(body.data.name, 'Metro Station Terminal');
  });

  it('POST /api/buildings rejects duplicate building_id with 409', async () => {
    const res = await fetch(`${baseUrl}/api/buildings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        building_id: 'BUILDING_001',
        name: 'Duplicate Building',
      }),
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error.message, /already exists/);
  });

  it('POST /api/buildings rejects missing name with 400', async () => {
    const res = await fetch(`${baseUrl}/api/buildings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ building_id: 'BUILDING_NONAME' }),
    });
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/buildings/:buildingId returns details for existing building', async () => {
    const res = await fetch(`${baseUrl}/api/buildings/BUILDING_001`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.building_id, 'BUILDING_001');
  });

  it('GET /api/buildings/:buildingId returns 404 for unknown building', async () => {
    const res = await fetch(`${baseUrl}/api/buildings/UNKNOWN_ID`);
    assert.strictEqual(res.status, 404);
  });

  it('PUT /api/buildings/:buildingId updates building information', async () => {
    const res = await fetch(`${baseUrl}/api/buildings/BUILDING_TEST_01`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Metro Station Terminal — Updated',
        description: 'Updated operational description',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.name, 'Metro Station Terminal — Updated');
  });

  it('PATCH /api/buildings/:buildingId/status activates and deactivates building', async () => {
    const res = await fetch(`${baseUrl}/api/buildings/BUILDING_TEST_01/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.is_active, false);
  });

  it('GET /api/buildings/:buildingId/floors returns floors ordered by floor_number ASC', async () => {
    const res = await fetch(`${baseUrl}/api/buildings/BUILDING_001/floors`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.length >= 4);

    // Verify ordering from lowest basement to highest floor
    for (let i = 1; i < body.data.length; i += 1) {
      assert.ok(body.data[i].floor_number >= body.data[i - 1].floor_number);
    }
  });

  it('POST /api/buildings/:buildingId/floors creates a new floor with valid bounds', async () => {
    const res = await fetch(`${baseUrl}/api/buildings/BUILDING_TEST_01/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floor_id: 'FLOOR_METRO_01',
        floor_name: 'Platform Level 1',
        floor_number: -1,
        elevation: -5.5,
        min_x: 0,
        max_x: 80,
        min_z: 0,
        max_z: 40,
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.floor_id, 'FLOOR_METRO_01');
    assert.strictEqual(parseFloat(body.data.elevation), -5.5);
  });

  it('POST /api/buildings/:buildingId/floors rejects min_x >= max_x with 400', async () => {
    const res = await fetch(`${baseUrl}/api/buildings/BUILDING_TEST_01/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floor_id: 'FLOOR_INVALID_BOUNDS',
        floor_name: 'Invalid Bounds Floor',
        floor_number: 99,
        min_x: 50,
        max_x: 20, // Invalid!
        min_z: 0,
        max_z: 40,
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.error.message, /min_x.*less than max_x/);
  });

  it('POST /api/buildings/:buildingId/floors rejects duplicate floor_number with 409', async () => {
    const res = await fetch(`${baseUrl}/api/buildings/BUILDING_TEST_01/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floor_id: 'FLOOR_DUPLICATE_NUM',
        floor_name: 'Duplicate Number Floor',
        floor_number: -1, // Already exists on BUILDING_TEST_01
        min_x: 0,
        max_x: 50,
        min_z: 0,
        max_z: 50,
      }),
    });
    assert.strictEqual(res.status, 409);
  });

  it('GET /api/floors/:floorId returns floor details', async () => {
    const res = await fetch(`${baseUrl}/api/floors/FLOOR_00`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.floor_id, 'FLOOR_00');
    assert.strictEqual(body.data.building_id, 'BUILDING_001');
  });

  it('PUT /api/floors/:floorId updates floor configuration', async () => {
    const res = await fetch(`${baseUrl}/api/floors/FLOOR_METRO_01`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        floor_name: 'Platform Level 1 — Main Concourse',
        max_x: 90,
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.floor_name, 'Platform Level 1 — Main Concourse');
    assert.strictEqual(parseFloat(body.data.max_x), 90);
  });
});
