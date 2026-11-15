# Pull Request: Integration of Node.js Production Backend & Dual-Stack Real-Time Pipeline

**Title**: `feat(backend): integrate Node.js Express/PostgreSQL/WebSocket real-time backend with dual-stack contract compatibility`  
**Base Branch**: `main`  
**Compare Branch**: `feature/backend-system`  

---

## 1. Executive Summary & Project Overview

This Pull Request integrates the complete, production-grade **Node.js + PostgreSQL + WebSocket** backend subsystem (developed across 14 phases with 78 automated verification tests) into the team's shared repository. 

### Key Objectives Achieved:
1. **Primary Production Engine**: Establishes the Node.js/Express backend as the primary production backend for high-throughput location ingestion, strict spatial boundary enforcement, and real-time WebSocket broadcasting.
2. **Dual-Stack Preservation**: The existing Python/FastAPI backend (`backend/app/`) and simulator (`simulator/`) are **fully preserved** as legacy/fallback implementations. No teammate code, models, or assets were deleted.
3. **Full Frontend & Three.js Compatibility**: Implements backward- and forward-compatible contract adapters so Member 3's React/Vite tactical dashboard and Member 1's Three.js 3D building visualization communicate with the Node.js backend with zero frontend code changes.
4. **Idempotent Relational Schema**: Enforces spatial triggers, foreign key constraints, temporal assignment tracking, and telemetry immutability directly in PostgreSQL.
5. **Unified Multi-Agent Runner**: Extends `run_system.py` to seamlessly orchestrate the unified stack with `--backend node` (default) or `--backend python`.

---

## 2. Backend Subsystem Architecture

The Node.js backend (`backend/src/`) is built with a modular, layered service-oriented architecture:

```
[IoT Hardware / Telemetry Simulator]
             │
      HTTP POST /api/locations
             ▼
┌───────────────────────────────────────────────┐
│              Express Application              │
│  - Security Headers & CORS (ports 3000, 5173) │
│  - Request Validation & Structured Errors     │
│  - REST Controllers (Buildings, Devices, Loc) │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│               Service Pipeline                │
│  - Device Verification & Status Transition    │
│  - Spatial Coordinate Validation              │
│  - Transactional Database Persistence         │
└───────────────────────┬───────────────────────┘
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────────┐         ┌───────────────────┐
│ PostgreSQL Pool  │         │ WebSocket Server  │
│ - Advisory Locks │         │ - Path: /ws/locs  │
│ - Floor Triggers │         │ - Raw/JSON Pings  │
│ - History Table  │         │ - Filtered Pub/Sub│
│ - Current Cache  │         │ - Broadcast Engine│
└──────────────────┘         └─────────┬─────────┘
                                       │
                                       ▼
                       [React 3D Tactical Client]
```

---

## 3. PostgreSQL Schema, Integrity Triggers & Migrations

Database migrations in `backend/src/db/migrations/` execute idempotently using PostgreSQL advisory locks (`pg_advisory_lock`):

1. **`001_create_schema_migrations.sql`**: Schema version tracker table.
2. **`002_create_buildings_and_floors.sql`**:
   * `buildings`: Unique alphanumeric identifiers, names, address, status, timestamps.
   * `floors`: Foreign key to `buildings`, floor number, elevation (meters), spatial bounding box (`min_x`, `max_x`, `min_z`, `max_z`).
3. **`003_create_devices_and_assignments.sql`**:
   * `devices`: Hardware tag registry, callsigns, operational status, heartbeat tracking (`last_seen_at`).
   * `device_assignments`: Temporal building deployments enforcing a single active assignment per device via partial unique index.
4. **`004_create_location_tables.sql`**:
   * `location_history`: Append-only spatial audit log indexed with compound B-Trees `(device_id, timestamp DESC)`.
   * `current_locations`: High-performance $O(1)$ fast-lookup cache table keeping only the latest known spatial fix per device.
5. **`005_create_boundary_and_validation_triggers.sql`**:
   * `trg_validate_location_bounds`: Database-level trigger rejecting any telemetry falling outside floor boundaries $[min\_x, max\_x] \times [min\_z, max\_z]$.
   * `trg_validate_observation_timestamp`: Database-level trigger preventing future-dated timestamps exceeding 60-second drift tolerance.
   * `trg_location_history_immutability`: Database-level trigger blocking any `UPDATE` or `DELETE` queries on historical telemetry.

---

## 4. REST API Contract & Compatibility Layer

The REST layer adheres to `docs/API_CONTRACT.md` and provides dual-format responses supporting both standard and legacy dashboard consumers:

| Endpoint | Method | Description | Compatibility Notes |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Service & DB health check | Returns `{ status: "OK", database: "connected", timestamp }` |
| `/api/buildings` | `GET`, `POST` | List and create buildings | Returns building metadata and active floor lists |
| `/api/buildings/:id/floors` | `GET`, `POST` | Floor definitions & bounds | Returns ordered floor elevations and $(X, Z)$ bounds |
| `/api/devices` | `GET`, `POST` | Device fleet inventory | Returns `{ success: true, data: [...], devices: [...] }` with attached `position` and `current_floor_id` |
| `/api/devices/:id/assign` | `POST` | Building assignment | Transactional reassignment updating `device_assignments` |
| `/api/devices/monitoring/health`| `GET` | Fleet health & status | Computes active/stale/offline counts using configurable thresholds |
| `/api/locations` | `POST` | Ingest location packet | Persists to DB, updates current location, returns `{ status: "accepted" }`, triggers WS broadcast |
| `/api/locations/latest` | `GET` | All active positions | Returns `{ data: [...], locations: [...] }` |
| `/api/locations/history/:id` | `GET` | Device movement trail | Returns `{ data: [...], history: [...] }` for 3D trajectory breadcrumbs |

---

## 5. WebSocket Real-Time Gateway & Streaming Engine

Mounted directly on Node's native HTTP server to share port `8000`:
* **Endpoints Supported**: Both `/ws` and `/ws/locations`.
* **Handshake**: Emits `connection_ack` (for React `useWebSocket` hook) and `CONNECTED` (for test clients).
* **Heartbeat Protocols**:
  * Raw text: Client sends `"ping"` $\rightarrow$ Server responds `"pong"`.
  * JSON: Client sends `{"type": "PING"}` $\rightarrow$ Server responds `{"type": "PONG"}`.
* **Dual Event Broadcasting**:
  * Emits lowercase `{"type": "location_update", "data": {...}}` required by frontend hooks.
  * Emits uppercase `{"type": "LOCATION_UPDATE", "data": {...}}` for backend test harnesses.
* **Filtered Subscriptions**: Supports client filtering by `building_id`, `floor_id`, or `device_id`.
* **Zero Phantom Broadcasts**: Updates are broadcast **only after** PostgreSQL transaction commits successfully.

---

## 6. Synthetic Movement Simulator

Located in `backend/simulator/simulator.js`:
* Models realistic CQB multi-storey movement for tactical tags (`DEMO_DEVICE_001` through `DEMO_DEVICE_005` and `DEVICE_001` through `DEVICE_004`).
* Adheres to floor boundaries with reflection mechanics upon reaching perimeter walls.
* Probabilistic vertical transitions between floors (`BASEMENT`, `FLOOR_00`, `FLOOR_01`, `FLOOR_02`).
* Configurable update rate (default: 1.5s) and velocity (1.5 m/s).

---

## 7. Frontend & Three.js 3D Coordinate Mapping

* **Coordinate System**: X and Z represent horizontal 2D floor coordinates; Y represents elevation.
* **Vertical Elevations**:
  * `BASEMENT` (`FLOOR_B1`): $-4.0\text{ m}$
  * `GROUND` (`FLOOR_00`): $0.0\text{ m}$
  * `FIRST` (`FLOOR_01`): $4.0\text{ m}$
  * `SECOND` (`FLOOR_02`): $8.0\text{ m}$
* **Floor Aliasing**: Integrated normalization maps `GROUND` $\leftrightarrow$ `FLOOR_00`, `FIRST` $\leftrightarrow$ `FLOOR_01`, etc.

---

## 8. Verification & Automated Test Results

### Automated Backend Tests
**78 passing tests across 9 test suites** (0 failures, duration: ~1.4s):
```
▶ Phase 4: Building & Floor Management APIs (15 tests)                      ✔ PASS
▶ Phase 3: PostgreSQL Database Schema & Integrity Engine (10 tests)        ✔ PASS
▶ Phase 1 & 2: Environment Configuration & Server Bootstrap (6 tests)      ✔ PASS
▶ Phase 5 & 6: Device Management & Tactical Assignments (16 tests)          ✔ PASS
▶ Phase 12-14: System Audit, Operational Resilience & Security (5 tests)   ✔ PASS
▶ Phase 7 & 8: Location Ingestion & Spatial Retrieval APIs (10 tests)      ✔ PASS
▶ Phase 11: Synthetic Movement Simulator (5 tests)                          ✔ PASS
▶ Phase 9 & 10: Device Monitoring & WebSocket Broadcasting (4 tests)        ✔ PASS
▶ Frontend Contract Compatibility: React & Three.js Integration (7 tests)  ✔ PASS

Total: 78 tests passing (0 failures)
```

---

## 9. Startup & Execution Instructions

### Prerequisites
* Node.js v18+ (tested on v24.13.0)
* PostgreSQL 14+ running on port 5432 with database `live_location_tracking`

### Option A — Unified System Runner (Recommended)
```bash
# Runs Node.js backend (port 8000), Vite frontend (port 3000), and simulator
python run_system.py --backend node
```

### Option B — Manual Service Startup
1. **Run Migrations & Seed Baseline Data**:
   ```bash
   cd backend
   npm run db:migrate
   npm run db:seed
   ```
2. **Start Node.js Backend**:
   ```bash
   cd backend
   PORT=8000 npm start
   ```
3. **Start Synthetic Simulator**:
   ```bash
   cd backend
   npm run simulate
   ```
4. **Start Vite React Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 10. Status of Legacy Python Backend

* **Status**: Retained in repository under `backend/app/` and `simulator/main.py`.
* **Execution**: Accessible via `python run_system.py --backend python`.
* **Recommendation**: Retain during staging evaluation, then deprecate in a future release once all team members validate the Node.js production engine.
