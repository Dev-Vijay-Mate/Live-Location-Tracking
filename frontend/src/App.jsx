import React, { useState } from 'react';
import Building from './three/Building';

// Sample demonstration personnel units for initial spatial rendering test
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
    name: 'HIT Bravo-1 (Sniper/Overwatch)',
    floor_id: 'SECOND',
    position: { x: 10.0, z: 6.0 },
    status: 'online'
  },
  {
    device_id: 'DEMO_DEVICE_004',
    name: 'HIT Charlie-1 (Basement Entry)',
    floor_id: 'BASEMENT',
    position: { x: 0.0, z: 2.0 },
    status: 'stale'
  }
];

function App() {
  const [activeFloor, setActiveFloor] = useState('ALL');
  const [devices] = useState(INITIAL_DEMO_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Top Navigation Bar */}
      <header style={{
        height: '56px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-cyan)',
            boxShadow: '0 0 10px var(--accent-cyan)'
          }} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            NSG CQB LIVE TRACKING <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 400 }}>// COMMAND & CONTROL</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>BUILDING: <strong style={{ color: 'var(--text-primary)' }}>DEMO_BLDG_001</strong></span>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--accent-green)',
            color: 'var(--accent-green)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)'
          }}>3D ENGINE ACTIVE</span>
        </div>
      </header>

      {/* Main 3D Spatial Canvas */}
      <main style={{ flex: 1, position: 'relative' }}>
        <Building
          activeFloor={activeFloor}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
        />
      </main>
    </div>
  );
}

export default App;
