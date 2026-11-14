import React, { useState, useEffect } from 'react';
import BuildingCanvas from './components/building3d/BuildingCanvas';
import {
  INITIAL_MOCK_DEVICES,
  simulateMovementTick
} from './components/building3d/mockDevices';
import {
  ORDERED_FLOOR_IDS,
  FLOOR_CONFIGS,
  resolveRoom
} from './components/building3d/buildingConfig';

function App() {
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [devices, setDevices] = useState(INITIAL_MOCK_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState('DEVICE_001');
  const [isSimulating, setIsSimulating] = useState(false);

  // Periodic real-time position updates to test smooth lerp/gliding
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setDevices((prevDevices) => simulateMovementTick(prevDevices));
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const selectedDevice = devices.find((d) => d.device_id === selectedDeviceId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#0a0e17' }}>
      {/* Top Tactical Command Header */}
      <header style={{
        height: '60px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#06b6d4',
            boxShadow: '0 0 12px #06b6d4'
          }} />
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#f8fafc',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              LIVE INDOOR LOCATION TRACKING <span style={{ color: '#0ea5e9', fontSize: '0.85rem' }}>// 3D SPATIAL ENGINE</span>
            </h1>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Member 1 Module: Multi-Storey 3D Model & Real-time Location Visualization
            </span>
          </div>
        </div>

        {/* Live Simulation Controls & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => setIsSimulating(!isSimulating)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '4px',
              backgroundColor: isSimulating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${isSimulating ? '#ef4444' : '#10b981'}`,
              color: isSimulating ? '#f87171' : '#34d399',
              fontSize: '0.78rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isSimulating ? '#ef4444' : '#10b981'
            }} />
            {isSimulating ? 'PAUSE MOVEMENT' : 'TEST REAL-TIME GLIDE (LERP)'}
          </button>

          <span style={{
            padding: '5px 10px',
            borderRadius: '4px',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid #0284c7',
            color: '#38bdf8',
            fontSize: '0.75rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600
          }}>
            Y-UP COORDINATES VERIFIED
          </span>
        </div>
      </header>

      {/* Main 3D Viewport with Quick Floor Selector Bar */}
      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
        {/* Left Floating Floor Selector for immediate verification */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 15,
          background: 'rgba(15, 23, 42, 0.90)',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '12px',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '180px'
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#94a3b8',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.05em'
          }}>
            FLOOR SELECTOR
          </span>

          <button
            type="button"
            onClick={() => setSelectedFloor('ALL')}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: selectedFloor === 'ALL' ? '1px solid #38bdf8' : '1px solid #334155',
              background: selectedFloor === 'ALL' ? '#0284c7' : '#1e293b',
              color: '#ffffff',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              textAlign: 'left',
              cursor: 'pointer',
              fontWeight: selectedFloor === 'ALL' ? 700 : 500
            }}
          >
            All Floors (Overview)
          </button>

          {ORDERED_FLOOR_IDS.slice().reverse().map((floorId) => {
            const config = FLOOR_CONFIGS[floorId];
            const isCurrent = selectedFloor === floorId;
            return (
              <button
                key={floorId}
                type="button"
                onClick={() => setSelectedFloor(floorId)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: isCurrent ? '1px solid #38bdf8' : '1px solid #334155',
                  background: isCurrent ? '#0284c7' : '#1e293b',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: isCurrent ? 700 : 500,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{config.shortName} - {config.name}</span>
                <span style={{ fontSize: '9px', opacity: 0.75 }}>
                  {config.elevation >= 0 ? `+${config.elevation}m` : `${config.elevation}m`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Device Telemetry Card */}
        {selectedDevice && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 15,
            background: 'rgba(15, 23, 42, 0.90)',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '12px 16px',
            backdropFilter: 'blur(10px)',
            width: '260px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: '#e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#06b6d4', fontWeight: 700 }}>TELEMETRY CONTRACT</span>
              <span style={{
                fontSize: '9px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: selectedDevice.status === 'online' ? '#065f46' : '#78350f',
                color: selectedDevice.status === 'online' ? '#34d399' : '#f59e0b'
              }}>
                {selectedDevice.status?.toUpperCase() || 'ONLINE'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10.5px' }}>
              <div><strong>ID:</strong> {selectedDevice.device_id}</div>
              <div><strong>Name:</strong> {selectedDevice.name}</div>
              <div><strong>Floor:</strong> {selectedDevice.floor_id}</div>
              <div>
                <strong>Zone:</strong> {resolveRoom(selectedDevice.position.x, selectedDevice.position.z, selectedDevice.floor_id)}
              </div>
              <div>
                <strong>Coords:</strong> X={selectedDevice.position.x.toFixed(2)}m, Z={selectedDevice.position.z.toFixed(2)}m
              </div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', wordBreak: 'break-all' }}>
                Timestamp: {selectedDevice.timestamp}
              </div>
            </div>
          </div>
        )}

        {/* 3D Canvas Visualizer */}
        <BuildingCanvas
          devices={devices}
          selectedFloor={selectedFloor}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          onSelectFloor={setSelectedFloor}
        />
      </div>
    </div>
  );
}

export default App;
