import { useState, useEffect, useCallback } from 'react';
import { fetchDevices } from '../services/api';

// Fallback initial tactical roster ensuring immediate UI rendering
const DEFAULT_TACTICAL_ROSTER = [
  {
    device_id: 'DEMO_DEVICE_001',
    name: 'HIT Alpha-1 (Lead)',
    floor_id: 'GROUND',
    position: { x: -8.0, z: -4.0 },
    status: 'online',
    last_seen: new Date().toISOString()
  },
  {
    device_id: 'DEMO_DEVICE_002',
    name: 'HIT Alpha-2 (Breacher)',
    floor_id: 'GROUND',
    position: { x: -6.5, z: -3.5 },
    status: 'online',
    last_seen: new Date().toISOString()
  },
  {
    device_id: 'DEMO_DEVICE_003',
    name: 'HIT Bravo-1 (Overwatch)',
    floor_id: 'SECOND',
    position: { x: 10.0, z: 6.0 },
    status: 'online',
    last_seen: new Date().toISOString()
  },
  {
    device_id: 'DEMO_DEVICE_004',
    name: 'HIT Charlie-1 (Basement Ingress)',
    floor_id: 'BASEMENT',
    position: { x: 0.0, z: 2.0 },
    status: 'stale',
    last_seen: new Date(Date.now() - 45000).toISOString()
  },
  {
    device_id: 'DEMO_DEVICE_005',
    name: 'HIT Delta-1 (Support)',
    floor_id: 'FIRST',
    position: { x: 6.0, z: -2.0 },
    status: 'online',
    last_seen: new Date().toISOString()
  }
];

export function useDevices() {
  const [devices, setDevices] = useState(DEFAULT_TACTICAL_ROSTER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load registered units from backend REST API
  const refreshDevices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchDevices();
      if (data && data.devices && data.devices.length > 0) {
        setDevices(data.devices);
      }
      setError(null);
    } catch (err) {
      console.log('[useDevices] Backend offline, using tactical local roster.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Method to update or merge a live incoming position telemetry
  const updateDevicePosition = useCallback((telemetry) => {
    if (!telemetry || !telemetry.device_id) return;

    setDevices((prevDevices) => {
      const idx = prevDevices.findIndex((d) => d.device_id === telemetry.device_id);
      if (idx !== -1) {
        // Update existing device
        const updated = [...prevDevices];
        updated[idx] = {
          ...updated[idx],
          floor_id: telemetry.floor_id,
          position: telemetry.position,
          last_seen: telemetry.timestamp || new Date().toISOString(),
          status: 'online'
        };
        return updated;
      } else {
        // Append new device
        const newDevice = {
          device_id: telemetry.device_id,
          name: `Unit ${telemetry.device_id}`,
          floor_id: telemetry.floor_id,
          position: telemetry.position,
          last_seen: telemetry.timestamp || new Date().toISOString(),
          status: 'online'
        };
        return [...prevDevices, newDevice];
      }
    });
  }, []);

  return {
    devices,
    loading,
    error,
    refreshDevices,
    updateDevicePosition
  };
}
