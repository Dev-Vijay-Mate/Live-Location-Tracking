import React from 'react';
import { Line } from '@react-three/drei';
import { mapTo3DPosition } from '../config/coordinateMapping';

/**
 * DeviceTrail Component
 * Renders a glowing tactical breadcrumb trajectory path in 3D
 * showing where the selected personnel has navigated indoors.
 */
export default function DeviceTrail({
  history = [],
  activeFloor = 'ALL',
  color = '#06b6d4'
}) {
  if (!history || history.length < 2) return null;

  // Filter history to current floor if a floor is isolated
  const filteredHistory = history.filter((item) => {
    if (activeFloor === 'ALL') return true;
    return item.floor_id === activeFloor;
  });

  if (filteredHistory.length < 2) return null;

  // Convert history items to 3D points [x, y, z]
  const points = filteredHistory.map((item) => {
    const [x, y, z] = mapTo3DPosition(item.position, item.floor_id, 0.15);
    return [x, y, z];
  });

  return (
    <group name="Selected_Device_Trajectory">
      {/* 3D Polyline Trail */}
      <Line
        points={points}
        color={color}
        lineWidth={2.5}
        dashed={false}
        transparent
        opacity={0.85}
      />

      {/* Subtle Breadcrumb Nodes along the Path */}
      {points.map((pt, idx) => (
        <mesh key={`trail_node_${idx}`} position={pt}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}
