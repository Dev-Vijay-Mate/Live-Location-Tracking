import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Center } from '@react-three/drei';
import BuildingFloor from './BuildingFloor';
import DeviceMarkers from './DeviceMarkers';
import { ORDERED_FLOOR_IDS, BUILDING_CONFIG } from '../config/buildingConfig';

/**
 * 3D Scene Content including lighting, floors, and markers
 */
function SceneContent({
  activeFloor = 'ALL',
  devices = [],
  selectedDeviceId = null,
  onSelectDevice = null
}) {
  const isIsolated = activeFloor !== 'ALL';

  return (
    <>
      {/* Tactical Ambient & Key Lighting */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[20, 35, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-20, 15, -20]} intensity={0.4} color="#38bdf8" />
      <pointLight position={[0, -2, 0]} intensity={0.5} color="#0284c7" />

      {/* Building Multi-Storey Floors */}
      <group name="Building_Structure">
        {ORDERED_FLOOR_IDS.map((floorId) => (
          <BuildingFloor
            key={floorId}
            floorId={floorId}
            isIsolated={isIsolated}
            isSelected={activeFloor === floorId}
          />
        ))}
      </group>

      {/* Live Tactical Personnel / Device Markers */}
      <DeviceMarkers
        devices={devices}
        activeFloor={activeFloor}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={onSelectDevice}
      />

      {/* Tactical Ground Grid Below Basement */}
      <gridHelper
        args={[60, 30, '#0284c7', '#0f172a']}
        position={[0, BUILDING_CONFIG.floors.BASEMENT.elevation - 1.0, 0]}
      />
    </>
  );
}

/**
 * Main 3D Building Viewer Component
 * 
 * Provides an interactive Canvas with OrbitControls, multi-storey floor visualization,
 * camera controls, and real-time device marker rendering.
 */
export default function Building({
  activeFloor = 'ALL',
  devices = [],
  selectedDeviceId = null,
  onSelectDevice = null
}) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0e17' }}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <PerspectiveCamera makeDefault position={[26, 22, 28]} fov={45} />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={10}
          maxDistance={75}
          maxPolarAngle={Math.PI / 2 + 0.1} // Prevent looking entirely from below
          target={[0, 2, 0]}
        />
        <Suspense fallback={null}>
          <SceneContent
            activeFloor={activeFloor}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={onSelectDevice}
          />
        </Suspense>
      </Canvas>

      {/* 3D Scene Status Badge */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid #334155',
        borderRadius: '4px',
        padding: '6px 12px',
        fontSize: '11px',
        fontFamily: 'JetBrains Mono, monospace',
        color: '#94a3b8',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ color: '#06b6d4' }}>MODE:</span>
        <span style={{ color: '#f8fafc', fontWeight: 600 }}>
          {activeFloor === 'ALL' ? 'ALL FLOORS (CQB FULL)' : `FLOOR ISOLATION [${activeFloor}]`}
        </span>
        <span style={{ color: '#475569' }}>|</span>
        <span>L-CLICK + DRAG: ROTATE</span>
        <span style={{ color: '#475569' }}>|</span>
        <span>SCROLL: ZOOM</span>
      </div>
    </div>
  );
}
