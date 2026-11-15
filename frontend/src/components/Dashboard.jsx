import React, { useState } from 'react';
import BuildingCanvas from './building3d/BuildingCanvas';
import FloorSelector from './FloorSelector';
import DevicePanel from './DevicePanel';
import StatusPanel from './StatusPanel';
import {
  Shield,
  Play,
  Square,
  Volume2,
  VolumeX,
  Crosshair,
  Maximize2
} from 'lucide-react';
import { tacticalAudio } from '../services/audioEffects';

/**
 * NSG CQB Command & Control Dashboard
 * Integrates 3D spatial multi-storey building, real-time tactical roster,
 * floor isolation controls, sound synthesizer, and telemetry health metrics.
 */
export default function Dashboard({
  devices = [],
  activeFloor = 'ALL',
  setActiveFloor,
  selectedDeviceId = null,
  setSelectedDeviceId,
  selectedDeviceHistory = [],
  isConnected = true,
  isSimulating = true,
  onToggleSimulation = null,
  lastUpdated = null
}) {
  const [audioEnabled, setAudioEnabled] = useState(false);

  const handleAudioToggle = () => {
    const isNowOn = tacticalAudio.toggle();
    setAudioEnabled(isNowOn);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-primary)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* 1. Tactical Command Header */}
      <header style={{
        height: '58px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 30,
        boxShadow: '0 2px 16px rgba(0,0,0,0.5)'
      }}>
        {/* NSG Emblem, Mission Title & Classification */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid #06b6d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(6, 182, 212, 0.35)'
          }}>
            <Shield size={20} color="#06b6d4" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.06em', color: '#f8fafc', lineHeight: 1.1 }}>
                NSG CQB LIVE TRACKING SYSTEM
              </h1>
              <span style={{
                fontSize: '9px',
                fontFamily: 'JetBrains Mono, monospace',
                padding: '1px 6px',
                borderRadius: '3px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                fontWeight: 800,
                letterSpacing: '0.05em'
              }} className="anim-alert-pulse">
                DEFCON 2 // LIVE C2
              </span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
              MINISTRY OF HOME AFFAIRS (INDIA) • NATIONAL SECURITY GUARD
            </span>
          </div>
        </div>

        {/* Center / Right Tactical Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Audio Chime Alerts Toggle */}
          <button
            type="button"
            onClick={handleAudioToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              backgroundColor: audioEnabled ? 'rgba(6, 182, 212, 0.18)' : 'rgba(22, 32, 53, 0.6)',
              border: audioEnabled ? '1px solid #06b6d4' : '1px solid #24344d',
              color: audioEnabled ? '#38bdf8' : '#64748b',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={audioEnabled ? 'Mute Tactical Audio' : 'Enable Tactical Audio Alerts'}
          >
            {audioEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>AUDIO: {audioEnabled ? 'ON' : 'MUTED'}</span>
          </button>

          {/* Simulation Toggle Control */}
          {onToggleSimulation && (
            <button
              type="button"
              onClick={onToggleSimulation}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '4px',
                backgroundColor: isSimulating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: isSimulating ? '1px solid #ef4444' : '1px solid #10b981',
                color: isSimulating ? '#ef4444' : '#10b981',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isSimulating ? <Square size={12} /> : <Play size={12} />}
              <span>{isSimulating ? 'HALT KINEMATICS' : 'RESUME KINEMATICS'}</span>
            </button>
          )}

          {/* Complex & Facility Tag */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            background: '#162035',
            border: '1px solid #24344d',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <span style={{ color: '#64748b' }}>COMPLEX:</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>DEMO_BLDG_001</span>
          </div>
        </div>
      </header>

      {/* 2. Middle Workspace: Sidebar + 3D Viewport */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Operational Personnel Roster */}
        <DevicePanel
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          activeFloor={activeFloor}
        />

        {/* Center / 3D Canvas Viewport */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          {/* Top-Right Storey Selector Overlay */}
          <FloorSelector
            activeFloor={activeFloor}
            onSelectFloor={setActiveFloor}
            devices={devices}
          />

          {/* 3D Scene Viewport (Member 1 Building Module + Trajectory Path) */}
          <BuildingCanvas
            selectedFloor={activeFloor}
            onSelectFloor={setActiveFloor}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            selectedDeviceHistory={selectedDeviceHistory}
          />
        </div>
      </div>

      {/* 3. Bottom Operational Telemetry Footer */}
      <StatusPanel
        isConnected={isConnected}
        devices={devices}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}
