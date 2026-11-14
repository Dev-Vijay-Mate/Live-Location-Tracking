import React from 'react';
import * as THREE from 'three';
import { BUILDING_CONFIG } from '../config/buildingConfig';

/**
 * BuildingFloor component renders an individual floor level with:
 * - Floor slab
 * - Perimeter structural walls (semi-transparent for interior visibility)
 * - Interior partition walls based on room configuration
 * - Tactical wireframe floor grid
 */
export default function BuildingFloor({
  floorId,
  isIsolated = false,
  isSelected = false
}) {
  const floorConfig = BUILDING_CONFIG.floors[floorId];
  if (!floorConfig) return null;

  const { width, depth, wallHeight, wallThickness, slabThickness } = BUILDING_CONFIG.dimensions;
  const elevation = floorConfig.elevation;

  // Determine opacity based on whether a floor is isolated/selected
  const slabOpacity = isIsolated ? (isSelected ? 0.9 : 0.08) : 0.35;
  const wallOpacity = isIsolated ? (isSelected ? 0.35 : 0.03) : 0.22;
  const showDetails = !isIsolated || isSelected;

  // Wall color scheme based on floor
  const baseColor = floorConfig.color || '#334155';
  const wireColor = floorConfig.wireframeColor || '#0ea5e9';

  return (
    <group position={[0, elevation, 0]} name={`Floor_${floorId}`}>
      {/* 1. Floor Slab (Horizontal Platform) */}
      <mesh position={[0, -slabThickness / 2, 0]} receiveShadow>
        <boxGeometry args={[width, slabThickness, depth]} />
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={slabOpacity}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Wireframe Outline for Slab Edge */}
      {showDetails && (
        <lineSegments position={[0, -slabThickness / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(width, slabThickness, depth)]} />
          <lineBasicMaterial color={wireColor} transparent opacity={isSelected ? 0.9 : 0.4} />
        </lineSegments>
      )}

      {/* 2. Perimeter Walls (Semi-transparent for CQB tactical line-of-sight) */}
      {showDetails && (
        <group name="Perimeter_Walls">
          {/* North Wall (Back: +Z) */}
          <mesh position={[0, wallHeight / 2, depth / 2]}>
            <boxGeometry args={[width, wallHeight, wallThickness]} />
            <meshStandardMaterial
              color="#1e293b"
              transparent
              opacity={wallOpacity}
              roughness={0.5}
            />
          </mesh>

          {/* South Wall (Front: -Z) */}
          <mesh position={[0, wallHeight / 2, -depth / 2]}>
            <boxGeometry args={[width, wallHeight, wallThickness]} />
            <meshStandardMaterial
              color="#1e293b"
              transparent
              opacity={wallOpacity}
              roughness={0.5}
            />
          </mesh>

          {/* West Wall (Left: -X) */}
          <mesh position={[-width / 2, wallHeight / 2, 0]}>
            <boxGeometry args={[wallThickness, wallHeight, depth]} />
            <meshStandardMaterial
              color="#1e293b"
              transparent
              opacity={wallOpacity}
              roughness={0.5}
            />
          </mesh>

          {/* East Wall (Right: +X) */}
          <mesh position={[width / 2, wallHeight / 2, 0]}>
            <boxGeometry args={[wallThickness, wallHeight, depth]} />
            <meshStandardMaterial
              color="#1e293b"
              transparent
              opacity={wallOpacity}
              roughness={0.5}
            />
          </mesh>
        </group>
      )}

      {/* 3. Interior Partition Walls (Corridors and Wing Dividers) */}
      {showDetails && (
        <group name="Interior_Partitions">
          {/* West Corridor Wall (X = -3.5) with central doorway opening */}
          <mesh position={[-3.5, wallHeight / 2, -5]}>
            <boxGeometry args={[wallThickness, wallHeight, 8]} />
            <meshStandardMaterial color="#0f172a" transparent opacity={wallOpacity * 0.8} />
          </mesh>
          <mesh position={[-3.5, wallHeight / 2, 5]}>
            <boxGeometry args={[wallThickness, wallHeight, 8]} />
            <meshStandardMaterial color="#0f172a" transparent opacity={wallOpacity * 0.8} />
          </mesh>

          {/* East Corridor Wall (X = +3.5) with central doorway opening */}
          <mesh position={[3.5, wallHeight / 2, -5]}>
            <boxGeometry args={[wallThickness, wallHeight, 8]} />
            <meshStandardMaterial color="#0f172a" transparent opacity={wallOpacity * 0.8} />
          </mesh>
          <mesh position={[3.5, wallHeight / 2, 5]}>
            <boxGeometry args={[wallThickness, wallHeight, 8]} />
            <meshStandardMaterial color="#0f172a" transparent opacity={wallOpacity * 0.8} />
          </mesh>

          {/* West Wing Room Divider (Z = 0) */}
          <mesh position={[-9, wallHeight / 2, 0]}>
            <boxGeometry args={[10, wallHeight, wallThickness]} />
            <meshStandardMaterial color="#0f172a" transparent opacity={wallOpacity * 0.6} />
          </mesh>

          {/* East Wing Room Divider (Z = 0) */}
          <mesh position={[9, wallHeight / 2, 0]}>
            <boxGeometry args={[10, wallHeight, wallThickness]} />
            <meshStandardMaterial color="#0f172a" transparent opacity={wallOpacity * 0.6} />
          </mesh>
        </group>
      )}

      {/* 4. Floor Grid Guide (Tactical Coordinate Overlay) */}
      {showDetails && (
        <gridHelper
          args={[Math.max(width, depth), 15, wireColor, '#1e293b']}
          position={[0, 0.01, 0]}
        />
      )}
    </group>
  );
}
