import React, { useState } from 'react';
import { Users, Radio, Crosshair, ChevronLeft, ChevronRight, MapPin, Activity } from 'lucide-react';
import { resolveRoomName } from '../config/coordinateMapping';
import { resolveRoom, getFloorConfig } from './building3d/buildingConfig';
import { BUILDING_CONFIG } from '../config/buildingConfig';

/**
 * DevicePanel Component
 * Displays the tactical roster of active House Intervention Teams (HIT),
 * their current floor level, physical coordinates, and telemetry freshness.
 */
export default function DevicePanel({
  devices = [],
  selectedDeviceId = null,
  onSelectDevice,
  activeFloor = 'ALL'
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Filter devices by search term and floor
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      (device.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      device.device_id.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesFloor = activeFloor === 'ALL' || device.floor_id === activeFloor;
    return matchesSearch && matchesFloor;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'online':
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', label: 'ONLINE' };
      case 'stale':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'STALE' };
      case 'offline':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'OFFLINE' };
      default:
        return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', label: 'ACTIVE' };
    }
  };

  return (
    <aside style={{
      width: collapsed ? '48px' : '340px',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 20,
      position: 'relative'
    }}>
      {/* Collapse Toggle Button */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          top: '14px',
          right: '-14px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: '#1e293b',
          border: '1px solid #475569',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
        }}
        title={collapsed ? 'Expand Roster Panel' : 'Collapse Panel'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* When Collapsed */}
      {collapsed ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '20px',
          gap: '24px'
        }}>
          <Users size={18} color="#06b6d4" />
          <span style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: '#64748b',
            letterSpacing: '0.1em'
          }}>
            TACTICAL ROSTER ({devices.length})
          </span>
        </div>
      ) : (
        /* Expanded Panel */
        <>
          {/* Panel Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#06b6d4" />
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                  OPERATIONAL ROSTER
                </h2>
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155'
              }}>
                {filteredDevices.length} / {devices.length} UNITS
              </span>
            </div>

            {/* Quick Search */}
            <input
              type="text"
              placeholder="Search callsign or ID..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#0a0e17',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '6px 10px',
                color: '#f3f4f6',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif'
              }}
            />
          </div>

          {/* Unit List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {filteredDevices.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 10px',
                color: '#64748b',
                fontSize: '12px'
              }}>
                No personnel found matching filter.
              </div>
            ) : (
              filteredDevices.map((device) => {
                const isSelected = device.device_id === selectedDeviceId;
                const badge = getStatusBadge(device.status);
                const floorConfig = getFloorConfig(device.floor_id) || BUILDING_CONFIG.floors[device.floor_id] || {};
                const roomName = resolveRoom(device.position?.x, device.position?.z, device.floor_id) || resolveRoomName(device.position?.x, device.position?.z);

                return (
                  <div
                    key={device.device_id}
                    onClick={() => onSelectDevice(device.device_id)}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(31, 41, 55, 0.5)',
                      border: isSelected ? '1px solid #06b6d4' : '1px solid rgba(55, 65, 81, 0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {/* Callsign and Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Crosshair size={14} color={isSelected ? '#06b6d4' : '#94a3b8'} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                          {device.name || device.device_id}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '9px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: badge.color }} />
                        {badge.label}
                      </span>
                    </div>

                    {/* Floor and Tactical Room Position */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#94a3b8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="#38bdf8" />
                        <span style={{ color: '#38bdf8', fontWeight: 500 }}>
                          {floorConfig.shortName || device.floor_id}
                        </span>
                        <span>•</span>
                        <span style={{ color: '#cbd5e1' }}>{roomName}</span>
                      </div>
                    </div>

                    {/* Coordinates & Device ID */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#64748b',
                      borderTop: '1px solid rgba(55, 65, 81, 0.4)',
                      paddingTop: '6px'
                    }}>
                      <span>ID: {device.device_id}</span>
                      <span>
                        X: {Number(device.position?.x || 0).toFixed(1)}m | Z: {Number(device.position?.z || 0).toFixed(1)}m
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </aside>
  );
}
