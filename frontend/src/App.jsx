import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { useDevices } from './hooks/useDevices';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const [activeFloor, setActiveFloor] = useState('ALL');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isSimulating, setIsSimulating] = useState(true);

  // 1. Manage devices roster state with API fetching and fallback
  const { devices, updateDevicePosition } = useDevices();

  // 2. Connect to live WebSocket telemetry stream
  const { isConnected, lastTelemetry } = useWebSocket(updateDevicePosition);

  // 3. Optional local patrol animation when backend/simulator is offline
  useEffect(() => {
    if (!isSimulating || isConnected) return;

    // Gentle tactical patrol loop in browser when external simulator is not streaming
    const interval = setInterval(() => {
      if (!devices || devices.length === 0) return;
      const targetDevice = devices[Math.floor(Math.random() * devices.length)];
      if (!targetDevice || !targetDevice.position) return;

      const deltaX = (Math.random() - 0.5) * 0.4;
      const deltaZ = (Math.random() - 0.5) * 0.4;

      updateDevicePosition({
        device_id: targetDevice.device_id,
        building_id: 'DEMO_BUILDING_001',
        floor_id: targetDevice.floor_id,
        position: {
          x: targetDevice.position.x + deltaX,
          z: targetDevice.position.z + deltaZ
        },
        source: 'SIMULATION',
        timestamp: new Date().toISOString()
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [isSimulating, isConnected, devices, updateDevicePosition]);

  const toggleSimulation = () => {
    setIsSimulating((prev) => !prev);
  };

  return (
    <Dashboard
      devices={devices}
      activeFloor={activeFloor}
      setActiveFloor={setActiveFloor}
      selectedDeviceId={selectedDeviceId}
      setSelectedDeviceId={setSelectedDeviceId}
      isConnected={isConnected}
      isSimulating={isSimulating}
      onToggleSimulation={toggleSimulation}
      lastUpdated={lastTelemetry?.timestamp}
    />
  );
}

export default App;
