# Development Plan — 14-Day Roadmap

## Timeline Overview

| Days | Phase | Focus | Status |
|------|-------|-------|--------|
| 1–2 | Foundation | Architecture, setup, documentation | ✅ Completed |
| 3–4 | Core Development | Building, backend, dashboard | ✅ Completed |
| 5–6 | Infrastructure | Database, simulator, WebSocket | ✅ Completed |
| 7 | Checkpoint | Module testing, first integration | ✅ Completed |
| 8–9 | Integration | Connect all modules | ✅ Completed |
| 10–11 | Features | Device info, history, polish | ✅ Completed |
| 12 | Testing | End-to-end, error handling | ✅ Completed |
| 13 | Polish | UI, docs, bug fixes | ✅ Completed |
| 14 | Delivery | Final test, demo, viva prep | ✅ Completed |

---

## Detailed Day-by-Day Plan

### Day 1–2: Foundation & Setup
**All Members:**
- [x] Repository analysis
- [x] Project architecture design
- [x] API and data contract agreement
- [x] Documentation structure

**Member 1:**
- [x] Set up React Three Fiber development environment
- [x] Study Drei helpers and camera controls
- [x] Plan building geometry and floor dimensions

**Member 2:**
- [x] Set up Python virtual environment
- [x] Install FastAPI and dependencies
- [x] Start PostgreSQL service (with SQLite fallback)
- [x] Plan database schema

**Member 3:**
- [x] Initialize Vite + React project
- [x] Plan dashboard layout and components
- [x] Set up project routing

---

### Day 3–4: Core Development
**Member 1:**
- [x] Create `buildingConfig.js` with floor dimensions
- [x] Build basic 3D building geometry (4 floors)
- [x] Add camera controls (orbit, zoom)
- [x] Create floor component with walls and floor plane

**Member 2:**
- [x] Create FastAPI project structure
- [x] Define SQLAlchemy models (devices, locations)
- [x] Define Pydantic schemas for validation
- [x] Implement health check endpoint

**Member 3:**
- [x] Create Dashboard layout component
- [x] Create DevicePanel component
- [x] Create FloorSelector component
- [x] Set up basic CSS/styling

---

### Day 5–6: Infrastructure
**Member 1:**
- [x] Add room divisions and corridors
- [x] Create `coordinateMapping.js`
- [x] Create `DeviceMarkers.jsx` component
- [x] Test marker placement on each floor

**Member 2:**
- [x] Set up database and tables
- [x] Implement POST /api/locations endpoint
- [x] Implement GET /api/devices endpoint
- [x] Implement GET /api/locations/latest endpoint
- [x] Create Python location simulator
- [x] Implement WebSocket broadcast

**Member 3:**
- [x] Create REST API client (`api.js`)
- [x] Create WebSocket client (`websocketClient.js`)
- [x] Create `useDevices` and `useWebSocket` hooks
- [x] Connect DevicePanel to API data

---

### Day 7: First Integration Checkpoint
**All Members:**
- [x] Test each module independently
- [x] Run simulator → backend → database pipeline
- [x] Connect frontend to backend APIs
- [x] Verify WebSocket connection
- [x] Identify and log integration issues

---

### Day 8–9: Full Integration
**Member 1:**
- [x] Connect 3D markers to live location data
- [x] Verify coordinate mapping accuracy
- [x] Add floor filtering/highlighting

**Member 2:**
- [x] Implement GET /api/locations/history endpoint
- [x] Add device status logic (online/stale/offline)
- [x] Fix any API issues found during integration

**Member 3:**
- [x] Real-time marker updates in 3D view
- [x] Floor selection filtering
- [x] Device status display
- [x] Last updated timestamps

---

### Day 10–11: Features & Polish
**Member 1:**
- [x] Improve building visual quality
- [x] Add floor labels and visual cues
- [x] Optimize 3D rendering performance

**Member 2:**
- [x] Location history API tested
- [x] Simulator improvements (realistic movement)
- [x] Database cleanup/optimization

**Member 3:**
- [x] Location history display & 3D breadcrumb trails (`DeviceTrail.jsx`)
- [x] Simulation start/stop controls
- [x] Loading and error states
- [x] Connection status indicator

---

### Day 12: End-to-End Testing
**All Members:**
- [x] Full system test: simulator → backend → frontend → 3D
- [x] Test with multiple simulated devices
- [x] Test device going offline/stale
- [x] Test floor switching
- [x] Test error scenarios (backend down, WebSocket disconnect)
- [x] Document any remaining bugs

---

### Day 13: Polish & Documentation
**All Members:**
- [x] Fix remaining bugs
- [x] Improve dashboard UI
- [x] Update README with setup instructions
- [x] Update all documentation files
- [x] Add code comments where needed

---

### Day 14: Final Delivery
**All Members:**
- [x] Final end-to-end test
- [x] Create unified one-click runner (`run_system.py`)
- [x] Prepare demonstration script & Viva defense guide (`docs/VIVA_PREPARATION.md`)
- [x] Verify setup instructions work from scratch
- [x] Final commits pushed to remote repository

---

## Acceptance Criteria

The project is functionally complete:

1. [x] Multi-storey 3D building renders correctly
2. [x] User can rotate and zoom the building
3. [x] User can select different floors
4. [x] Simulator generates synthetic location updates
5. [x] FastAPI receives and validates updates
6. [x] Database stores location information
7. [x] WebSockets transmit location updates
8. [x] Frontend receives updates without refreshing
9. [x] Markers appear at simulated locations
10. [x] Dashboard displays device information and status
11. [x] System handles disconnected and stale devices
12. [x] Project runs using documented setup instructions
