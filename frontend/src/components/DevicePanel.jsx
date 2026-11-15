import React, { useState } from 'react';
import {
  Users,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Activity,
  Heart,
  BatteryCharging,
  Radio,
  Navigation,
  Eye
} from 'lucide-react';
import { resolveRoom, getFloorConfig } from './building3d/buildingConfig';
import { tacticalAudio } from '../services/audioEffects';

/**
 * Tactical House Intervention Team (HIT) Operational Roster Panel
 * Displays real-time soldier positions, biometrics, floor levels,
 * UWB signal link health, and trajectory waypoints.
 */
export default function DevicePanel({
  devices = [],
  selectedDeviceId = null,
  onSelectDevice,
  activeFloor = 'ALL'
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');

  // Filter devices by search term, team, and active floor
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      (device.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      device.device_id.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesFloor = activeFloor === 'ALL' || device.floor_id === activeFloor;

    const matchesTeam =
      teamFilter === 'ALL' ||
      (device.name && device.name.toUpperCase().includes(teamFilter));

    return matchesSearch && matchesFloor && matchesTeam;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'online':
        return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', label: 'ONLINE' };
      case 'stale':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', label: 'STALE' };
      case 'offline':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', label: 'OFFLINE' };
      default:
        return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4', label: 'ACTIVE' };
    }
  };

  // Deterministic realistic simulated biometric metrics for defense demo
  const getSimulatedBiometrics = (deviceId) => {
    const idNum = deviceId.charCodeAt(deviceId.length - 1) || 1;
    const baseBpm = 72 + (idNum % 25);
    const battery = 85 + (idNum % 14);
    const uwbLink = 94 + (idNum % 6);
    return { bpm: baseBpm, battery, uwbLink };
  };

  const handleUnitClick = (devId) => {
    tacticalAudio.playPing(1100, 0.08);
    onSelectDevice(devId === selectedDeviceId ? null : devId);
  };

  return (
    <aside style={{
      width: collapsed ? '46px' : '360px',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 20,
      position: 'relative',
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)'
    }}>
      {/* Collapse Toggle Button */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          top: '14px',
          right: '-13px',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: '#0f172a',
          border: '1px solid #38bdf8',
          color: '#38bdf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
          boxShadow: '0 0 10px rgba(6, 182, 212, 0.4)'
        }}
        title={collapsed ? 'Expand Roster Panel' : 'Collapse Panel'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Collapsed Strip View */}
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
            letterSpacing: '0.15em',
            fontWeight: 700
          }}>
            TACTICAL ROSTER [{devices.length}]
          </span>
        </div>
      ) : (
        /* Full Expanded Operational Roster View */
        <>
          {/* Panel Header */}
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(13, 19, 34, 0.4) 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={16} color="#06b6d4" />
                </div>
                <div>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.05em', color: '#f8fafc' }}>
                    OPERATIONAL ROSTER
                  </h2>
                  <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                    CQB HOUSE INTERVENTION TEAMS
                  </span>
                </div>
              </div>

              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#162035',
                color: '#38bdf8',
                border: '1px solid #24344d',
                fontWeight: 700
              }}>
                {filteredDevices.length} / {devices.length}
              </span>
            </div>

            {/* Quick Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search unit name, ID or role..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#070a12',
                  border: '1px solid #24344d',
                  borderRadius: '5px',
                  padding: '7px 10px',
                  color: '#f8fafc',
                  fontSize: '11.5px',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif'
                }}
              />
            </div>

            {/* Tactical Team Filter Pills */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['ALL', 'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTeamFilter(t)}
                  style={{
                    flex: 1,
                    padding: '3px 0',
                    borderRadius: '3px',
                    fontSize: '9.5px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: teamFilter === t ? 700 : 500,
                    background: teamFilter === t ? 'rgba(6, 182, 212, 0.2)' : 'rgba(22, 32, 53, 0.6)',
                    color: teamFilter === t ? '#38bdf8' : '#64748b',
                    border: teamFilter === t ? '1px solid #06b6d4' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Unit Cards List */}
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
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                NO ACTIVE PERSONNEL MATCHING CRITERIA
              </div>
            ) : (
              filteredDevices.map((device) => {
                const isSelected = device.device_id === selectedDeviceId;
                const badge = getStatusBadge(device.status);
                const floorConfig = getFloorConfig(device.floor_id) || {};
                const roomName = resolveRoom(device.position?.x, device.position?.z, device.floor_id);
                const bio = getSimulatedBiometrics(device.device_id);

                return (
                  <div
                    key={device.device_id}
                    onClick={() => handleUnitClick(device.device_id)}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(22, 32, 53, 0.45)',
                      border: isSelected ? '1px solid #06b6d4' : '1px solid rgba(36, 52, 77, 0.7)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: isSelected ? '0 0 14px rgba(6, 182, 212, 0.2)' : 'none'
                    }}
                  >
                    {/* Unit Callsign & Live Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: badge.color,
                          boxShadow: `0 0 8px ${badge.color}`
                        }} className={device.status === 'online' ? 'anim-live-pulse' : ''} />
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isSelected ? '#38bdf8' : '#f8fafc',
                          letterSpacing: '0.02em'
                        }}>
                          {device.name || device.device_id}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '9.5px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}50`
                        }}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Storey & Tactical Room Zone */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#94a3b8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: '#070a12',
                          color: '#38bdf8',
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '10px',
                          border: '1px solid #24344d'
                        }}>
                          {floorConfig.shortName || device.floor_id}
                        </span>
                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                          {roomName}
                        </span>
                      </div>

                      {/* Coordinates */}
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '10px',
                        color: '#64748b'
                      }}>
                        X: {Number(device.position?.x || 0).toFixed(1)}m | Z: {Number(device.position?.z || 0).toFixed(1)}m
                      </span>
                    </div>

                    {/* Tactical Telemetry Strip (Biometrics & Signal) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#64748b',
                      borderTop: '1px solid rgba(36, 52, 77, 0.5)',
                      paddingTop: '6px'
                    }}>
                      {/* Biometric Heart Rate */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Heart size={11} color="#ef4444" className="anim-heart" />
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{bio.bpm}</span>
                        <span style={{ fontSize: '9px' }}>BPM</span>
                      </div>

                      {/* UWB Signal Link */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Radio size={11} color="#10b981" />
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{bio.uwbLink}%</span>
                        <span style={{ fontSize: '9px' }}>UWB</span>
                      </div>

                      {/* Battery */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BatteryCharging size={11} color="#06b6d4" />
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{bio.battery}%</span>
                      </div>

                      {/* Selection Hint */}
                      <span style={{
                        color: isSelected ? '#38bdf8' : '#475569',
                        fontWeight: 700
                      }}>
                        {isSelected ? 'TRACKING [3D]' : 'INSPECT'}
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
