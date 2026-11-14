/**
 * Database Seeder
 * Populates PostgreSQL with initial buildings, multi-storey floors, devices, and assignments.
 */

const fs = require('fs');
const path = require('path');
const { pool, getClient } = require('./index');

async function seed() {
  const client = await getClient();
  try {
    console.log('[SEED] Seeding database with tactical baseline data...');
    const seedPath = path.join(__dirname, 'seed.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('[SEED] Baseline tactical data seeded successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SEED ERROR] Failed to seed database:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution: node src/db/seed.js
if (require.main === module) {
  seed()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { seed };

