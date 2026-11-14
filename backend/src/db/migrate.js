/**
 * Transactional Database Migration Runner
 * Uses PostgreSQL advisory locking for multi-instance concurrency protection.
 * Ensures forward-only, idempotent schema migrations.
 */

const fs = require('fs');
const path = require('path');
const { pool, getClient } = require('./index');

// Distinct 64-bit integer advisory lock key for schema migrations
const MIGRATION_ADVISORY_LOCK_ID = 88888888;

/**
 * Executes all pending SQL migrations in ascending numerical order.
 * @returns {Promise<{ applied: number, skipped: number }>}
 */
async function runMigrations() {
  const client = await getClient();
  let appliedCount = 0;
  let skippedCount = 0;

  try {
    console.log('[MIGRATION] Acquiring migration advisory lock...');
    // Begin transaction for the migration manager
    await client.query('BEGIN');

    // Acquire transaction-scoped advisory lock. Automatically released on COMMIT or ROLLBACK.
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_ADVISORY_LOCK_ID]);
    console.log('[MIGRATION] Advisory lock acquired.');

    // Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER NOT NULL
      );
    `);

    // Fetch already applied migrations
    const appliedResult = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC');
    const appliedSet = new Set(appliedResult.rows.map((r) => r.version));

    // Read migrations directory
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`[MIGRATION] Found ${files.length} migration files.`);

    for (const file of files) {
      const version = file.split('_')[0];
      const name = file;

      if (appliedSet.has(version)) {
        skippedCount += 1;
        continue;
      }

      console.log(`[MIGRATION] Applying ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      const start = Date.now();
      await client.query(sql);
      const executionTimeMs = Date.now() - start;

      await client.query(
        'INSERT INTO schema_migrations (version, name, execution_time_ms) VALUES ($1, $2, $3)',
        [version, name, executionTimeMs]
      );

      console.log(`[MIGRATION] Applied ${file} successfully in ${executionTimeMs}ms.`);
      appliedCount += 1;
    }

    await client.query('COMMIT');
    console.log(`[MIGRATION] Completed. Applied: ${appliedCount}, Already up to date: ${skippedCount}.`);
    return { applied: appliedCount, skipped: skippedCount };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[MIGRATION ERROR] Migration failed, transaction rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct execution via CLI (node src/db/migrate.js)
if (require.main === module) {
  runMigrations()
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

module.exports = {
  runMigrations,
};

