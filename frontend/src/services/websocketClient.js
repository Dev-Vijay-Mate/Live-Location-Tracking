/**
 * Resilient WebSocket Client for Real-Time Location Telemetry
 * Adheres strictly to docs/API_CONTRACT.md WebSocket Protocol
 */

export class LocationWebSocketClient {
  constructor(customUrl = null) {
    this.customUrl = customUrl;
    this.socket = null;
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 10000;
    this.isExplicitlyClosed = false;

    // Event listeners
    this.listeners = {
      location_update: new Set(),
      device_status: new Set(),
      connection_ack: new Set(),
      status_change: new Set()
    };
  }

  /**
   * Resolves appropriate WebSocket target URL
   */
  getSocketUrl() {
    if (this.customUrl) return this.customUrl;
    if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;

    // Use current host and Vite proxy in browser environment
    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/locations`;
  }

  /**
   * Connects to backend WebSocket endpoint
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    const url = this.getSocketUrl();
    console.log(`[WS] Connecting to telemetry stream at: ${url}`);

    try {
      this.socket = new WebSocket(url);
    } catch (err) {
      console.warn('[WS] Failed to instantiate WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      console.log('[WS] Connected to live location telemetry stream.');
      this.reconnectAttempts = 0;
      this.notifyStatus(true);
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        if (event.data === 'pong') return; // Heartbeat pong
        const message = JSON.parse(event.data);
        this.dispatch(message);
      } catch (err) {
        console.warn('[WS] Error parsing incoming telemetry message:', err);
      }
    };

    this.socket.onerror = (err) => {
      console.warn('[WS] Socket error encountered:', err);
    };

    this.socket.onclose = (event) => {
      this.stopHeartbeat();
      this.notifyStatus(false);
      console.log(`[WS] Connection closed (code: ${event.code}). Clean: ${event.wasClean}`);

      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Schedules an automatic reconnection attempt with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    console.log(`[WS] Reconnecting in ${(delay / 1000).toFixed(1)}s (Attempt #${this.reconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Starts periodic heartbeat to maintain socket across NATs and load balancers
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('ping');
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Closes connection explicitly (prevents auto-reconnect)
   */
  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.notifyStatus(false);
  }

  /**
   * Event listener registration
   */
  on(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].add(callback);
    }
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].delete(callback);
    }
  }

  dispatch(message) {
    const { type, data } = message;
    if (type && this.listeners[type]) {
      this.listeners[type].forEach((cb) => {
        try {
          cb(data || message);
        } catch (e) {
          console.error(`[WS] Error in ${type} subscriber:`, e);
        }
      });
    }
  }

  notifyStatus(isConnected) {
    if (this.listeners.status_change) {
      this.listeners.status_change.forEach((cb) => {
        try {
          cb(isConnected);
        } catch (e) {
          console.error('[WS] Error in status_change subscriber:', e);
        }
      });
    }
  }
}

// Global default singleton
export const websocketClient = new LocationWebSocketClient();
