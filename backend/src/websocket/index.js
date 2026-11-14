/**
 * WebSocket Server Manager
 * Real-time event broadcasting for 3D live location tracking using ws.
 * Implements connection lifecycle, keepalive heartbeats, client-level spatial filters,
 * and zero-overhead post-commit location fan-out.
 */

const { WebSocketServer, WebSocket } = require('ws');
const config = require('../config');
const locationService = require('../services/locationService');

let wss = null;
let heartbeatInterval = null;
const clients = new Map(); // ws -> { id, isAlive, filters: { building_id, floor_id, device_id } }

/**
 * Initializes the WebSocket server attached to the Node.js HTTP server
 * @param {import('http').Server} httpServer
 */
function initWebSocketServer(httpServer) {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({
    noServer: true,
  });

  // Handle HTTP Upgrade request matching config.wsPath
  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);

    if (pathname === config.wsPath) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Connection lifecycle
  wss.on('connection', (ws, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const clientState = {
      id: clientId,
      isAlive: true,
      remoteAddress: req.socket.remoteAddress,
      filters: {},
    };
    clients.set(ws, clientState);

    // Initial Welcome Message
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      clientId,
      server: 'live-location-tracking-backend',
      timestamp: new Date().toISOString(),
      wsPath: config.wsPath,
    }));

    // Keepalive Pong receiver
    ws.on('pong', () => {
      const state = clients.get(ws);
      if (state) state.isAlive = true;
    });

    // Inbound messages (e.g. SUBSCRIBE, UNSUBSCRIBE, PING)
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
            break;

          case 'SUBSCRIBE':
            // Allows clients (dashboard / 3D building view) to isolate specific buildings/floors
            clientState.filters = {
              building_id: message.building_id || null,
              floor_id: message.floor_id || null,
              device_id: message.device_id || null,
            };
            ws.send(JSON.stringify({
              type: 'SUBSCRIBED',
              filters: clientState.filters,
              timestamp: new Date().toISOString(),
            }));
            break;

          case 'UNSUBSCRIBE':
            clientState.filters = {};
            ws.send(JSON.stringify({
              type: 'UNSUBSCRIBED',
              timestamp: new Date().toISOString(),
            }));
            break;

          default:
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: `Unrecognized message type: ${message.type}`,
            }));
        }
      } catch (err) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Malformed JSON payload sent to WebSocket',
        }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error(`[WS CLIENT ERROR] ${clientId}:`, err.message);
      clients.delete(ws);
    });
  });

  // Setup periodic keepalive heartbeat (every 30 seconds)
  heartbeatInterval = setInterval(() => {
    if (!wss) return;
    for (const [ws, state] of clients.entries()) {
      if (!state.isAlive) {
        clients.delete(ws);
        ws.terminate();
        continue;
      }
      state.isAlive = false;
      ws.ping();
    }
  }, 30000);

  // Hook into locationService: zero-overhead fan-out post-commit
  locationService.onLocationPersisted(broadcastLocationUpdate);

  return wss;
}

/**
 * Broadcasts a verified, persisted location update to connected clients
 * @param {object} packet - Validated location packet from locationService
 */
function broadcastLocationUpdate(packet) {
  if (!wss || clients.size === 0) return;

  const messageStr = JSON.stringify({
    type: 'LOCATION_UPDATE',
    data: packet,
  });

  for (const [ws, state] of clients.entries()) {
    if (ws.readyState !== WebSocket.OPEN) continue;

    // Check client filters
    if (state.filters.building_id && state.filters.building_id !== packet.building_id) {
      continue;
    }
    if (state.filters.floor_id && state.filters.floor_id !== packet.floor_id) {
      continue;
    }
    if (state.filters.device_id && state.filters.device_id !== packet.device_id) {
      continue;
    }

    ws.send(messageStr);
  }
}

/**
 * Returns count of currently active WebSocket clients
 */
function getConnectedClientsCount() {
  return clients.size;
}

/**
 * Gracefully close WebSocket server
 */
function closeWebSocketServer() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  locationService.removeLocationListener(broadcastLocationUpdate);
  if (wss) {
    for (const [ws] of clients.entries()) {
      ws.terminate();
    }
    clients.clear();
    wss.close();
    wss = null;
  }
}

module.exports = {
  initWebSocketServer,
  broadcastLocationUpdate,
  getConnectedClientsCount,
  closeWebSocketServer,
};

