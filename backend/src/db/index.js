/**
 * Database Connection Pool & Query Interface
 * Centralizes PostgreSQL access using node-postgres (pg.Pool).
 * Provides parameterized query helpers, client checkout for transactions,
 * and graceful connection error handling.
 */

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: config.db.max,
  idleTimeoutMillis: config.db.idleTimeoutMillis,
  connectionTimeoutMillis: config.db.connectionTimeoutMillis,
});

// Catch idle client errors so the server does not crash unexpectedly
pool.on('error', (err) => {
  console.error('[ERROR] Unexpected PostgreSQL idle client error:', err.message);
});

/**
 * Execute a parameterized query against the connection pool
 * @param {string} text - SQL query string with $1, $2 placeholders
 * @param {Array} params - Array of parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (config.nodeEnv === 'development' && process.env.DEBUG_SQL === 'true') {
      const duration = Date.now() - start;
      console.log(`[SQL] Executed query in ${duration}ms: ${text.slice(0, 100)}...`);
    }
    return res;
  } catch (error) {
    if (config.nodeEnv !== 'test') {
      console.error(`[SQL ERROR] Failed executing: ${text.slice(0, 100)}... Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Acquire a dedicated client from the pool for multi-statement transactions
 * (BEGIN ... COMMIT / ROLLBACK)
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  return pool.connect();
}

/**
 * Verify database connectivity (used by health checks)
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  const res = await pool.query('SELECT 1 AS healthy');
  return res.rows[0].healthy === 1;
}

/**
 * Gracefully close all pool connections (used during server shutdown)
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool,
};

