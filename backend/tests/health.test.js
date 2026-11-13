/**
 * Automated Tests for Phase 2: Express Server, Core Middleware, and Health Endpoint
 * Uses Node.js native test runner (node:test) and native assertions (node:assert).
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');

describe('Phase 2: Express Server & Core Middleware', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Start server on an ephemeral port (port 0) to avoid any port conflicts
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
    // Cleanly close server after test execution
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it('GET /api/health returns 200 with service metadata', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.match(contentType, /application\/json/);

    const body = await res.json();
    assert.strictEqual(body.status, 'OK');
    assert.strictEqual(body.service, 'live-location-tracking-backend');
    assert.ok(typeof body.uptime === 'number');
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
  });

  it('GET /api/non-existent returns 404 with standardized error JSON', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent`);
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.status, 404);
    assert.match(body.error.message, /Endpoint not found/);
  });

  it('POST with malformed JSON body returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid_json": ',
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.status, 400);
    assert.strictEqual(body.error.message, 'Malformed JSON payload in request body');
  });

  it('CORS allows requests from configured origin (http://localhost:5173)', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  it('CORS rejects requests from unauthorized origins with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://unauthorized-domain.com' },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.status, 403);
    assert.match(body.error.message, /not allowed by CORS/);
  });
});

