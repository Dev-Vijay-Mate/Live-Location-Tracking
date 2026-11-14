import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import BuildingModel from './BuildingModel';
import DeviceMarker from './DeviceMarker';
import {
  DIMENSIONS,
  getFloorElevation,
  normalizeFloorId,
  getFloorConfig,
  ORDERED_FLOOR_IDS
} from './buildingConfig';

/**
 * Camera Rig that smoothly animates camera position & OrbitControls target
 * when selectedFloor or camera preset changes.
 */
function CameraController({ selectedFloor, cameraPreset }) {
  const { camera } = useThree();
  const controlsRef = useThree((state) => state.controls);

  const targetElevation = selectedFloor === 'ALL'
    ? 2.0
    : getFloorElevation(selectedFloor);

  const desiredTarget = useRef(new THREE.Vector3(DIMENSIONS.width / 2, targetElevation, DIMENSIONS.depth / 2));
  const desiredCamPos = useRef(new THREE.Vector3(42, 32, 40));

  useEffect(() => {
    const centerX = DIMENSIONS.width / 2;
    const centerZ = DIMENSIONS.depth / 2;
    const elev = selectedFloor === 'ALL' ? 2.0 : getFloorElevation(selectedFloor);

    desiredTarget.current.set(centerX, elev, centerZ);

    if (cameraPreset === 'top') {
      desiredCamPos.current.set(centerX, elev + 32, centerZ + 0.1);
    } else if (cameraPreset === 'side') {
      desiredCamPos.current.set(centerX, elev + 6, centerZ + 36);
    } else if (cameraPreset === 'iso') {
      desiredCamPos.current.set(centerX + 26, elev + 22, centerZ + 26);
    } else {
      // Default tactical perspective
      if (selectedFloor === 'ALL') {
        desiredCamPos.current.set(centerX + 27, 30, centerZ + 28);
      } else {
        desiredCamPos.current.set(centerX + 22, elev + 14, centerZ + 22);
      }
    }
  }, [selectedFloor, cameraPreset]);

  useFrame((_, delta) => {
    const factor = 1 - Math.exp(-6 * delta);

    if (controlsRef && controlsRef.target) {
      controlsRef.target.lerp(desiredTarget.current, factor);
      controlsRef.update();
    }
    camera.position.lerp(desiredCamPos.current, factor);
  });

  return null;
}

/**
 * Scene Lights & Atmosphere
 */
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[35, 50, 30]}
        intensity={1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={120}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      {/* Cool blue tactical rim / fill lights */}
      <directionalLight position={[-25, 25, -20]} intensity={0.5} color="#38bdf8" />
      <pointLight position={[DIMENSIONS.width / 2, -2, DIMENSIONS.depth / 2]} intensity={0.6} color="#0284c7" />
    </>
  );
}

/**
 * BuildingCanvas Component
 * 
 * Main 3D Canvas container integrating:
 * - Multi-Storey 3D Building model with floor isolation
 * - Smooth dynamic device markers with real-time coordinate interpolation
 * - Interactive OrbitControls with smart polar clamps and camera preset transitions
 * - Tactical UI status overlay & camera preset shortcuts
 * 
 * @param {Array} props.devices - Array of device telemetry objects
 * @param {string} props.selectedFloor - 'ALL' | 'BASEMENT' | 'FLOOR_00' | 'FLOOR_01' | 'FLOOR_02'
 * @param {string|null} props.selectedDeviceId - Currently selected device ID
 * @param {Function} props.onSelectDevice - Callback when a marker is clicked
 * @param {Function} props.onSelectFloor - Optional floor selection callback
 * @param {boolean} props.showOverlay - Toggle tactical HUD overlay
 */
export default function BuildingCanvas({
  devices = [],
  selectedFloor = 'ALL',
  selectedDeviceId = null,
  onSelectDevice = null,
  onSelectFloor = null,
  showOverlay = true,
  style = {},
  className = ''
}) {
  const [cameraPreset, setCameraPreset] = useState('default');

  const activeFloorConfig = selectedFloor !== 'ALL'
    ? getFloorConfig(selectedFloor)
    : null;

  const devicesOnActiveFloor = devices.filter((d) => {
    if (selectedFloor === 'ALL') return true;
    return normalizeFloorId(d.floor_id) === normalizeFloorId(selectedFloor);
  });

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#090d16',
        overflow: 'hidden',
        ...style
      }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <PerspectiveCamera
          makeDefault
          position={[DIMENSIONS.width / 2 + 27, 30, DIMENSIONS.depth / 2 + 28]}
          fov={45}
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={8}
          maxDistance={85}
          maxPolarAngle={Math.PI / 2 + 0.12} // Prevents camera from sinking awkwardly under basement
          target={[DIMENSIONS.width / 2, 2.0, DIMENSIONS.depth / 2]}
        />

        <SceneLighting />

        <CameraController
          selectedFloor={selectedFloor}
          cameraPreset={cameraPreset}
        />

        <Suspense fallback={null}>
          <BuildingModel selectedFloor={selectedFloor} />
          <DeviceMarker
            devices={devices}
            selectedFloor={selectedFloor}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={onSelectDevice}
          />
        </Suspense>
      </Canvas>

      {/* Tactical HUD Overlay */}
      {showOverlay && (
        <>
          {/* Top-Right Camera Preset Controls */}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            display: 'flex',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '6px',
            borderRadius: '6px',
            border: '1px solid #1e293b',
            backdropFilter: 'blur(8px)',
            zIndex: 10
          }}>
            <button
              type="button"
              onClick={() => setCameraPreset('default')}
              style={{
                background: cameraPreset === 'default' ? '#0284c7' : '#1e293b',
                color: '#fff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer'
              }}
            >
              Perspective
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('iso')}
              style={{
                background: cameraPreset === 'iso' ? '#0284c7' : '#1e293b',
                color: '#fff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer'
              }}
            >
              Isometric
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('top')}
              style={{
                background: cameraPreset === 'top' ? '#0284c7' : '#1e293b',
                color: '#fff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer'
              }}
            >
              Top-Down
            </button>
          </div>

          {/* Bottom-Left Tactical Status Badge */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(15, 23, 42, 0.90)',
            border: '1px solid #1e293b',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#94a3b8',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px #10b981'
              }} />
              <span style={{ color: '#06b6d4', fontWeight: 700 }}>VIEW:</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                {selectedFloor === 'ALL'
                  ? 'ALL FLOORS (FULL COMPLEX)'
                  : `${activeFloorConfig?.name?.toUpperCase() || selectedFloor} [${activeFloorConfig?.shortName || ''}]`}
              </span>
            </div>

            <span style={{ color: '#334155' }}>|</span>

            <div>
              <span style={{ color: '#94a3b8' }}>TRACKED UNITS: </span>
              <strong style={{ color: '#38bdf8' }}>{devicesOnActiveFloor.length}</strong>
              <span style={{ color: '#64748b' }}> / {devices.length}</span>
            </div>

            {selectedDeviceId && (
              <>
                <span style={{ color: '#334155' }}>|</span>
                <div style={{ color: '#fbbf24' }}>
                  SELECTED: <strong>{selectedDeviceId}</strong>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
