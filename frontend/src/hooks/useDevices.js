import { useState, useEffect, useCallback } from 'react';
import { fetchDevices, fetchLocationHistory } from '../services/api';

// Fallback initial tactical roster ensuring immediate UI rendering
const DEFAULT_TACTICAL_ROSTER = [
  {
    device_id: 'DEMO_DEVICE_001',
    name: 'HIT Alpha-1 (Lead)',
    floor_id: 'GROUND',
    position: { x: 12.5, z: 8.2 },
    status: 'online',
    last_seen: new Date().toISOString()
  },
  {
    device_id: 'DEMO_DEVICE_002',
    name: 'HIT Alpha-2 (Breacher)',
    floor_id: 'GROUND',
    position: { x: 5.5, z: 11.0 },
    status: 'online',
    last_seen: new Date().toISOString()
  },
  {
    device_id: 'DEMO_DEVICE_003',
    name: 'HIT Bravo-1 (Overwatch)',
    floor_id: 'SECOND',
    position: { x: 23.5, z: 10.5 },
    status: 'online',
    last_seen: new Date().toISOString()
  },
  {
    device_id: 'DEMO_DEVICE_004',
    name: 'HIT Charlie-1 (Basement Ingress)',
    floor_id: 'BASEMENT',
    position: { x: 15.0, z: 12.0 },
    status: 'stale',
    last_seen: new Date(Date.now() - 45000).toISOString()
  },
  {
    device_id: 'DEMO_DEVICE_005',
    name: 'HIT Delta-1 (Support)',
    floor_id: 'FIRST',
    position: { x: 18.0, z: 6.0 },
    status: 'online',
    last_seen: new Date().toISOString()
  }
];

export function useDevices() {
  const [devices, setDevices] = useState(DEFAULT_TACTICAL_ROSTER);
  const [trajectories, setTrajectories] = useState(() => {
    // Seed initial breadcrumbs for default units
    const init = {};
    DEFAULT_TACTICAL_ROSTER.forEach((dev) => {
      init[dev.device_id] = [
        {
          position: { ...dev.position },
          floor_id: dev.floor_id,
          timestamp: dev.last_seen
        }
      ];
    });
    return init;
  });
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
    if (!telemetry || !telemetry.device_id || !telemetry.position) return;

    const deviceId = telemetry.device_id;
    const nowIso = telemetry.timestamp || new Date().toISOString();

    // 1. Update devices array
    setDevices((prevDevices) => {
      const idx = prevDevices.findIndex((d) => d.device_id === deviceId);
      if (idx !== -1) {
        const updated = [...prevDevices];
        updated[idx] = {
          ...updated[idx],
          floor_id: telemetry.floor_id,
          position: telemetry.position,
          last_seen: nowIso,
          status: 'online'
        };
        return updated;
      } else {
        const newDevice = {
          device_id: deviceId,
          name: `Unit ${deviceId}`,
          floor_id: telemetry.floor_id,
          position: telemetry.position,
          last_seen: nowIso,
          status: 'online'
        };
        return [...prevDevices, newDevice];
      }
    });

    // 2. Append to historical trajectory breadcrumbs (max 50 points per unit)
    setTrajectories((prev) => {
      const currentList = prev[deviceId] || [];
      const newPoint = {
        position: { x: Number(telemetry.position.x), z: Number(telemetry.position.z) },
        floor_id: telemetry.floor_id,
        timestamp: nowIso
      };
      const updatedList = [...currentList, newPoint].slice(-50);
      return {
        ...prev,
        [deviceId]: updatedList
      };
    });
  }, []);

  // Fetch server-side historical coordinates for a specific unit
  const loadDeviceHistory = useCallback(async (deviceId) => {
    if (!deviceId) return [];
    try {
      const data = await fetchLocationHistory(deviceId, 50);
      if (data && data.history && data.history.length > 0) {
        setTrajectories((prev) => ({
          ...prev,
          [deviceId]: data.history
        }));
        return data.history;
      }
    } catch (e) {
      console.log(`[useDevices] Failed to fetch server history for ${deviceId}`);
    }
    return trajectories[deviceId] || [];
  }, [trajectories]);

  return {
    devices,
    trajectories,
    loading,
    error,
    refreshDevices,
    updateDevicePosition,
    loadDeviceHistory
  };
}
