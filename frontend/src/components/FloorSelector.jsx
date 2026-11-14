import React from 'react';
import { Layers } from 'lucide-react';
import { BUILDING_CONFIG, ORDERED_FLOOR_IDS } from '../config/buildingConfig';

/**
 * FloorSelector Component
 * Allows the Task Force Commander to isolate specific building storeys
 * or inspect all levels simultaneously in 3D.
 */
export default function FloorSelector({
  activeFloor = 'ALL',
  onSelectFloor,
  devices = []
}) {
  // Count devices operating on each floor level
  const getDeviceCountForFloor = (floorId) => {
    return devices.filter((d) => d.floor_id === floorId).length;
  };

  // Reversed floor list to render vertically from top storey (2F) down to B1
  const reversedFloors = [...ORDERED_FLOOR_IDS].reverse();

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(8px)',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
      minWidth: '160px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        borderBottom: '1px solid #334155',
        paddingBottom: '8px',
        color: '#94a3b8',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.05em'
      }}>
        <Layers size={14} color="#06b6d4" />
        STOREY ISOLATION
      </div>

      {/* ALL Floors Toggle */}
      <button
        type="button"
        onClick={() => onSelectFloor('ALL')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderRadius: '5px',
          border: activeFloor === 'ALL' ? '1px solid #06b6d4' : '1px solid transparent',
          background: activeFloor === 'ALL' ? 'rgba(6, 182, 212, 0.18)' : 'rgba(30, 41, 59, 0.6)',
          color: activeFloor === 'ALL' ? '#38bdf8' : '#cbd5e1',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: activeFloor === 'ALL' ? 600 : 500,
          transition: 'all 0.15s ease'
        }}
      >
        <span>OVERVIEW (ALL)</span>
        <span style={{
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
          padding: '1px 5px',
          borderRadius: '10px',
          background: '#0f172a',
          color: '#94a3b8'
        }}>
          {devices.length}
        </span>
      </button>

      {/* Individual Floor Buttons (Top to Bottom) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {reversedFloors.map((floorId) => {
          const floor = BUILDING_CONFIG.floors[floorId];
          const isSelected = activeFloor === floorId;
          const count = getDeviceCountForFloor(floorId);

          return (
            <button
              key={floorId}
              type="button"
              onClick={() => onSelectFloor(floorId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '5px',
                border: isSelected ? '1px solid #06b6d4' : '1px solid rgba(51, 65, 85, 0.5)',
                background: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                color: isSelected ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 400,
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  fontSize: '11px',
                  color: isSelected ? '#06b6d4' : '#64748b'
                }}>
                  {floor.shortName}
                </span>
                <span>{floor.name.replace(' Floor', '').replace(' Level', '')}</span>
              </div>

              {/* Personnel Count Badge */}
              <span style={{
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                padding: '1px 6px',
                borderRadius: '10px',
                background: count > 0 ? (isSelected ? '#06b6d4' : '#1e293b') : 'transparent',
                color: count > 0 ? (isSelected ? '#000000' : '#38bdf8') : '#475569',
                fontWeight: 600
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
