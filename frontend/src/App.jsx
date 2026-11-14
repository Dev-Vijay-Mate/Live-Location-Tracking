import React, { useState } from 'react';

function App() {
  const [activeFloor, setActiveFloor] = useState('ALL');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Top Navigation Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-cyan)',
            boxShadow: '0 0 10px var(--accent-cyan)'
          }} />
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            NSG CQB LIVE TRACKING <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 400 }}>// COMMAND & CONTROL</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>BUILDING: <strong style={{ color: 'var(--text-primary)' }}>DEMO_BLDG_001</strong></span>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--accent-green)',
            color: 'var(--accent-green)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)'
          }}>SYSTEM READY</span>
        </div>
      </header>

      {/* Main Workspace */}
      <main style={{ flex: 1, position: 'relative', display: 'flex' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          color: 'var(--text-secondary)'
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>
            [ 3D SPATIAL ENGINE INITIALIZING ]
          </p>
          <p style={{ fontSize: '0.85rem', maxWidth: '400px', textAlign: 'center' }}>
            Vite + React frontend initialized. Ready for Three.js 3D building and WebSocket live tracking integration.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
