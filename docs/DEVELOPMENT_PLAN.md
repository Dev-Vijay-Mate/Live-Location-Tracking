# Development Plan — 14-Day Roadmap

## Timeline Overview

| Days | Phase | Focus |
|------|-------|-------|
| 1–2 | Foundation | Architecture, setup, documentation |
| 3–4 | Core Development | Building, backend, dashboard |
| 5–6 | Infrastructure | Database, simulator, WebSocket |
| 7 | Checkpoint | Module testing, first integration |
| 8–9 | Integration | Connect all modules |
| 10–11 | Features | Device info, history, polish |
| 12 | Testing | End-to-end, error handling |
| 13 | Polish | UI, docs, bug fixes |
| 14 | Delivery | Final test, demo, viva prep |

---

## Detailed Day-by-Day Plan

### Day 1–2: Foundation & Setup

**All Members:**
- [x] Repository analysis
- [x] Project architecture design
- [x] API and data contract agreement
- [x] Documentation structure

**Member 1:**
- [ ] Set up React Three Fiber development environment
- [ ] Study Drei helpers and camera controls
- [ ] Plan building geometry and floor dimensions

**Member 2:**
- [ ] Set up Python virtual environment
- [ ] Install FastAPI and dependencies
- [ ] Start PostgreSQL service
- [ ] Plan database schema

**Member 3:**
- [ ] Initialize Vite + React project
- [ ] Plan dashboard layout and components
- [ ] Set up project routing

---

### Day 3–4: Core Development

**Member 1:**
- [ ] Create `buildingConfig.js` with floor dimensions
- [ ] Build basic 3D building geometry (4 floors)
- [ ] Add camera controls (orbit, zoom)
- [ ] Create floor component with walls and floor plane

**Member 2:**
- [ ] Create FastAPI project structure
- [ ] Define SQLAlchemy models (devices, locations)
- [ ] Define Pydantic schemas for validation
- [ ] Implement health check endpoint

**Member 3:**
- [ ] Create Dashboard layout component
- [ ] Create DevicePanel component
- [ ] Create FloorSelector component
- [ ] Set up basic CSS/styling

---

### Day 5–6: Infrastructure

**Member 1:**
- [ ] Add room divisions and corridors
- [ ] Create `coordinateMapping.js`
- [ ] Create `DeviceMarkers.jsx` component
- [ ] Test marker placement on each floor

**Member 2:**
- [ ] Set up PostgreSQL database and tables
- [ ] Implement POST /api/locations endpoint
- [ ] Implement GET /api/devices endpoint
- [ ] Implement GET /api/locations/latest endpoint
- [ ] Create Python location simulator
- [ ] Implement WebSocket broadcast

**Member 3:**
- [ ] Create REST API client (`api.js`)
- [ ] Create WebSocket client
- [ ] Create `useDevices` and `useWebSocket` hooks
- [ ] Connect DevicePanel to API data

---

### Day 7: First Integration Checkpoint

**All Members:**
- [ ] Test each module independently
- [ ] Run simulator → backend → database pipeline
- [ ] Connect frontend to backend APIs
- [ ] Verify WebSocket connection
- [ ] Identify and log integration issues

---

### Day 8–9: Full Integration

**Member 1:**
- [ ] Connect 3D markers to live location data
- [ ] Verify coordinate mapping accuracy
- [ ] Add floor filtering/highlighting

**Member 2:**
- [ ] Implement GET /api/locations/history endpoint
- [ ] Add device status logic (online/stale/offline)
- [ ] Fix any API issues found during integration

**Member 3:**
- [ ] Real-time marker updates in 3D view
- [ ] Floor selection filtering
- [ ] Device status display
- [ ] Last updated timestamps

---

### Day 10–11: Features & Polish

**Member 1:**
- [ ] Improve building visual quality
- [ ] Add floor labels and visual cues
- [ ] Optimize 3D rendering performance

**Member 2:**
- [ ] Location history API tested
- [ ] Simulator improvements (realistic movement)
- [ ] Database cleanup/optimization

**Member 3:**
- [ ] Location history display
- [ ] Simulation start/stop controls
- [ ] Loading and error states
- [ ] Connection status indicator

---

### Day 12: End-to-End Testing

**All Members:**
- [ ] Full system test: simulator → backend → frontend → 3D
- [ ] Test with multiple simulated devices
- [ ] Test device going offline/stale
- [ ] Test floor switching
- [ ] Test error scenarios (backend down, WebSocket disconnect)
- [ ] Document any remaining bugs

---

### Day 13: Polish & Documentation

**All Members:**
- [ ] Fix remaining bugs
- [ ] Improve dashboard UI
- [ ] Update README with setup instructions
- [ ] Update all documentation files
- [ ] Add code comments where needed

---

### Day 14: Final Delivery

**All Members:**
- [ ] Final end-to-end test
- [ ] Prepare demonstration script
- [ ] Practice viva questions
- [ ] Verify setup instructions work from scratch
- [ ] Final commit and push

---

## Acceptance Criteria

The project is functionally complete when:

1. ✅ Multi-storey 3D building renders correctly
2. ✅ User can rotate and zoom the building
3. ✅ User can select different floors
4. ✅ Simulator generates synthetic location updates
5. ✅ FastAPI receives and validates updates
6. ✅ PostgreSQL stores location information
7. ✅ WebSockets transmit location updates
8. ✅ Frontend receives updates without refreshing
9. ✅ Markers appear at simulated locations
10. ✅ Dashboard displays device information and status
11. ✅ System handles disconnected and stale devices
12. ✅ Project runs using documented setup instructions
