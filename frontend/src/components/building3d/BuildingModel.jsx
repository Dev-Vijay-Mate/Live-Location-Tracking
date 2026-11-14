import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import {
  FLOOR_CONFIGS,
  ORDERED_FLOOR_IDS,
  DIMENSIONS,
  normalizeFloorId
} from './buildingConfig';

/**
 * Renders floor 3D tactical badge on the exterior perimeter
 */
function FloorTacticalLabel({ floorConfig, isSelected, isIsolated }) {
  const { elevation, shortName, name } = floorConfig;
  const isVisible = !isIsolated || isSelected;

  if (!isVisible) return null;

  return (
    <Html
      position={[-1.2, elevation + 1.2, 10]}
      center
      distanceFactor={28}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '3px 8px',
        background: isSelected ? 'rgba(14, 165, 233, 0.95)' : 'rgba(15, 23, 42, 0.85)',
        border: `1px solid ${isSelected ? '#38bdf8' : '#334155'}`,
        borderRadius: '4px',
        color: isSelected ? '#030712' : '#e2e8f0',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px',
        fontWeight: 700,
        boxShadow: isSelected ? '0 0 16px rgba(14, 165, 233, 0.6)' : '0 2px 8px rgba(0,0,0,0.4)',
        whiteSpace: 'nowrap',
        transition: 'all 0.3s ease'
      }}>
        <span style={{
          padding: '1px 4px',
          background: isSelected ? '#0284c7' : '#1e293b',
          color: isSelected ? '#ffffff' : '#38bdf8',
          borderRadius: '2px',
          fontSize: '9px',
          fontWeight: 800
        }}>
          {shortName}
        </span>
        <span>{name.toUpperCase()}</span>
        <span style={{ fontSize: '9px', opacity: 0.8 }}>
          [{elevation >= 0 ? `+${elevation.toFixed(1)}` : elevation.toFixed(1)}m]
        </span>
      </div>
    </Html>
  );
}

/**
 * Individual Floor 3D Structure:
 * Slab + Perimeter Walls + Interior Partitions + Grid + Label
 */
function FloorLevel({ floorId, selectedFloor }) {
  const floorConfig = FLOOR_CONFIGS[floorId];
  if (!floorConfig) return null;

  const canonicalSelected = normalizeFloorId(selectedFloor);
  const isIsolated = selectedFloor !== 'ALL';
  const isSelected = isIsolated && canonicalSelected === floorId;

  // Opacity & visibility logic based on floor isolation
  const slabOpacity = isIsolated ? (isSelected ? 0.92 : 0.08) : 0.45;
  const wallOpacity = isIsolated ? (isSelected ? 0.32 : 0.03) : 0.20;
  const showInterior = !isIsolated || isSelected;

  const { width, depth, wallHeight, wallThickness, slabThickness } = DIMENSIONS;
  const elevation = floorConfig.elevation;
  const centerX = width / 2; // 15m
  const centerZ = depth / 2; // 10m

  // Slab geometry & edge wireframe
  const slabBoxGeom = useMemo(() => new THREE.BoxGeometry(width, slabThickness, depth), [width, slabThickness, depth]);
  const slabEdgesGeom = useMemo(() => new THREE.EdgesGeometry(slabBoxGeom), [slabBoxGeom]);

  const baseColor = floorConfig.color;
  const accentColor = isSelected ? '#38bdf8' : floorConfig.accentColor;

  return (
    <group name={`FloorLevel_${floorId}`}>
      {/* 1. Floor Concrete Slab */}
      <mesh
        position={[centerX, elevation - slabThickness / 2, centerZ]}
        receiveShadow
      >
        <primitive object={slabBoxGeom} attach="geometry" />
        <meshStandardMaterial
          color={isSelected ? '#1e293b' : baseColor}
          roughness={0.5}
          metalness={0.2}
          transparent
          opacity={slabOpacity}
        />
      </mesh>

      {/* Slab Perimeter Wireframe Outline */}
      {showInterior && (
        <lineSegments position={[centerX, elevation - slabThickness / 2, centerZ]}>
          <primitive object={slabEdgesGeom} attach="geometry" />
          <lineBasicMaterial
            color={accentColor}
            transparent
            opacity={isSelected ? 0.95 : 0.4}
            linewidth={isSelected ? 2 : 1}
          />
        </lineSegments>
      )}

      {/* 2. Tactical Floor Grid Overlay */}
      {showInterior && (
        <gridHelper
          args={[30, 30, accentColor, '#1e293b']}
          position={[centerX, elevation + 0.015, centerZ]}
        />
      )}

      {/* 3. Perimeter Walls (Semi-transparent for tactical line of sight) */}
      {showInterior && (
        <group name="Perimeter_Walls">
          {/* North Wall (+Z, back) */}
          <mesh position={[centerX, elevation + wallHeight / 2, depth]}>
            <boxGeometry args={[width, wallHeight, wallThickness]} />
            <meshStandardMaterial
              color="#0f172a"
              transparent
              opacity={wallOpacity}
              roughness={0.4}
            />
          </mesh>

          {/* South Wall (-Z, front) */}
          <mesh position={[centerX, elevation + wallHeight / 2, 0]}>
            <boxGeometry args={[width, wallHeight, wallThickness]} />
            <meshStandardMaterial
              color="#0f172a"
              transparent
              opacity={wallOpacity}
              roughness={0.4}
            />
          </mesh>

          {/* West Wall (-X, left) */}
          <mesh position={[0, elevation + wallHeight / 2, centerZ]}>
            <boxGeometry args={[wallThickness, wallHeight, depth]} />
            <meshStandardMaterial
              color="#0f172a"
              transparent
              opacity={wallOpacity}
              roughness={0.4}
            />
          </mesh>

          {/* East Wall (+X, right) */}
          <mesh position={[width, elevation + wallHeight / 2, centerZ]}>
            <boxGeometry args={[wallThickness, wallHeight, depth]} />
            <meshStandardMaterial
              color="#0f172a"
              transparent
              opacity={wallOpacity}
              roughness={0.4}
            />
          </mesh>
        </group>
      )}

      {/* 4. Interior Partition Walls & Tactical Room Layouts */}
      {showInterior && (
        <group name="Interior_Partitions">
          {/* West Corridor Partition (X = 10) with doorway opening at Z = 9 to 11 */}
          <mesh position={[10, elevation + wallHeight / 2, 4.5]}>
            <boxGeometry args={[wallThickness, wallHeight, 9]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={wallOpacity * 0.9} />
          </mesh>
          <mesh position={[10, elevation + wallHeight / 2, 15.5]}>
            <boxGeometry args={[wallThickness, wallHeight, 9]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={wallOpacity * 0.9} />
          </mesh>

          {/* East Corridor Partition (X = 20) with doorway opening at Z = 9 to 11 */}
          <mesh position={[20, elevation + wallHeight / 2, 4.5]}>
            <boxGeometry args={[wallThickness, wallHeight, 9]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={wallOpacity * 0.9} />
          </mesh>
          <mesh position={[20, elevation + wallHeight / 2, 15.5]}>
            <boxGeometry args={[wallThickness, wallHeight, 9]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={wallOpacity * 0.9} />
          </mesh>

          {/* Central Transverse Partitions (Z = 7 and Z = 13) */}
          <mesh position={[15, elevation + wallHeight / 2, 7]}>
            <boxGeometry args={[10, wallHeight, wallThickness]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={wallOpacity * 0.8} />
          </mesh>
          <mesh position={[15, elevation + wallHeight / 2, 13]}>
            <boxGeometry args={[10, wallHeight, wallThickness]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={wallOpacity * 0.8} />
          </mesh>

          {/* Structural Concrete Columns at key structural nodes */}
          {[
            [10, 7], [10, 13], [20, 7], [20, 13],
            [5, 10], [25, 10]
          ].map(([colX, colZ], idx) => (
            <mesh key={`col_${idx}`} position={[colX, elevation + wallHeight / 2, colZ]}>
              <boxGeometry args={[0.5, wallHeight, 0.5]} />
              <meshStandardMaterial
                color={isSelected ? '#38bdf8' : '#334155'}
                roughness={0.3}
                metalness={0.3}
                transparent
                opacity={Math.min(1, wallOpacity * 2.5)}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 5. 3D Exterior Floor Elevation Badge */}
      <FloorTacticalLabel
        floorConfig={floorConfig}
        isSelected={isSelected}
        isIsolated={isIsolated}
      />
    </group>
  );
}

/**
 * BuildingModel Component
 * 
 * Renders complete 4-level building structure (Basement, Ground, First, Second).
 * Responds to `selectedFloor` prop ('ALL' or specific floor id) with smooth visual isolation.
 */
export default function BuildingModel({ selectedFloor = 'ALL' }) {
  return (
    <group name="LiveTracking_BuildingModel">
      {/* Structural Multi-Storey Floors */}
      {ORDERED_FLOOR_IDS.map((floorId) => (
        <FloorLevel
          key={floorId}
          floorId={floorId}
          selectedFloor={selectedFloor}
        />
      ))}

      {/* Deep Foundation Sub-Grid (below Basement) */}
      <gridHelper
        args={[50, 25, '#0284c7', '#0f172a']}
        position={[DIMENSIONS.width / 2, FLOOR_CONFIGS.BASEMENT.elevation - 1.2, DIMENSIONS.depth / 2]}
      />
    </group>
  );
}
