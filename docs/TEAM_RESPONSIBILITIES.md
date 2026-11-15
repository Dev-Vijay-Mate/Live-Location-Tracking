# Team Responsibilities

## Team Structure

The project is developed by a 3-member team. Each member owns one primary module but all members participate in testing, debugging, integration and documentation.

---

## Member 1 — 3D Building & Spatial Engineering

**Owns:** 3D visualization and spatial coordinate system

### Responsibilities

1. Create a generic multi-storey 3D building using Three.js / React Three Fiber.
2. Create basement, ground floor, first floor and second floor.
3. Add basic architectural elements: walls, floors, rooms and corridors.
4. Implement camera rotation, zoom and navigation.
5. Establish a consistent 3D coordinate system.
6. Create reusable device/personnel position markers.
7. Map incoming location coordinates to corresponding 3D positions.
8. Implement floor-level visualization and floor selection support.
9. Test coordinate mapping and marker placement.

### Deliverables

| File | Description |
|------|-------------|
| `frontend/src/three/Building.jsx` | Main 3D building component |
| `frontend/src/three/BuildingFloor.jsx` | Individual floor component |
| `frontend/src/three/DeviceMarkers.jsx` | Device position markers |
| `frontend/src/config/coordinateMapping.js` | Coordinate conversion utilities |
| `frontend/src/config/buildingConfig.js` | Floor dimensions and elevation config |

---

## Member 2 — Backend, Database & Simulation

**Owns:** Backend services, database and synthetic data generation

### Responsibilities

1. Set up Python FastAPI.
2. Design the PostgreSQL database.
3. Create APIs for devices and location information.
4. Validate incoming location data.
5. Implement WebSocket communication.
6. Create a Python location simulator.
7. Generate synthetic device movements.
8. Store current and historical location records.
9. Implement online/offline/stale device status logic.
10. Test backend APIs and WebSocket communication.

### Deliverables

| File | Description |
|------|-------------|
| `backend/app/main.py` | FastAPI application entry point |
| `backend/app/core/database.py` | Database connection and session |
| `backend/app/models/location.py` | SQLAlchemy ORM models |
| `backend/app/schemas/location.py` | Pydantic validation schemas |
| `backend/app/api/locations.py` | Location API routes |
| `backend/app/api/devices.py` | Device API routes |
| `backend/app/services/websocket.py` | WebSocket manager |
| `simulator/main.py` | Location simulator entry point |
| `simulator/config.py` | Simulator configuration |

---

## Member 3 — Frontend & System Integration

**Owns:** User interface and overall application integration

### Responsibilities

1. Set up React and Vite.
2. Create the main monitoring dashboard.
3. Create the device/personnel list panel.
4. Implement floor selection.
5. Display device status (online/offline/stale).
6. Display last updated timestamps.
7. Connect frontend to FastAPI REST APIs.
8. Implement the WebSocket client.
9. Integrate Member 1's 3D building component.
10. Connect real-time location data to the 3D visualization.
11. Handle loading, errors and connection states.
12. Test the complete frontend.

### Deliverables

| File | Description |
|------|-------------|
| `frontend/src/components/Dashboard.jsx` | Main monitoring dashboard |
| `frontend/src/components/DevicePanel.jsx` | Device information panel |
| `frontend/src/components/FloorSelector.jsx` | Floor selection interface |
| `frontend/src/components/StatusPanel.jsx` | Connection and system status |
| `frontend/src/services/websocketClient.js` | WebSocket client |
| `frontend/src/services/api.js` | REST API client |
| `frontend/src/hooks/useDevices.js` | Device data hook |
| `frontend/src/hooks/useWebSocket.js` | WebSocket connection hook |

---

## Shared Responsibilities (All Members)

- Review and agree on the data contract
- Integration testing at Day 7 checkpoint
- End-to-end testing at Day 12
- Bug fixes and error handling
- Documentation
- Final demonstration and viva preparation
