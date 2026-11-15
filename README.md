# Live Indoor Location Tracking System (NSG CQB Prototype)

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/3D%20Engine-Three.js%20%7C%20R3F-black?logo=three.js)](https://threejs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![WebSockets](https://img.shields.io/badge/Real--Time-WebSockets-0284c7)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2018%20(w%2F%20fallback)-336791?logo=postgresql)](https://www.postgresql.org/)

A real-time 3D indoor tactical location tracking and command-and-control monitoring dashboard designed for House Intervention Teams (HIT) operating inside multi-storey structures and underground basements.

---

## 📌 Problem Statement Overview

* **Organization:** National Security Guard (NSG), Ministry of Home Affairs, India
* **Year:** 2024
* **Domain:** Miscellaneous (Defense / Tactical Software)
* **Target Environment:** Close Quarters Battle (CQB) in GPS-denied multi-storey buildings (hotels, hospitals, metro stations)

### Operational Challenge
Traditional GPS and GSM-based positioning methods cannot penetrate reinforced concrete buildings or identify vertical elevation. Task Force Commanders require real-time 3D situational awareness showing personnel positions across multiple floors (`BASEMENT`, `GROUND`, `FIRST`, `SECOND`) and internal room zones.

---

## ⚙️ System Architecture & Data Flow

```text
    ┌───────────────────────────┐
    │  Python CQB Simulator     │  (Multi-agent kinematics with path jitter)
    └─────────────┬─────────────┘
                  │  HTTP POST /api/locations
                  ▼
    ┌───────────────────────────┐
    │  FastAPI Backend Server   │  (Pydantic validation & telemetry ingestion)
    └──────┬─────────────┬──────┘
           │             │
    Persist│             │ Broadcast
           ▼             ▼
  ┌─────────────┐   ┌───────────────────────────┐
  │ PostgreSQL  │   │  WebSocket Streaming      │  (ws://localhost:8000/ws/locations)
  │ (or SQLite) │   └─────────────┬─────────────┘
  └─────────────┘                 │
                                  ▼
                    ┌───────────────────────────┐
                    │  React Monitoring Client  │  (Reactive hooks & state management)
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  Three.js / R3F 3D View   │  (Smooth lerp markers, storeys & rooms)
                    └───────────────────────────┘
```

---

## 🚀 One-Click Quick Start

Run the complete system (Backend + Frontend + Simulator) with a single command:

```bash
# 1. Clone repository
git clone https://github.com/Dev-Vijay-Mate/Live-Location-Tracking.git
cd Live-Location-Tracking

# 2. Setup backend virtual environment
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt

# 3. Setup frontend dependencies
cd frontend && npm install && cd ..

# 4. Launch all components together
python3 run_system.py
```

### Accessing the Dashboard:
* **Tactical 3D Dashboard:** [http://localhost:3000](http://localhost:3000)
* **FastAPI Interactive API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
* **WebSocket Endpoint:** `ws://localhost:8000/ws/locations`

---

## 🌟 Key Features

1. **Multi-Storey 3D Building Visualization:**
   - Accurate 3D representations of `BASEMENT` (-4.0m), `GROUND` (0.0m), `FIRST` (+4.0m), and `SECOND` (+8.0m) levels.
   - Semi-transparent glass walls providing line-of-sight into rooms, corridors, and stairwells.
   - 3D tactical room labels (`Lobby`, `Briefing Room`, `Server Core`, `Armory`, `Staging Bay`).

2. **Tactical Camera Controls & Presets:**
   - `OrbitControls` with smooth rotation, zooming, and pan angle constraints.
   - One-click camera presets: **Perspective**, **Isometric**, **Top-Down (2D Floor Plan)**, and **Side Elevation**.
   - Storey isolation mode: focus on a single floor while ghosting other storeys.

3. **Live Personnel Markers & Trajectory Trails:**
   - 3D octahedral unit markers with smooth frame-by-frame vector interpolation (`lerp`) so units glide realistically rather than snapping.
   - Color-coded status beacons: 🟢 **Online**, 🟡 **Stale**, 🔴 **Offline**.
   - Dynamic 3D breadcrumb trajectory path (`DeviceTrail`) rendering past movements of selected units.

4. **Centralized Command Interface:**
   - **Operational Roster Sidebar:** Unit search, callsigns, current floor, room zone, coordinates, and telemetry freshness.
   - **Storey Selector:** Storey buttons with live personnel count badges.
   - **Status Footer:** WebSocket health badge, unit readiness breakdown, and synchronized UTC mission clock.

5. **Robust Backend & Simulator:**
   - Asynchronous Python FastAPI backend with Pydantic request validation and WebSocket broadcaster.
   - Dual-database support: PostgreSQL with automatic fallback to SQLite when running in local standalone development.
   - Python CQB simulator with realistic multi-agent waypoint traversal and footstep micro-jitter.

---

## 📁 Repository Structure

```text
Live-Location-Tracking/
├── run_system.py                 # Master runner starting all services
├── frontend/                     # React 18 + Vite + Three.js application
│   ├── src/
│   │   ├── components/
│   │   │   ├── building3d/       # 3D Building, Model, Markers, Canvas, and Camera Rig
│   │   │   ├── Dashboard.jsx     # Master C2 command layout
│   │   │   ├── DevicePanel.jsx   # Tactical personnel roster & search
│   │   │   ├── FloorSelector.jsx # Storey isolation HUD
│   │   │   └── StatusPanel.jsx   # Telemetry status and UTC clock
│   │   ├── hooks/                # useDevices & useWebSocket custom hooks
│   │   ├── services/             # REST API and resilient WebSocket clients
│   │   ├── three/                # DeviceTrail and 3D utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/                      # Python FastAPI application
│   ├── app/
│   │   ├── api/                  # Devices, locations & WebSocket endpoints
│   │   ├── core/                 # Settings and async database engine
│   │   ├── models/               # SQLAlchemy ORM models (Device, LocationRecord)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # WebSocket ConnectionManager
│   │   └── main.py
│   ├── migrations/               # PostgreSQL DDL migrations & triggers
│   └── requirements.txt
├── simulator/                    # Synthetic CQB kinematics simulator
│   ├── config.py                 # Waypoints and tactical units
│   ├── main.py                   # Async telemetry posting loop
│   └── requirements.txt
├── docs/                         # Project documentation
│   ├── API_CONTRACT.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_PLAN.md
│   ├── PROJECT_CONTEXT.md
│   ├── TEAM_RESPONSIBILITIES.md
│   └── VIVA_PREPARATION.md       # Comprehensive exam and viva guide
└── README.md
```

---

## 👥 Team Responsibilities

* **Member 1 (3D Building & Spatial Engineering):** 3D building geometry, floor slabs, room dividers, camera presets, and 3D coordinate mapping.
* **Member 2 (Backend, Database & Simulation):** FastAPI REST APIs, WebSocket streaming server, PostgreSQL/SQLite database models, and Python CQB kinematics simulator.
* **Member 3 (Frontend & System Integration):** Command-and-control dashboard UI, reactive hooks, resilient WebSocket client, and end-to-end integration.

---

## ⚠️ Academic Disclaimer

This project is an academic software engineering prototype developed for research, educational demonstration, and evaluation purposes based on the NSG Problem Statement (2024). It is not an officially commissioned or operational military deployment.
