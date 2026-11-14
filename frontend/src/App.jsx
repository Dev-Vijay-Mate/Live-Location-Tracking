import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import {
  INITIAL_MOCK_DEVICES,
  simulateMovementTick
} from './components/building3d/mockDevices';

function App() {
  const [activeFloor, setActiveFloor] = useState('ALL');
  const [devices, setDevices] = useState(INITIAL_MOCK_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState('DEVICE_001');
  const [isConnected, setIsConnected] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  // Real-time movement simulation for smooth 3D coordinate interpolation (lerp)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setDevices((prevDevices) => simulateMovementTick(prevDevices));
      setLastUpdated(new Date().toLocaleTimeString());
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating]);

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
      lastUpdated={lastUpdated}
    />
  );
}

export default App;
