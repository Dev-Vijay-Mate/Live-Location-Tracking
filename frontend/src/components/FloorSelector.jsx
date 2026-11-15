import React from 'react';
import { Layers } from 'lucide-react';
import { FLOOR_CONFIGS, ORDERED_FLOOR_IDS } from './building3d/buildingConfig';
import { tacticalAudio } from '../services/audioEffects';

/**
 * Tactical Storey Selector HUD
 * Allows the Commander to toggle between multi-storey overview
 * and isolated floor levels with elevation metrics and unit density.
 */
export default function FloorSelector({
  activeFloor = 'ALL',
  onSelectFloor,
  devices = []
}) {
  const getDeviceCountForFloor = (floorId) => {
    return devices.filter((d) => {
      const fid = (d.floor_id || '').toUpperCase();
      const target = floorId.toUpperCase();
      return fid === target || (target === 'FLOOR_00' && (fid === 'GROUND' || fid === 'GF'));
    }).length;
  };

  const handleSelect = (floorId) => {
    tacticalAudio.playPing(1300, 0.05);
    onSelectFloor(floorId);
  };

  const reversedFloors = [...ORDERED_FLOOR_IDS].reverse();

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      zIndex: 25,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: 'rgba(13, 19, 34, 0.90)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #24344d',
      borderRadius: '8px',
      padding: '12px 14px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      minWidth: '190px'
    }}>
      {/* HUD Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #24344d',
        paddingBottom: '8px',
        color: '#94a3b8',
        fontSize: '11px',
        fontWeight: 800,
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.06em'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color="#06b6d4" />
          <span>STOREY MATRIX</span>
        </div>
        <span style={{ fontSize: '9px', color: '#64748b' }}>ELEV (m)</span>
      </div>

      {/* ALL Floors Toggle */}
      <button
        type="button"
        onClick={() => handleSelect('ALL')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderRadius: '5px',
          border: activeFloor === 'ALL' ? '1px solid #06b6d4' : '1px solid rgba(36, 52, 77, 0.6)',
          background: activeFloor === 'ALL' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(22, 32, 53, 0.6)',
          color: activeFloor === 'ALL' ? '#38bdf8' : '#cbd5e1',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: activeFloor === 'ALL' ? 700 : 500,
          transition: 'all 0.15s ease',
          boxShadow: activeFloor === 'ALL' ? '0 0 10px rgba(6, 182, 212, 0.25)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: activeFloor === 'ALL' ? '#38bdf8' : '#64748b'
          }} />
          <span>OVERVIEW (ALL)</span>
        </div>

        <span style={{
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
          padding: '1px 6px',
          borderRadius: '8px',
          background: '#070a12',
          color: '#38bdf8',
          fontWeight: 700,
          border: '1px solid #24344d'
        }}>
          {devices.length}
        </span>
      </button>

      {/* Individual Floor Buttons (Top to Bottom: 2F -> 1F -> GF -> B1) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {reversedFloors.map((floorId) => {
          const floor = FLOOR_CONFIGS[floorId] || {};
          const isSelected = activeFloor === floorId;
          const count = getDeviceCountForFloor(floorId);
          const elevStr = floor.elevation >= 0 ? `+${floor.elevation.toFixed(1)}m` : `${floor.elevation.toFixed(1)}m`;

          return (
            <button
              key={floorId}
              type="button"
              onClick={() => handleSelect(floorId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: '5px',
                border: isSelected ? '1px solid #06b6d4' : '1px solid rgba(36, 52, 77, 0.5)',
                background: isSelected ? 'rgba(6, 182, 212, 0.22)' : 'rgba(13, 19, 34, 0.7)',
                color: isSelected ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: isSelected ? 700 : 400,
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 0 12px rgba(6, 182, 212, 0.25)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 800,
                  fontSize: '11px',
                  color: isSelected ? '#38bdf8' : '#64748b',
                  width: '20px'
                }}>
                  {floor.shortName}
                </span>
                <span style={{ color: isSelected ? '#f8fafc' : '#cbd5e1' }}>
                  {floor.name.replace(' Floor', '').replace(' Level', '')}
                </span>
              </div>

              {/* Elevation & Personnel Count Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9.5px',
                  color: isSelected ? '#38bdf8' : '#64748b'
                }}>
                  {elevStr}
                </span>

                <span style={{
                  fontSize: '10.5px',
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  background: count > 0 ? (isSelected ? '#06b6d4' : '#162035') : '#070a12',
                  color: count > 0 ? (isSelected ? '#030712' : '#38bdf8') : '#475569',
                  fontWeight: 800,
                  border: count > 0 ? '1px solid #38bdf8' : '1px solid #1e293b'
                }}>
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
