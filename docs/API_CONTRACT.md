# API Contract

This document defines the data formats, API endpoints and WebSocket protocol used across all modules.

All team members must follow this contract to ensure compatibility.

---

## Location Data Format

Every location update uses the following JSON structure:

```json
{
  "device_id": "DEMO_DEVICE_001",
  "building_id": "DEMO_BUILDING_001",
  "floor_id": "GROUND",
  "position": {
    "x": 12.5,
    "z": 8.2
  },
  "source": "SIMULATION",
  "timestamp": "2026-11-14T10:30:00Z"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `device_id` | string | Yes | Unique device/personnel identifier |
| `building_id` | string | Yes | Building identifier |
| `floor_id` | string | Yes | Floor identifier: `BASEMENT`, `GROUND`, `FIRST`, `SECOND` |
| `position.x` | float | Yes | X-axis coordinate (horizontal) |
| `position.z` | float | Yes | Z-axis coordinate (depth) |
| `source` | string | Yes | Data source: `SIMULATION` or `DEVICE` |
| `timestamp` | string (ISO 8601) | Yes | UTC timestamp of the reading |

### Valid Floor IDs

| Floor ID | Label |
|----------|-------|
| `BASEMENT` | Basement Level |
| `GROUND` | Ground Floor |
| `FIRST` | First Floor |
| `SECOND` | Second Floor |

---

## REST API Endpoints

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-14T10:30:00Z"
}
```

---

### List Devices

```
GET /api/devices
```

**Response:**
```json
{
  "devices": [
    {
      "device_id": "DEMO_DEVICE_001",
      "name": "Alpha-1",
      "status": "online",
      "last_seen": "2026-11-14T10:30:00Z",
      "floor_id": "GROUND"
    }
  ]
}
```

**Device Status Values:**
- `online` — updated within last 30 seconds
- `stale` — updated within last 2 minutes but not within 30 seconds
- `offline` — no update for more than 2 minutes

---

### Get Latest Locations

```
GET /api/locations/latest
```

**Response:**
```json
{
  "locations": [
    {
      "device_id": "DEMO_DEVICE_001",
      "building_id": "DEMO_BUILDING_001",
      "floor_id": "GROUND",
      "position": { "x": 12.5, "z": 8.2 },
      "timestamp": "2026-11-14T10:30:00Z"
    }
  ]
}
```

---

### Submit Location Update

```
POST /api/locations
```

**Request Body:** Location data JSON (see format above)

**Response:**
```json
{
  "status": "accepted",
  "device_id": "DEMO_DEVICE_001",
  "timestamp": "2026-11-14T10:30:00Z"
}
```

**Validation Rules:**
- All required fields must be present
- `floor_id` must be one of the valid floor IDs
- `position.x` and `position.z` must be valid numbers
- `timestamp` must be valid ISO 8601 format

---

### Get Location History

```
GET /api/locations/history/{device_id}?limit=50
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 50 | Maximum records to return |

**Response:**
```json
{
  "device_id": "DEMO_DEVICE_001",
  "history": [
    {
      "floor_id": "GROUND",
      "position": { "x": 12.5, "z": 8.2 },
      "timestamp": "2026-11-14T10:30:00Z"
    }
  ]
}
```

---

## WebSocket Protocol

### Connection

```
ws://localhost:8000/ws/locations
```

### Server → Client Messages

When a new location update is received by the backend, it broadcasts to all connected WebSocket clients:

```json
{
  "type": "location_update",
  "data": {
    "device_id": "DEMO_DEVICE_001",
    "building_id": "DEMO_BUILDING_001",
    "floor_id": "GROUND",
    "position": { "x": 12.5, "z": 8.2 },
    "timestamp": "2026-11-14T10:30:00Z"
  }
}
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `location_update` | Server → Client | New device position |
| `device_status` | Server → Client | Device online/offline change |
| `connection_ack` | Server → Client | Sent on successful connection |

### Connection Acknowledgement

On successful WebSocket connection, the server sends:

```json
{
  "type": "connection_ack",
  "message": "Connected to location tracking server",
  "timestamp": "2026-11-14T10:30:00Z"
}
```

---

## Error Responses

All API errors follow this format:

```json
{
  "error": true,
  "message": "Description of what went wrong",
  "code": "VALIDATION_ERROR"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid request data |
| `NOT_FOUND` | 404 | Resource not found |
| `SERVER_ERROR` | 500 | Internal server error |
