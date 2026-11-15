# System Integration & API Contract Specification
**NSG CQB Operations — 3D Live Location Tracking System**  
**Subsystem**: Member 2 — Backend Services  
**Version**: 1.0.0 (Production Stable)  
**Base URL**: `http://localhost:5001/api`  
**WebSocket URL**: `ws://localhost:5001/ws`

---

## 1. Overview & Architectural Boundaries

This contract defines the immutable interface specifications between the **Backend Subsystem (Member 2)** and:
1. **3D Building Visualization Subsystem (Member 1 — Three.js)**: Coordinate systems, floor bounds, elevation mappings, and real-time positioning telemetry.
2. **Dashboard UI Subsystem (Member 3 — React & Vite)**: REST API payloads, device statuses, building/floor hierarchies, historical tracking breadcrumbs, and live WebSocket subscriptions.

---

## 2. Spatial Coordinate System & Units

The system uses a standardized local Cartesian coordinate system aligned with building architectural floorplans:

| Dimension | Axis | Unit | Meaning |
|---|---|---|---|
| **Width (Horizontal)** | `x` | Meters ($m$) | Offset relative to building origin $(0, 0)$. Valid range: $[\text{min\_x}, \text{max\_x}]$. |
| **Depth (Horizontal)** | `z` | Meters ($m$) | Offset relative to building origin $(0, 0)$. Valid range: $[\text{min\_z}, \text{max\_z}]$. |
| **Elevation (Vertical)** | `elevation` / $y$ | Meters ($m$) | Floor height relative to ground grade ($0.0m$). Basements are negative (e.g. $-3.5m$ or $-4.0m$). |

### Three.js Mapping Rule for Member 1:
```typescript
// Three.js Vector3 conversion from backend location packet
const threePosition = new THREE.Vector3(
  packet.position.x,   // X -> Three.js X
  floor.elevation,     // Elevation -> Three.js Y (Vertical up)
  packet.position.z    // Z -> Three.js Z
);
```

---

## 3. Real-Time Telemetry Contract (Shared Ingestion Schema)

Every location packet ingested by backend or broadcasted over WebSocket complies with this canonical schema:

```json
{
  "device_id": "DEVICE_001",
  "building_id": "BUILDING_001",
  "floor_id": "FLOOR_00",
  "position": {
    "x": 24.50,
    "z": 18.25
  },
  "source": "SIMULATION",
  "timestamp": "2026-11-15T08:00:00.000Z"
}
```

### Schema Invariants:
- `timestamp`: ISO 8601 UTC string. Packets future-dated $>60\text{s}$ or older than current position are rejected or archived without overwriting current state.
- `position.x`, `position.z`: Double precision floating point numbers within floor bounds.
- `source`: Telemetry origin (e.g. `SIMULATION`, `UWB`, `BLE`, `GPS_INDOOR`, `MANUAL`).

---

## 4. WebSocket Protocol Specification (`ws://localhost:5001/ws`)

### 4.1 Connection & Handshake
Upon establishing a WebSocket connection, the backend immediately emits a `CONNECTED` welcome message:

```json
{
  "type": "CONNECTED",
  "clientId": "client_1731657600000_a1b2c3",
  "server": "live-location-tracking-backend",
  "timestamp": "2026-11-15T08:00:00.000Z",
  "wsPath": "/ws"
}
```

### 4.2 Keepalive Heartbeat
Clients may send `PING` to verify connection liveness. The server replies immediately with `PONG`:
- **Client Frame**: `{"type": "PING"}`
- **Server Frame**: `{"type": "PONG", "timestamp": "2026-11-15T08:00:01.000Z"}`

### 4.3 Spatial Subscriptions & View Filtering
By default, clients receive updates for all devices across all buildings. Dashboards or 3D floor views can filter updates dynamically:

#### Subscribe to specific building / floor:
```json
{
  "type": "SUBSCRIBE",
  "building_id": "BUILDING_001",
  "floor_id": "FLOOR_01",
  "device_id": null
}
```
**Server Response**:
```json
{
  "type": "SUBSCRIBED",
  "filters": {
    "building_id": "BUILDING_001",
    "floor_id": "FLOOR_01",
    "device_id": null
  },
  "timestamp": "2026-11-15T08:00:02.000Z"
}
```

#### Clear Filters (Listen to entire operational theater):
```json
{
  "type": "UNSUBSCRIBE"
}
```
**Server Response**:
```json
{
  "type": "UNSUBSCRIBED",
  "timestamp": "2026-11-15T08:00:03.000Z"
}
```

### 4.4 Live Broadcast Event: `LOCATION_UPDATE`
Emitted immediately following successful transactional commit in PostgreSQL:

```json
{
  "type": "LOCATION_UPDATE",
  "data": {
    "device_id": "DEVICE_001",
    "building_id": "BUILDING_001",
    "floor_id": "FLOOR_00",
    "position": {
      "x": 24.50,
      "z": 18.25
    },
    "source": "SIMULATION",
    "timestamp": "2026-11-15T08:00:04.120Z"
  }
}
```

---

## 5. REST API Endpoints Specification

All successful responses adhere to the standard envelope:
```json
{
  "success": true,
  "data": { ... }
}
```
All error responses adhere to:
```json
{
  "success": false,
  "error": {
    "message": "Human-readable explanation of rejection",
    "status": 400
  }
}
```

---

### 5.1 System & Health APIs

#### `GET /api/health`
- **Description**: Lightweight health and runtime metadata check.
- **Response**: `200 OK`
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-11-15T08:00:00.000Z",
  "service": "live-location-tracking-backend",
  "version": "1.0.0",
  "uptime": 124.5
}
```

---

### 5.2 Building & Floor Management APIs

#### `GET /api/buildings`
- **Query Params**: `?is_active=true`
- **Response**: `200 OK` — Array of buildings.

#### `POST /api/buildings`
- **Request Body**:
```json
{
  "building_id": "BUILDING_002",
  "name": "Urban Training Complex Bravo",
  "description": "Tactical CQB training mock-up",
  "address": "Sector 4, NSG Manesar",
  "is_active": true
}
```
- **Response**: `201 Created`

#### `GET /api/buildings/:buildingId`
- **Response**: `200 OK` — Details with associated floor count and summary.

#### `PUT /api/buildings/:buildingId`
- **Request Body**: `{ "name": "...", "description": "...", "address": "..." }`
- **Response**: `200 OK`

#### `PATCH /api/buildings/:buildingId/status`
- **Request Body**: `{ "is_active": false }`
- **Response**: `200 OK`

#### `GET /api/buildings/:buildingId/floors`
- **Query Params**: `?is_active=true`
- **Response**: `200 OK` — Floors ordered by `floor_number ASC`.
```json
{
  "success": true,
  "data": [
    {
      "floor_id": "FLOOR_B1",
      "building_id": "BUILDING_001",
      "floor_name": "Basement Level 1 - Bunker",
      "floor_number": -1,
      "elevation": -4.0,
      "min_x": 0.0,
      "max_x": 50.0,
      "min_z": 0.0,
      "max_z": 50.0,
      "is_active": true
    }
  ]
}
```

#### `POST /api/buildings/:buildingId/floors`
- **Request Body**:
```json
{
  "floor_id": "FLOOR_03",
  "floor_name": "Observation Deck",
  "floor_number": 3,
  "elevation": 12.0,
  "min_x": 0.0,
  "max_x": 50.0,
  "min_z": 0.0,
  "max_z": 50.0
}
```
- **Response**: `201 Created`

#### `GET /api/floors/:floorId`
- **Response**: `200 OK`

#### `PUT /api/floors/:floorId`
- **Request Body**: `{ "floor_name": "...", "elevation": 12.5, "min_x": 0.0, ... }`
- **Response**: `200 OK` *(Note: Triggers prevent shrinking boundaries if active device positions would become out-of-bounds)*

---

### 5.3 Device Management & Assignment APIs

#### `GET /api/devices`
- **Query Params**: `?admin_status=DEPLOYED&is_active=true&building_id=BUILDING_001`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "device_id": "DEVICE_001",
      "device_name": "Tactical Assault Unit 1",
      "callsign": "Assault Lead Alpha",
      "admin_status": "DEPLOYED",
      "is_active": true,
      "last_seen_at": "2026-11-15T08:00:00.000Z",
      "current_building_id": "BUILDING_001",
      "current_building_name": "NSG Headquarters - Main Facility",
      "connectivity_status": "ONLINE"
    }
  ]
}
```

#### Dynamic Connectivity States:
- `ONLINE`: Telemetry received within last 30 seconds (`DEVICE_STALE_TIMEOUT_SECONDS`).
- `STALE`: No telemetry between 30 and 120 seconds.
- `OFFLINE`: No telemetry for over 120 seconds.
- `MAINTENANCE`: Device flagged under repair/diagnostic.
- `DECOMMISSIONED`: Device permanently retired.

#### `POST /api/devices`
- **Request Body**:
```json
{
  "device_id": "DEVICE_005",
  "device_name": "K9 Handler Unit",
  "callsign": "K9 Hunter",
  "admin_status": "DEPLOYED",
  "initial_building_id": "BUILDING_001"
}
```
- **Response**: `201 Created`

#### `GET /api/devices/:deviceId`
- **Response**: `200 OK` — Device details with current building assignment and current coordinates.

#### `PATCH /api/devices/:deviceId/admin-status`
- **Request Body**: `{ "admin_status": "MAINTENANCE" }`
- **Response**: `200 OK`

#### `POST /api/devices/:deviceId/assignments`
- **Description**: Reassigns device to a new building, automatically closing prior assignment.
- **Request Body**:
```json
{
  "building_id": "BUILDING_002",
  "notes": "Redeployed for perimeter breach exercise",
  "assigned_by": "Mission Controller"
}
```
- **Response**: `200 OK`

#### `PATCH /api/devices/:deviceId/assignments/unassign`
- **Response**: `200 OK` — Detaches device from current building into unassigned pool.

#### `GET /api/devices/:deviceId/assignments`
- **Response**: `200 OK` — Chronological history of all deployment assignments.

#### `GET /api/buildings/:buildingId/devices`
- **Response**: `200 OK` — All devices actively assigned to this building.

---

### 5.4 Fleet Health & Connectivity Monitoring

#### `GET /api/devices/monitoring/health`
- **Description**: High-level aggregated fleet metrics for mission dashboard top-bar.
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "total_active_devices": 4,
    "counts": {
      "ONLINE": 4,
      "STALE": 0,
      "OFFLINE": 0,
      "MAINTENANCE": 0,
      "DECOMMISSIONED": 0,
      "UNKNOWN": 0
    },
    "by_building": {
      "BUILDING_001": {
        "building_id": "BUILDING_001",
        "building_name": "NSG Headquarters - Main Facility",
        "total": 4,
        "ONLINE": 4,
        "STALE": 0,
        "OFFLINE": 0
      }
    },
    "devices": [ ... ]
  }
}
```

---

### 5.5 Location Ingestion & Spatial Query APIs

#### `POST /api/locations`
- **Description**: Core telemetry ingestion endpoint. Validates boundaries, persists history, upserts current position, and triggers WebSocket broadcast.
- **Request Body**:
```json
{
  "device_id": "DEVICE_001",
  "building_id": "BUILDING_001",
  "floor_id": "FLOOR_01",
  "position": {
    "x": 18.40,
    "z": 22.10
  },
  "source": "SIMULATION",
  "timestamp": "2026-11-15T08:00:10.000Z"
}
```
- **Response**: `201 Created`

#### `GET /api/locations/latest`
- **Query Params**: `?building_id=BUILDING_001&floor_id=FLOOR_01`
- **Response**: `200 OK` — Array of all active current positions with building and floor elevations.

#### `GET /api/locations/latest/:deviceId`
- **Response**: `200 OK` — Current instantaneous position of a single device.

#### `GET /api/locations/history/:deviceId`
- **Query Params**: `?from=2026-11-15T00:00:00Z&to=2026-11-15T23:59:59Z&limit=100&offset=0&sort=DESC`
- **Response**: `200 OK` — Paginated immutable chronological movement breadcrumbs.

#### `GET /api/locations/building/:buildingId`
- **Response**: `200 OK` — All devices currently inside specified building.

#### `GET /api/locations/floor/:floorId`
- **Response**: `200 OK` — All devices currently located on specified floor.

#### `GET /api/locations/summary/:deviceId`
- **Response**: `200 OK` — Movement statistics, first/last seen timestamps, total points, floors visited, and 2D bounding box extent.
```json
{
  "success": true,
  "data": {
    "device_id": "DEVICE_001",
    "callsign": "Assault Lead Alpha",
    "total_locations_recorded": 142,
    "first_observed_at": "2026-11-15T07:30:00.000Z",
    "last_observed_at": "2026-11-15T08:05:12.000Z",
    "floors_visited_count": 3,
    "bounding_box": {
      "min_x": 4.20,
      "max_x": 45.80,
      "min_z": 6.10,
      "max_z": 48.90
    }
  }
}
```

---

## 6. Synthetic Movement Simulator Usage

The backend includes a standalone kinematic simulation engine (`backend/simulator/simulator.js`):

```bash
# Run simulator against local server
cd backend
npm run simulate
```

### Supported Environment Overrides:
```bash
API_BASE_URL=http://localhost:5001/api \
SIMULATOR_BUILDING_ID=BUILDING_001 \
SIMULATOR_INTERVAL_MS=2000 \
SIMULATOR_DEVICES="DEVICE_001,DEVICE_002,DEVICE_003,DEVICE_004" \
npm run simulate
```
