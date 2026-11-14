import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  mapPositionTo3D,
  normalizeFloorId,
  getFloorConfig,
  resolveRoom
} from './buildingConfig';

/**
 * Resolves device operational status from explicit status prop or timestamp age.
 * - online: updated < 30s ago
 * - stale: updated < 120s ago
 * - offline: updated >= 120s ago or unreachable
 */
export function resolveDeviceStatus(device) {
  if (device.status) {
    const s = String(device.status).toLowerCase();
    if (s === 'online' || s === 'active') return 'online';
    if (s === 'stale' || s === 'warning') return 'stale';
    if (s === 'offline' || s === 'inactive') return 'offline';
  }

  if (device.timestamp) {
    const lastTime = new Date(device.timestamp).getTime();
    if (!isNaN(lastTime)) {
      const ageSeconds = (Date.now() - lastTime) / 1000;
      if (ageSeconds <= 30) return 'online';
      if (ageSeconds <= 120) return 'stale';
      return 'offline';
    }
  }

  return 'online';
}

const STATUS_THEMES = {
  online: {
    primary: '#10b981', // Emerald green
    emissive: '#059669',
    glow: 'rgba(16, 185, 129, 0.45)',
    labelBg: 'rgba(6, 78, 59, 0.9)',
    pulseSpeed: 4.0
  },
  stale: {
    primary: '#f59e0b', // Amber
    emissive: '#d97706',
    glow: 'rgba(245, 158, 11, 0.45)',
    labelBg: 'rgba(120, 53, 15, 0.9)',
    pulseSpeed: 2.0
  },
  offline: {
    primary: '#ef4444', // Crimson
    emissive: '#dc2626',
    glow: 'rgba(239, 68, 68, 0.3)',
    labelBg: 'rgba(127, 29, 29, 0.9)',
    pulseSpeed: 0.8
  }
};

/**
 * Single 3D Device Marker with smooth position interpolation (lerp),
 * pulsing ground beacon, tactical pin, and floating info badge.
 */
export function SingleDeviceMarker({
  device,
  isSelected = false,
  onSelect = null
}) {
  const groupRef = useRef();
  const beaconMeshRef = useRef();
  const groundRingRef = useRef();
  const targetPos = useRef([0, 0, 0]);

  const status = resolveDeviceStatus(device);
  const theme = STATUS_THEMES[status] || STATUS_THEMES.online;

  // Calculate target 3D world coordinate from current device telemetry
  const destination = useMemo(() => {
    return mapPositionTo3D(device.position, device.floor_id, 0.8);
  }, [device.position?.x, device.position?.z, device.floor_id]);

  // Keep targetPos ref updated
  useEffect(() => {
    targetPos.current = destination;
    // On first mount, snap directly to position to avoid flying in from (0,0,0)
    if (groupRef.current && groupRef.current.position.lengthSq() === 0) {
      groupRef.current.position.set(...destination);
    }
  }, [destination]);

  const floorConfig = getFloorConfig(device.floor_id);
  const currentRoom = resolveRoom(device.position?.x, device.position?.z, device.floor_id);

  // Smooth position interpolation and tactical animations
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Frame-rate independent exponential smoothing towards target coordinates
    const lerpFactor = 1 - Math.exp(-7.5 * delta);
    groupRef.current.position.x += (targetPos.current[0] - groupRef.current.position.x) * lerpFactor;
    groupRef.current.position.y += (targetPos.current[1] - groupRef.current.position.y) * lerpFactor;
    groupRef.current.position.z += (targetPos.current[2] - groupRef.current.position.z) * lerpFactor;

    const elapsed = state.clock.getElapsedTime();

    // Floating bob animation for beacon diamond
    if (beaconMeshRef.current) {
      beaconMeshRef.current.rotation.y = elapsed * 1.8;
      beaconMeshRef.current.position.y = 0.35 + Math.sin(elapsed * theme.pulseSpeed) * 0.08;
    }

    // Ground wave pulse effect
    if (groundRingRef.current) {
      const ringScale = 1.0 + ((elapsed * (theme.pulseSpeed * 0.4)) % 1.0) * 0.8;
      groundRingRef.current.scale.set(ringScale, ringScale, 1);
      const ringOpacity = Math.max(0, 0.8 - ((elapsed * (theme.pulseSpeed * 0.4)) % 1.0));
      if (groundRingRef.current.material) {
        groundRingRef.current.material.opacity = ringOpacity;
      }
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(device.device_id);
    }
  };

  return (
    <group
      ref={groupRef}
      name={`DeviceMarker_${device.device_id}`}
      onClick={handleClick}
    >
      {/* 1. Ground Projection Shadow & Pulsing Ring */}
      <mesh
        ref={groundRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.75, 0]}
      >
        <ringGeometry args={[0.25, 0.45, 32]} />
        <meshBasicMaterial
          color={theme.primary}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Vertical Light Guide Line (Connecting ground spot to marker) */}
      <lineSegments position={[0, -0.375, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, -0.375, 0, 0, 0.375, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={theme.primary}
          transparent
          opacity={isSelected ? 0.9 : 0.4}
        />
      </lineSegments>

      {/* 3. Tactical 3D Beacon Shape (Dual Pyramids / Octahedron Pin) */}
      <mesh
        ref={beaconMeshRef}
        castShadow
      >
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          color={theme.primary}
          emissive={theme.emissive}
          emissiveIntensity={isSelected ? 1.0 : 0.45}
          roughness={0.15}
          metalness={0.8}
        />
      </mesh>

      {/* Selection Outer Glow Ring */}
      {isSelected && (
        <mesh position={[0, 0.35, 0]}>
          <torusGeometry args={[0.55, 0.02, 16, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
        </mesh>
      )}

      {/* 4. Floating Tactical ID Badge & Live Telemetry */}
      <Html
        position={[0, 1.05, 0]}
        center
        distanceFactor={22}
        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
      >
        <div
          onClick={handleClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '4px 8px',
            background: isSelected ? 'rgba(14, 165, 233, 0.95)' : 'rgba(15, 23, 42, 0.92)',
            border: `1px solid ${isSelected ? '#38bdf8' : theme.primary}`,
            borderRadius: '4px',
            color: isSelected ? '#030712' : '#f8fafc',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            boxShadow: isSelected
              ? '0 0 16px rgba(56, 189, 248, 0.7), 0 4px 12px rgba(0,0,0,0.5)'
              : `0 2px 8px ${theme.glow}, 0 2px 6px rgba(0,0,0,0.5)`,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
        >
          {/* Header Row: Status Beacon + Device ID + Floor Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: theme.primary,
              boxShadow: `0 0 6px ${theme.primary}`,
              display: 'inline-block'
            }} />
            <strong style={{ fontSize: '11px', letterSpacing: '0.02em' }}>
              {device.device_id}
            </strong>
            <span style={{
              padding: '1px 4px',
              borderRadius: '2px',
              background: isSelected ? '#030712' : '#1e293b',
              color: isSelected ? '#38bdf8' : '#94a3b8',
              fontSize: '8px',
              fontWeight: 700
            }}>
              {floorConfig.shortName}
            </span>
          </div>

          {/* Sub Row: Room / Zone and Coordinates */}
          <div style={{
            fontSize: '8.5px',
            color: isSelected ? '#0f172a' : '#94a3b8',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <span>{currentRoom}</span>
            <span style={{ opacity: 0.8 }}>
              ({device.position?.x?.toFixed(1) ?? '0.0'}, {device.position?.z?.toFixed(1) ?? '0.0'})
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * DeviceMarker Component (Renders all visible markers filtered by selectedFloor)
 */
export default function DeviceMarker({
  devices = [],
  selectedFloor = 'ALL',
  selectedDeviceId = null,
  onSelectDevice = null
}) {
  const canonicalSelected = normalizeFloorId(selectedFloor);
  const isIsolated = selectedFloor !== 'ALL';

  // Filter devices: show all when 'ALL', otherwise only devices on selected floor
  const visibleDevices = useMemo(() => {
    if (!Array.isArray(devices)) return [];
    if (!isIsolated) return devices;

    return devices.filter((d) => normalizeFloorId(d.floor_id) === canonicalSelected);
  }, [devices, isIsolated, canonicalSelected]);

  return (
    <group name="LiveTracking_DeviceMarkers">
      {visibleDevices.map((device) => (
        <SingleDeviceMarker
          key={device.device_id}
          device={device}
          isSelected={device.device_id === selectedDeviceId}
          onSelect={onSelectDevice}
        />
      ))}
    </group>
  );
}

export { DeviceMarker as DeviceMarkers };
