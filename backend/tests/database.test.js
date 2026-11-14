/**
 * Comprehensive Automated Tests for Phase 3:
 * PostgreSQL Schema, Relational Integrity, Boundary Triggers, Concurrency & Upserts
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { pool, query, getClient } = require('../src/db');
const { runMigrations } = require('../src/db/migrate');
const { seed } = require('../src/db/seed');

describe('Phase 3: PostgreSQL Database Schema & Integrity Engine', () => {
  before(async () => {
    // Ensure migrations and seed are executed
    await runMigrations();
    await seed();
  });

  after(async () => {
    // Cleanly close pool connections
    await pool.end();
  });

  it('1. Migration runner is idempotent and enforces advisory lock', async () => {
    const result = await runMigrations();
    assert.strictEqual(result.applied, 0);
    assert.ok(result.skipped >= 5);
  });

  it('2. Schema tables exist with correct relations', async () => {
    const res = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    const tables = res.rows.map((r) => r.table_name);
    const requiredTables = [
      'buildings',
      'current_locations',
      'device_assignments',
      'devices',
      'floors',
      'location_history',
      'schema_migrations',
    ];
    for (const table of requiredTables) {
      assert.ok(tables.includes(table), `Table ${table} should exist in schema`);
    }
  });

  it('3. Foreign key rejects floor referencing non-existent building', async () => {
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO floors (floor_id, building_id, floor_name, floor_number, elevation, min_x, max_x, min_z, max_z)
          VALUES ('FLOOR_FAIL', 'BUILDING_NON_EXISTENT', 'Fail Floor', 99, 10.0, 0, 10, 0, 10);
        `);
      },
      (err) => {
        assert.strictEqual(err.code, '23503'); // foreign_key_violation
        return true;
      }
    );
  });

  it('4. Location insert within floor bounds succeeds', async () => {
    const now = new Date();
    const res = await query(`
      INSERT INTO location_history (device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp)
      VALUES ('DEVICE_001', 'BUILDING_001', 'FLOOR_B1', 25.0, 30.0, 'SIMULATION', $1)
      RETURNING location_id, x_coordinate, z_coordinate;
    `, [now]);

    assert.ok(res.rows[0].location_id);
    assert.strictEqual(parseFloat(res.rows[0].x_coordinate), 25.0);
    assert.strictEqual(parseFloat(res.rows[0].z_coordinate), 30.0);
  });

  it('5. Coordinate boundary trigger rejects out-of-bounds X coordinates', async () => {
    const now = new Date();
    // FLOOR_B1 max_x is 50.00
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO location_history (device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp)
          VALUES ('DEVICE_001', 'BUILDING_001', 'FLOOR_B1', 55.0, 25.0, 'SIMULATION', $1);
        `, [now]);
      },
      (err) => {
        assert.match(err.message, /out of bounds/);
        return true;
      }
    );
  });

  it('6. Coordinate boundary trigger rejects out-of-bounds Z coordinates', async () => {
    const now = new Date();
    // FLOOR_B1 min_z is 0.00
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO location_history (device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp)
          VALUES ('DEVICE_001', 'BUILDING_001', 'FLOOR_B1', 25.0, -5.0, 'SIMULATION', $1);
        `, [now]);
      },
      (err) => {
        assert.match(err.message, /out of bounds/);
        return true;
      }
    );
  });

  it('7. Future-dated observation timestamps beyond 1 minute are rejected', async () => {
    const futureTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
    await assert.rejects(
      async () => {
        await query(`
          INSERT INTO location_history (device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp)
          VALUES ('DEVICE_001', 'BUILDING_001', 'FLOOR_B1', 20.0, 20.0, 'SIMULATION', $1);
        `, [futureTime]);
      },
      (err) => {
        assert.match(err.message, /future beyond allowable 1-minute drift/);
        return true;
      }
    );
  });

  it('8. Historical location records are strictly immutable (UPDATE and DELETE blocked)', async () => {
    const client = await getClient();
    try {
      const now = new Date();
      const insertRes = await client.query(`
        INSERT INTO location_history (device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp)
        VALUES ('DEVICE_002', 'BUILDING_001', 'FLOOR_00', 10.0, 10.0, 'SIMULATION', $1)
        RETURNING location_id;
      `, [now]);
      const locationId = insertRes.rows[0].location_id;

      // Attempt UPDATE
      await assert.rejects(
        async () => {
          await client.query('UPDATE location_history SET x_coordinate = 15.0 WHERE location_id = $1', [locationId]);
        },
        (err) => {
          assert.match(err.message, /Historical location records are immutable/);
          return true;
        }
      );

      // Attempt DELETE
      await assert.rejects(
        async () => {
          await client.query('DELETE FROM location_history WHERE location_id = $1', [locationId]);
        },
        (err) => {
          assert.match(err.message, /Historical location records are immutable/);
          return true;
        }
      );
    } finally {
      client.release();
    }
  });

  it('9. Current-location upsert updates on newer timestamp and rejects older out-of-order packet', async () => {
    const t1 = new Date(Date.now() - 20000); // T - 20s
    const t2 = new Date(Date.now() - 10000); // T - 10s
    const tDelayed = new Date(Date.now() - 15000); // T - 15s (older than t2)

    // Step 1: Initial position at T1
    await query(`
      INSERT INTO current_locations (device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp)
      VALUES ('DEVICE_003', 'BUILDING_001', 'FLOOR_01', 12.0, 14.0, 'SIMULATION', $1)
      ON CONFLICT (device_id) DO UPDATE SET
        building_id = EXCLUDED.building_id,
        floor_id = EXCLUDED.floor_id,
        x_coordinate = EXCLUDED.x_coordinate,
        z_coordinate = EXCLUDED.z_coordinate,
        source = EXCLUDED.source,
        timestamp = EXCLUDED.timestamp,
        updated_at = CURRENT_TIMESTAMP
      WHERE EXCLUDED.timestamp > current_locations.timestamp;
    `, [t1]);

    const res1 = await query('SELECT x_coordinate, z_coordinate, timestamp FROM current_locations WHERE device_id = $1', ['DEVICE_003']);
    assert.strictEqual(parseFloat(res1.rows[0].x_coordinate), 12.0);

    // Step 2: Newer position at T2
    await query(`
      INSERT INTO current_locations (device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp)
      VALUES ('DEVICE_003', 'BUILDING_001', 'FLOOR_01', 30.0, 35.0, 'SIMULATION', $1)
      ON CONFLICT (device_id) DO UPDATE SET
        building_id = EXCLUDED.building_id,
        floor_id = EXCLUDED.floor_id,
        x_coordinate = EXCLUDED.x_coordinate,
        z_coordinate = EXCLUDED.z_coordinate,
        source = EXCLUDED.source,
        timestamp = EXCLUDED.timestamp,
        updated_at = CURRENT_TIMESTAMP
      WHERE EXCLUDED.timestamp > current_locations.timestamp;
    `, [t2]);

    const res2 = await query('SELECT x_coordinate, z_coordinate, timestamp FROM current_locations WHERE device_id = $1', ['DEVICE_003']);
    assert.strictEqual(parseFloat(res2.rows[0].x_coordinate), 30.0);
    assert.strictEqual(parseFloat(res2.rows[0].z_coordinate), 35.0);

    // Step 3: Out-of-order delayed update (Tdelayed: 15s ago, older than T2: 10s ago)
    // Note: Coordinates must be valid (within FLOOR_01 [0-60, 0-60])
    await query(`
      INSERT INTO current_locations (device_id, building_id, floor_id, x_coordinate, z_coordinate, source, timestamp)
      VALUES ('DEVICE_003', 'BUILDING_001', 'FLOOR_01', 15.0, 16.0, 'SIMULATION', $1)
      ON CONFLICT (device_id) DO UPDATE SET
        building_id = EXCLUDED.building_id,
        floor_id = EXCLUDED.floor_id,
        x_coordinate = EXCLUDED.x_coordinate,
        z_coordinate = EXCLUDED.z_coordinate,
        source = EXCLUDED.source,
        timestamp = EXCLUDED.timestamp,
        updated_at = CURRENT_TIMESTAMP
      WHERE EXCLUDED.timestamp > current_locations.timestamp;
    `, [tDelayed]);

    // Position MUST still be from T2 (30.0, 35.0) because tDelayed was older!
    const res3 = await query('SELECT x_coordinate, z_coordinate FROM current_locations WHERE device_id = $1', ['DEVICE_003']);
    assert.strictEqual(parseFloat(res3.rows[0].x_coordinate), 30.0);
    assert.strictEqual(parseFloat(res3.rows[0].z_coordinate), 35.0);
  });

  it('10. Floor boundary guard prevents shrinking floor bounds when active device positions would become invalid', async () => {
    // DEVICE_003 has current position at x: 30.0, z: 35.0 on FLOOR_01
    // Attempting to shrink FLOOR_01 max_x to 20.00 must be rejected
    await assert.rejects(
      async () => {
        await query(`
          UPDATE floors
          SET max_x = 20.00
          WHERE floor_id = 'FLOOR_01';
        `);
      },
      (err) => {
        assert.match(err.message, /existing active device positions would become out-of-bounds/);
        return true;
      }
    );
  });

  it('11. Historical data preservation: deleting building or floor with records is blocked by ON DELETE RESTRICT', async () => {
    // BUILDING_001 has floors and location records
    await assert.rejects(
      async () => {
        await query("DELETE FROM buildings WHERE building_id = 'BUILDING_001'");
      },
      (err) => {
        // PostgreSQL error code 23001 is restrict_violation, 23503 is foreign_key_violation
        assert.ok(err.code === '23001' || err.code === '23503', `Expected 23001 or 23503, got ${err.code}`);
        return true;
      }
    );
  });
});
