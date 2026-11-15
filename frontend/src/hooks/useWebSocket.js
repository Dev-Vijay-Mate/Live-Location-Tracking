import { useState, useEffect } from 'react';
import { websocketClient } from '../services/websocketClient';

/**
 * Custom React Hook for live WebSocket location streaming
 * 
 * @param {Function} onLocationUpdate - Callback invoked when a location_update arrives
 * @returns {{ isConnected: boolean, lastTelemetry: Object|null }}
 */
export function useWebSocket(onLocationUpdate) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState(null);

  useEffect(() => {
    // 1. Subscribe to connection status changes
    const unsubStatus = websocketClient.on('status_change', (connected) => {
      setIsConnected(connected);
    });

    // 2. Subscribe to incoming location updates
    const unsubLocation = websocketClient.on('location_update', (data) => {
      setLastTelemetry(data);
      if (onLocationUpdate) {
        onLocationUpdate(data);
      }
    });

    // 3. Initiate connection
    websocketClient.connect();

    return () => {
      unsubStatus();
      unsubLocation();
    };
  }, [onLocationUpdate]);

  return {
    isConnected,
    lastTelemetry
  };
}
