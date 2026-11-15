import React, { useState } from 'react';
import BuildingCanvas from './building3d/BuildingCanvas';
import FloorSelector from './FloorSelector';
import DevicePanel from './DevicePanel';
import StatusPanel from './StatusPanel';
import {
  Activity,
  Bell,
  CircleDot,
  Radio,
  Shield,
  Volume2,
  VolumeX,
  Zap
} from 'lucide-react';
import { tacticalAudio } from '../services/audioEffects';

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
  const onlineCount = devices.filter((device) => device.status === 'online').length;
  const activeFloorCount = activeFloor === 'ALL'
    ? devices.length
    : devices.filter((device) => device.floor_id === activeFloor).length;

  const handleAudioToggle = () => {
    const isNowOn = tacticalAudio.toggle();
    setAudioEnabled(isNowOn);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Shield size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-title-row">
              <h1>Live Location Command</h1>
              <span className="live-badge"><CircleDot size={11} /> LIVE</span>
            </div>
            <p>Indoor situational awareness <span>•</span> CQB training facility</p>
          </div>
        </div>

        <div className="topbar-actions">
          <div className={`connection-pill ${isConnected ? 'is-connected' : 'is-disconnected'}`}>
            <Radio size={14} />
            <span>{isConnected ? 'Stream connected' : 'Using local demo data'}</span>
          </div>
          <button
            type="button"
            className={`icon-button ${audioEnabled ? 'is-active' : ''}`}
            onClick={handleAudioToggle}
            title={audioEnabled ? 'Mute audio alerts' : 'Enable audio alerts'}
            aria-label={audioEnabled ? 'Mute audio alerts' : 'Enable audio alerts'}
          >
            {audioEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          {onToggleSimulation && (
            <button type="button" className="simulation-button" onClick={onToggleSimulation}>
              <Zap size={14} />
              {isSimulating ? 'Demo running' : 'Resume demo'}
            </button>
          )}
        </div>
      </header>

      <div className="workspace">
        <DevicePanel
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          activeFloor={activeFloor}
        />

        <main className="map-workspace">
          <div className="map-toolbar">
            <div>
              <div className="eyebrow"><Activity size={13} /> FACILITY OVERVIEW</div>
              <h2>Building telemetry map</h2>
              <p>Real-time position data across all monitored floors</p>
            </div>
            <div className="map-summary">
              <div><strong>{activeFloorCount}</strong><span>visible units</span></div>
              <div><strong>{onlineCount}</strong><span>online now</span></div>
              <div className="last-sync">
                <Bell size={13} />
                <span>{lastUpdated ? 'just synced' : 'awaiting sync'}</span>
              </div>
            </div>
          </div>
          <div className="canvas-frame">
            <BuildingCanvas
              selectedFloor={activeFloor}
              onSelectFloor={setActiveFloor}
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={setSelectedDeviceId}
              selectedDeviceHistory={selectedDeviceHistory}
            />
            <FloorSelector
              activeFloor={activeFloor}
              onSelectFloor={setActiveFloor}
              devices={devices}
            />
            <div className="map-legend" aria-label="Map legend">
              <span><i className="legend-dot online" /> Online</span>
              <span><i className="legend-dot stale" /> Stale</span>
              <span><i className="legend-dot offline" /> Offline</span>
            </div>
          </div>
        </main>
      </div>

      <StatusPanel isConnected={isConnected} devices={devices} lastUpdated={lastUpdated} />
    </div>
  );
}
