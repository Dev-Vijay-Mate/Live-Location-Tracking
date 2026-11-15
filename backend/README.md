# NSG 3D Live Location Tracking System — Backend Subsystem
**Ministry of Home Affairs — Special Operations CQB Tactical Tracking**  
**Subsystem Responsibility**: Member 2 — Backend Engineering & Telemetry Ingestion  
**Repository Branch**: `feature/backend-system`

---

## 1. Architectural Overview & Responsibilities

The Backend Subsystem provides the mission-critical data processing engine, relational spatial persistence layer, real-time telemetry ingestion pipeline, and WebSocket broadcasting bus for indoor tactical CQB operations.

```
       [UWB / BLE / Synthetic Simulator]
                       │
                       │ HTTP POST /api/locations (Signed JSON Telemetry)
                       ▼
       ┌───────────────────────────────┐
       │   Express.js REST Gateway     │
       │    (Port 5001 / Strict CORS)  │
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │ Location Processing Pipeline  │
       │  - Floor boundary validation  │
       │  - Active assignment checking │
       │  - Timestamp drift guard      │
       └───────────────┬───────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐       ┌────────────────────────┐
│ PostgreSQL 14+  │       │ WebSocket Event Bus    │
│  (ACID Pool)    │       │ (`ws` on /ws)          │
├─────────────────┤       ├────────────────────────┤
│ current_pos     │       │ Filtered Fan-out:      │
│ location_history│       │  - building_id         │
│ spatial_triggers│       │  - floor_id            │
│ advisory_locks  │       │  - device_id           │
└─────────────────┘       └───────────┬────────────┘
                                      │
            ┌─────────────────────────┴────────────────────────┐
            ▼                                                  ▼
┌──────────────────────────────┐              ┌─────────────────────────────────┐
│ Member 1: Three.js Subsystem │              │ Member 3: React Dashboard UI    │
│  - 3D Building Geometry      │              │  - Mission Operator Fleet View  │
│  - Spatial Marker Vector3    │              │  - Live Status & Floor Switcher │
└──────────────────────────────┘              └─────────────────────────────────┘
```

---

## 2. Directory Layout

```text
backend/
├── .env.example                       # Canonical template with all configuration variables
├── package.json                       # Zero unnecessary deps (CommonJS, Express, pg, ws, cors)
├── README.md                          # Comprehensive operational manual
├── docs/
│   ├── API_CONTRACT.md                # Frozen contract specs for Member 1 & 3 integration
│   └── DEVELOPMENT_PROGRESS.md        # Phase ledger with commit history and test counts
├── simulator/
│   └── simulator.js                   # Smooth kinematic 2D/3D indoor patrol movement generator
├── src/
│   ├── app.js                         # Modular Express app with CORS & security handlers
│   ├── server.js                      # HTTP entry point with native WebSocket server binding
│   ├── config/                        # Strongly typed configuration loading
│   ├── controllers/                   # Building, floor, device, assignment, location controllers
│   ├── db/
│   │   ├── index.js                   # Configurable pg.Pool with advisory locks
│   │   ├── migrate.js                 # Transactional advisory-locked migration runner
│   │   ├── seed.js                    # Tactical baseline NSG facility and operator seed data
│   │   └── migrations/                # Versioned sequential SQL migrations (001 to 005)
│   ├── middleware/                    # Centralized error handler with PostgreSQL code mapping
│   ├── routes/                        # REST routes (/api/buildings, /devices, /locations, /health)
│   ├── services/                      # Spatial business logic, connectivity status, assignments
│   └── websocket/                     # ws connection lifecycle, heartbeats, filtered subscriptions
└── tests/                             # 71 automated tests across 8 complete suites (node:test)
    ├── health.test.js                 # Phase 2: Server bootstrap, health & CORS
    ├── database.test.js               # Phase 3: PostgreSQL triggers, immutability, constraints
    ├── buildings_floors.test.js       # Phase 4: Facility and multi-level floor management
    ├── devices_assignments.test.js    # Phase 5 & 6: Operator tags & building assignments
    ├── locations.test.js              # Phase 7 & 8: Ingestion, historical trails, latest positions
    ├── websocket_monitoring.test.js   # Phase 9 & 10: Fleet health metrics & WebSocket broadcasts
    ├── simulator.test.js              # Phase 11: Synthetic kinematic movement generation
    └── integration_e2e.test.js        # Phase 13: End-to-end multi-storey mission workflow
```

---

## 3. Quick Start & Execution Guide

### 3.1 Prerequisites
- **Node.js**: v18.0.0 or higher (v24 LTS recommended)
- **PostgreSQL**: v14.0 or higher running on `localhost:5432`

### 3.2 Environment Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your local PostgreSQL password if required
```

### 3.3 Database Initialization
```bash
# Apply versioned transactional migrations
npm run db:migrate

# Seed tactical baseline building, floors, devices, and assignments
npm run db:seed
```

### 3.4 Starting the Server
```bash
# Start production HTTP and WebSocket server
npm start

# Or start development mode with hot-reloading (nodemon)
npm run dev
```
The server will bind to `http://localhost:5001` (REST API) and `ws://localhost:5001/ws` (WebSocket live broadcast stream).

### 3.5 Running Automated Tests
```bash
# Execute all 71 tests across 8 suites
npm test
```

### 3.6 Launching Synthetic Movement Simulator
```bash
# Start kinematic simulator generating realistic operator movement
npm run simulate
```

---

## 4. REST API Endpoint Reference

Detailed schemas, query parameters, and example JSON payloads are documented in [`docs/API_CONTRACT.md`](file:///Users/jaysawantmac105/Documents/Live-Location-Tracking/backend/docs/API_CONTRACT.md).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health, uptime, and metadata |
| `GET` | `/api/buildings` | List all buildings (`?is_active=true`) |
| `POST`| `/api/buildings` | Register new building |
| `GET` | `/api/buildings/:buildingId` | Building details & floor overview |
| `PUT` | `/api/buildings/:buildingId` | Update building information |
| `PATCH`| `/api/buildings/:buildingId/status` | Activate / deactivate building |
| `GET` | `/api/buildings/:buildingId/floors` | List floors ordered by elevation |
| `POST`| `/api/buildings/:buildingId/floors` | Add floor with `[min_x, max_x, min_z, max_z]` |
| `GET` | `/api/floors/:floorId` | Floor details and boundary box |
| `PUT` | `/api/floors/:floorId` | Update floor boundaries (guarded against active device invalidation) |
| `GET` | `/api/devices` | List operators with dynamic connectivity status |
| `POST`| `/api/devices` | Register device with initial building assignment |
| `GET` | `/api/devices/:deviceId` | Single device info and current location |
| `PUT` | `/api/devices/:deviceId` | Update device details and callsign |
| `PATCH`| `/api/devices/:deviceId/admin-status` | Set status (`DEPLOYED`, `MAINTENANCE`, `STANDBY`, etc.) |
| `POST`| `/api/devices/:deviceId/assignments` | Reassign operator to new building |
| `PATCH`| `/api/devices/:deviceId/assignments/unassign` | Detach operator from current building |
| `GET` | `/api/devices/:deviceId/assignments` | Chronological deployment history |
| `GET` | `/api/buildings/:buildingId/devices` | Operators actively deployed in building |
| `GET` | `/api/devices/monitoring/health` | Mission fleet health and online/stale/offline breakdown |
| `POST`| `/api/locations` | **Core Telemetry Ingestion** (persists & broadcasts) |
| `GET` | `/api/locations/latest` | Real-time positions of all active devices |
| `GET` | `/api/locations/latest/:deviceId` | Instantaneous 3D position of single device |
| `GET` | `/api/locations/history/:deviceId` | Paginated chronological movement breadcrumbs |
| `GET` | `/api/locations/building/:buildingId` | Real-time positions in specific building |
| `GET` | `/api/locations/floor/:floorId` | Real-time positions on specific floor |
| `GET` | `/api/locations/summary/:deviceId` | Movement metrics, bounding box, and floors visited |

---

## 5. WebSocket Integration (`ws://localhost:5001/ws`)

### Message Types:
- **`CONNECTED`**: Sent by server upon connection.
- **`PING` / `PONG`**: Bidirectional keepalive handshake.
- **`SUBSCRIBE`**: Client filters updates by `building_id`, `floor_id`, or `device_id`.
- **`UNSUBSCRIBE`**: Reset filters to receive entire operational theater.
- **`LOCATION_UPDATE`**: Real-time event emitted immediately upon database commit.

---

## 6. Team Integration Guidelines

- **Member 1 (Three.js 3D Visualization)**: Map `packet.position.x` to Three.js `X`, `floor.elevation` to Three.js `Y` (up), and `packet.position.z` to Three.js `Z`.
- **Member 3 (React/Vite Frontend)**: Point Vite proxy or `fetch` calls to `http://localhost:5001/api` and WebSocket client to `ws://localhost:5001/ws`. CORS is configured for `http://localhost:5173`.
