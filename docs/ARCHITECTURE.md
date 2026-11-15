# System Architecture

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React.js + Vite | UI framework and build tool |
| 3D Visualization | Three.js + React Three Fiber + Drei | 3D building and marker rendering |
| Backend | Python + FastAPI | REST API and WebSocket server |
| Database | PostgreSQL | Location and device data storage |
| Real-Time | WebSockets | Live location updates |
| Simulator | Python | Synthetic location data generation |

## System Data Flow

```
Python Location Simulator
        |
        | HTTP POST /api/locations
        v
FastAPI Backend
        |
        | Validates data
        v
PostgreSQL Database
        |
        | Stores location record
        v
WebSocket Server (inside FastAPI)
        |
        | Broadcasts to connected clients
        v
React Frontend (WebSocket Client)
        |
        | Updates React state
        v
Three.js 3D Building Visualization
        |
        | Renders markers at coordinates
        v
Real-Time Monitoring Dashboard
```

## Project Structure

```
live-location-tracking/
│
├── frontend/                   # React + Vite application
│   ├── src/
│   │   ├── components/         # UI components (Dashboard, DevicePanel, etc.)
│   │   ├── three/              # 3D components (Building, Markers, etc.)
│   │   ├── services/           # API and WebSocket clients
│   │   ├── hooks/              # Custom React hooks
│   │   ├── config/             # Building config, constants
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/                    # Python FastAPI application
│   ├── app/
│   │   ├── api/                # Route handlers
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic validation schemas
│   │   ├── services/           # Business logic
│   │   ├── core/               # Config, database connection
│   │   └── main.py             # FastAPI app entry point
│   ├── requirements.txt
│   └── .env.example
│
├── simulator/                  # Python location simulator
│   ├── main.py                 # Simulator entry point
│   └── config.py               # Simulator settings
│
├── docs/                       # Project documentation
│   ├── PROJECT_CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   ├── TEAM_RESPONSIBILITIES.md
│   └── DEVELOPMENT_PLAN.md
│
├── README.md
├── .gitignore
└── .env.example
```

## Module Communication

### Simulator → Backend
- Protocol: HTTP POST
- Endpoint: `POST /api/locations`
- Format: JSON (see API_CONTRACT.md)

### Backend → Database
- ORM: SQLAlchemy (async)
- Driver: asyncpg
- Tables: `devices`, `locations`

### Backend → Frontend (Real-Time)
- Protocol: WebSocket
- Endpoint: `ws://localhost:8000/ws/locations`
- Format: JSON broadcast on new location

### Frontend → Backend (REST)
- `GET /api/devices` — list all devices
- `GET /api/locations/latest` — latest position per device
- `GET /api/locations/history/{device_id}` — location history

### Frontend → 3D View
- React props and state
- Location data mapped through `coordinateMapping.js`
- Floor elevation from `buildingConfig.js`

## Coordinate System

- **X axis**: Horizontal (left-right)
- **Z axis**: Horizontal depth (front-back)
- **Y axis**: Vertical (floor elevation) — determined by floor_id
- Floor elevation is NOT sent in location data; it is resolved from `floor_id` using the building configuration

### Floor Elevation Map

| Floor ID | Label | Y (metres) |
|----------|-------|------------|
| BASEMENT | Basement | -3.5 |
| GROUND | Ground Floor | 0.0 |
| FIRST | First Floor | 3.5 |
| SECOND | Second Floor | 7.0 |
