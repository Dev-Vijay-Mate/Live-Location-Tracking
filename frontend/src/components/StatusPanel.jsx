import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, Clock, ShieldCheck } from 'lucide-react';

/**
 * StatusPanel Component
 * Displays system status, live telemetry connection health,
 * personnel readiness breakdown, and synchronized mission clock.
 */
export default function StatusPanel({
  isConnected = true,
  devices = [],
  lastUpdated = null
}) {
  const [missionTime, setMissionTime] = useState('');

  // Update synchronized mission clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setMissionTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const staleCount = devices.filter((d) => d.status === 'stale').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;

  return (
    <footer style={{
      height: '36px',
      backgroundColor: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontSize: '11px',
      fontFamily: 'JetBrains Mono, monospace',
      color: '#94a3b8',
      zIndex: 10
    }}>
      {/* Telemetry Stream Connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isConnected ? (
            <>
              <Wifi size={13} color="#10b981" />
              <span style={{ color: '#10b981', fontWeight: 600 }}>WEBSOCKET LIVE</span>
            </>
          ) : (
            <>
              <WifiOff size={13} color="#ef4444" />
              <span style={{ color: '#ef4444', fontWeight: 600 }}>TELEMETRY OFFLINE</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={12} color="#06b6d4" />
          <span>DATA STREAM: <strong style={{ color: '#f8fafc' }}>ACTIVE</strong></span>
        </div>
      </div>

      {/* Personnel Status Breakdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span>ONLINE: <strong style={{ color: '#f8fafc' }}>{onlineCount}</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <span>STALE: <strong style={{ color: '#f8fafc' }}>{staleCount}</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <span>OFFLINE: <strong style={{ color: '#f8fafc' }}>{offlineCount}</strong></span>
        </div>
      </div>

      {/* Mission Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock size={12} color="#38bdf8" />
        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{missionTime}</span>
      </div>
    </footer>
  );
}
