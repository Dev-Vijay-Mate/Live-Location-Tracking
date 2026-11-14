import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { mapTo3DPosition } from '../config/coordinateMapping';

/**
 * Single Device Marker with 3D beacon and status indicator
 */
function SingleMarker({
  device,
  isSelected,
  onSelect
}) {
  const meshRef = useRef();
  const ringRef = useRef();

  const [x, y, z] = mapTo3DPosition(device.position, device.floor_id);

  // Status color resolution
  const statusColors = {
    online: '#10b981',   // Emerald green
    stale: '#f59e0b',    // Amber
    offline: '#ef4444'   // Crimson
  };
  const markerColor = statusColors[device.status] || '#06b6d4';

  // Animation: Gentle hover and pulsing ring
  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = y + Math.sin(elapsed * 3) * 0.08;
      meshRef.current.rotation.y = elapsed * 1.5;
    }
    if (ringRef.current) {
      const scale = 1 + (Math.sin(elapsed * 4) * 0.2);
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Ground Projection Ring */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.35, 0]}
      >
        <ringGeometry args={[0.3, 0.45, 24]} />
        <meshBasicMaterial
          color={markerColor}
          transparent
          opacity={0.6}
          side={2}
        />
      </mesh>

      {/* Floating 3D Marker (Octahedron / Diamond) */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelect) onSelect(device.device_id);
        }}
      >
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={isSelected ? 0.9 : 0.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Tactical Label Badge */}
      <Html
        position={[0, 0.65, 0]}
        center
        distanceFactor={20}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          padding: '2px 6px',
          background: isSelected ? 'rgba(6, 182, 212, 0.9)' : 'rgba(15, 23, 42, 0.85)',
          color: isSelected ? '#000' : '#f8fafc',
          border: `1px solid ${markerColor}`,
          borderRadius: '3px',
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: markerColor
          }} />
          {device.name || device.device_id}
        </div>
      </Html>
    </group>
  );
}

/**
 * DeviceMarkers renders all tracked devices inside the 3D building
 */
export default function DeviceMarkers({
  devices = [],
  activeFloor = 'ALL',
  selectedDeviceId = null,
  onSelectDevice = null
}) {
  // Filter devices if a specific floor is isolated
  const visibleDevices = devices.filter((device) => {
    if (activeFloor === 'ALL') return true;
    return device.floor_id === activeFloor;
  });

  return (
    <group name="Device_Markers">
      {visibleDevices.map((device) => (
        <SingleMarker
          key={device.device_id}
          device={device}
          isSelected={device.device_id === selectedDeviceId}
          onSelect={onSelectDevice}
        />
      ))}
    </group>
  );
}
