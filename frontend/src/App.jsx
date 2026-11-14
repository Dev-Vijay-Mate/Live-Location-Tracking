import React, { useState } from 'react';
import Dashboard from './components/Dashboard';

// Tactical sample personnel units for CQB demonstration
const INITIAL_DEMO_DEVICES = [
  {
    device_id: 'DEMO_DEVICE_001',
    name: 'HIT Alpha-1 (Lead)',
    floor_id: 'GROUND',
    position: { x: -8.0, z: -4.0 },
    status: 'online'
  },
  {
    device_id: 'DEMO_DEVICE_002',
    name: 'HIT Alpha-2 (Breacher)',
    floor_id: 'GROUND',
    position: { x: -6.5, z: -3.5 },
    status: 'online'
  },
  {
    device_id: 'DEMO_DEVICE_003',
    name: 'HIT Bravo-1 (Overwatch)',
    floor_id: 'SECOND',
    position: { x: 10.0, z: 6.0 },
    status: 'online'
  },
  {
    device_id: 'DEMO_DEVICE_004',
    name: 'HIT Charlie-1 (Basement Ingress)',
    floor_id: 'BASEMENT',
    position: { x: 0.0, z: 2.0 },
    status: 'stale'
  },
  {
    device_id: 'DEMO_DEVICE_005',
    name: 'HIT Delta-1 (Support)',
    floor_id: 'FIRST',
    position: { x: 6.0, z: -2.0 },
    status: 'online'
  }
];

function App() {
  const [activeFloor, setActiveFloor] = useState('ALL');
  const [devices, setDevices] = useState(INITIAL_DEMO_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);

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
    />
  );
}

export default App;
