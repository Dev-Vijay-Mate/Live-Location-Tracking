import React, { useState } from 'react';
import BuildingCanvas from './building3d/BuildingCanvas';
import FloorSelector from './FloorSelector';
import DevicePanel from './DevicePanel';
import StatusPanel from './StatusPanel';
import { Shield, Play, Square } from 'lucide-react';

/**
 * Main Monitoring Dashboard Component
 * Integrates 3D spatial visualization, tactical floor controls,
 * personnel roster, and telemetry health.
 */
export default function Dashboard({
  devices = [],
  activeFloor = 'ALL',
  setActiveFloor,
  selectedDeviceId = null,
  setSelectedDeviceId,
  isConnected = true,
  isSimulating = true,
  onToggleSimulation = null,
  lastUpdated = null
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* 1. Tactical Command Header */}
      <header style={{
        height: '56px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 10
      }}>
        {/* Brand & Mission Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid #06b6d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={18} color="#06b6d4" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.2 }}>
              NSG CQB LIVE TRACKING SYSTEM
            </h1>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
              NATIONAL SECURITY GUARD // MHA INDIA // MAJOR PROJECT
            </span>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Simulation Toggle Control */}
          {onToggleSimulation && (
            <button
              type="button"
              onClick={onToggleSimulation}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '4px',
                backgroundColor: isSimulating ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: isSimulating ? '1px solid #ef4444' : '1px solid #10b981',
                color: isSimulating ? '#ef4444' : '#10b981',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isSimulating ? <Square size={12} /> : <Play size={12} />}
              {isSimulating ? 'HALT SIMULATION' : 'START SIMULATION'}
            </button>
          )}

          {/* Building Tag */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <span style={{ color: '#64748b' }}>COMPLEX:</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>DEMO_BLDG_001</span>
          </div>
        </div>
      </header>

      {/* 2. Middle Workspace: Sidebar + 3D Viewport */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left Personnel Roster Sidebar */}
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

          {/* 3D Scene Viewport (Member 1 Building Module) */}
          <BuildingCanvas
            selectedFloor={activeFloor}
            onSelectFloor={setActiveFloor}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
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
