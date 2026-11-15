# Academic Viva & Technical Defense Preparation Guide

This document prepares the project team for project presentations, viva examinations, and technical defense before internal and external evaluators.

---

## 🎯 1. Project Background & Motivation

### Q: What is the core problem this project solves?
**A:** In Close Quarters Battle (CQB) operations conducted by the National Security Guard (NSG), tactical teams (House Intervention Teams - HIT) operate inside complex, multi-storey structures such as hotels, hospitals, and transit hubs. Traditional GPS/GSM signals cannot penetrate these GPS-denied indoor environments, and 2D mapping tools cannot distinguish whether a soldier is in the basement, ground floor, or top floor. Our system solves this by providing real-time 3D spatial visualization with automatic floor-level identification and room detection.

### Q: Why is 3D visualization necessary instead of standard 2D floor plans?
**A:** Multi-storey buildings have complex vertical relationships (stairwells, elevator shafts, atriums, basements). A 2D floor plan only shows one level at a time. A 3D spatial model allows the Task Force Commander to immediately perceive:
1. Team distribution across storeys simultaneously.
2. Vertical clearing progress (e.g., Lead team on 1F, Overwatch on 2F, Breacher on Ground).
3. Tactical line-of-sight and vertical coverage.

---

## 🏗️ 2. System Architecture & Technical Decisions

### Q: Explain the end-to-end data flow of the application.
**A:**
1. **Simulation Layer (Python):** Generates synthetic spatial coordinates `(x, z, floor_id)` with realistic velocity and footstep micro-jitter.
2. **Ingestion Layer (FastAPI REST):** `POST /api/locations` validates telemetry against Pydantic schemas.
3. **Persistence Layer (PostgreSQL / SQLite):** Upserts device current state and appends to `location_records` for audit and trajectory playback.
4. **Streaming Layer (WebSockets):** `ConnectionManager` broadcasts JSON updates to all connected browser dashboards.
5. **Presentation Layer (React + Three.js):** Custom hooks (`useWebSocket`, `useDevices`) ingest messages and smoothly interpolate (`lerp`) 3D octahedral markers inside the building model without page reloading.

### Q: Why WebSockets instead of HTTP Long Polling or Server-Sent Events (SSE)?
**A:**
* **WebSockets** provide full-duplex, low-latency, bidirectional communication over a single TCP connection. Once the handshake is complete, data frames carry minimal header overhead (2–10 bytes vs ~800 bytes per HTTP polling request).
* In tactical CQB scenarios where multiple units transmit updates every 1–2 seconds, WebSockets eliminate connection setup latency and reduce server CPU overhead.

### Q: How does the system handle database connectivity if PostgreSQL is down?
**A:** In `backend/app/core/database.py`, we implemented an **automatic fallback mechanism**. The application first attempts to connect to PostgreSQL. If the PostgreSQL server is offline during local evaluation or demo, it automatically initializes an asynchronous SQLite database (`aiosqlite`) and creates all required tables. This guarantees zero demo downtime.

---

## 📐 3. Spatial Coordinate System & 3D Engineering

### Q: What coordinate convention does the 3D model use?
**A:** We adhere to the standard Three.js **Y-UP right-handed coordinate system**:
* **X-axis (Horizontal Width):** 0 to 30 meters (West to East).
* **Y-axis (Vertical Elevation):** Storey elevation in meters:
  - `BASEMENT`: -4.0m
  - `GROUND`: 0.0m
  - `FIRST`: +4.0m
  - `SECOND`: +8.0m
* **Z-axis (Horizontal Depth):** 0 to 20 meters (North to South).

### Q: How are incoming 2D coordinates converted into 3D world space?
**A:** Through `mapPositionTo3D(position, floor_id)`:
1. `floor_id` is normalized and mapped to its exact Y-elevation from building configuration.
2. `x` and `z` are clamped strictly within the building physical footprint ($30\text{m} \times 20\text{m}$).
3. A small vertical clearance offset (+0.5m) is added so markers float crisply above the floor slab without z-fighting.

### Q: How do the markers move smoothly between updates?
**A:** Rather than instantly jumping/teleporting when a coordinate arrives, `DeviceMarker.jsx` uses Three.js vector linear interpolation (`posVector.lerp(targetPos, factor)`) executed inside React Three Fiber's `useFrame` render loop (60 FPS). This results in smooth, realistic traversal.

---

## 🛡️ 4. Device Status & Freshness Logic

### Q: How does the system determine whether a unit is Online, Stale, or Offline?
**A:** Based on elapsed time since the last telemetry packet (`last_seen`):
* 🟢 **`ONLINE`:** Updated within the last 30 seconds (`elapsed <= 30s`).
* 🟡 **`STALE`:** Last update between 30 and 120 seconds (`30s < elapsed <= 120s`). Signals possible radio interference or pause.
* 🔴 **`OFFLINE`:** No update for over 120 seconds (`elapsed > 120s`). Signals lost contact or equipment disruption.

---

## 🔮 5. Real-World Hardware & Future Scope

### Q: What hardware would be used in an actual operational deployment?
**A:** In real-world operational CQB:
1. **Ultra-Wideband (UWB):** Deployed anchor nodes and wearable tags providing centimeter-level indoor trilateration.
2. **Inertial Measurement Units (IMU / Pedometry):** Accelerometers, gyroscopes, and barometric altimeters measuring vertical atmospheric pressure delta to detect exact floor climbs.
3. **Visual-Inertial SLAM:** Helmet-mounted optical/LiDAR sensors building spatial maps in real time.

---

## 📋 6. Key Acceptance Criteria Verified

| Criterion | Implementation | Status |
|---|---|---|
| Multi-storey 3D building | React Three Fiber `BuildingModel` & `BuildingFloor` | ✅ Fully Working |
| Camera rotation & zoom | OrbitControls with Perspective / Top / Iso presets | ✅ Fully Working |
| Storey level isolation | `FloorSelector` & dynamic storey opacity modulation | ✅ Fully Working |
| Synthetic data simulator | Python `SimulatedAgent` kinematic waypoints | ✅ Fully Working |
| Telemetry validation | Pydantic v2 schemas (`LocationCreate`) | ✅ Fully Working |
| Database persistence | SQLAlchemy 2.0 ORM (`Device`, `LocationRecord`) | ✅ Fully Working |
| Real-time transmission | FastAPI WebSockets + auto-reconnect client | ✅ Fully Working |
| 3D Marker positioning | Octahedral beacons, pulsing ground rings & lerp | ✅ Fully Working |
| Operational roster UI | Collapsible sidebar, search, room detection | ✅ Fully Working |
| Historical trajectory | `DeviceTrail` 3D polyline breadcrumbs | ✅ Fully Working |
