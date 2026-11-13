# Backend System - 3D Live Location Tracking

This directory contains the real-time backend service for the 3D Live Location Tracking System, built as part of the National Security Guard (NSG) problem statement initiative (Ministry of Home Affairs, 2024).

## 🏢 Role in Project (Member 2: Backend Development)
The backend service is responsible for:
- Managing devices, buildings, and floor configurations.
- Ingesting and strictly validating 2D horizontal coordinates `(x, z)` against building and floor boundaries.
- Storing historical tracking records in PostgreSQL using raw SQL queries and connection pooling.
- Broadcasting validated position updates to connected frontend clients via WebSockets (`ws`).
- Simulating synthetic personnel movement across multiple storeys/basements.

---

## 📂 Directory Structure

```text
backend/
├── .env.example            # Template for environment configuration
├── package.json            # Node.js dependencies and scripts
├── README.md               # Backend module documentation (this file)
├── simulator/              # JavaScript-based synthetic location simulator
│   └── simulator.js        # Synthetic movement generator
├── src/
│   ├── app.js              # Express app setup and middleware pipeline
│   ├── server.js           # HTTP + WebSocket server entry point
│   ├── config/             # Environment and application constants
│   ├── controllers/        # Request handling and HTTP responses
│   ├── db/                 # PostgreSQL pool, migrations, and raw SQL queries
│   ├── middleware/         # Validation, error handling, CORS
│   ├── routes/             # REST API endpoint definitions
│   ├── services/           # Business logic (location processing, status calculation)
│   └── websocket/          # WebSocket connection lifecycle and broadcasting
├── tests/                  # Automated integration and unit tests (node:test)
└── docs/                   # API contracts and WebSocket specifications for Member 1 & 3
```

---

## 🛠️ Technology Stack
- **Runtime**: Node.js (CommonJS)
- **Framework**: Express.js
- **Database**: PostgreSQL with `pg` (node-postgres) connection pool
- **Real-Time Communication**: `ws` (WebSockets)
- **Validation**: Native JavaScript validation routines (bounds checking & referential integrity)
- **Testing**: Built-in `node:test` runner

---

## 🚀 Setup & Execution

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+) running locally or accessible via network

### 2. Environment Setup
Copy the example environment file and configure credentials:
```bash
cp .env.example .env
```

### 3. Dependencies
Install the required packages:
```bash
npm install
```

### 4. Running the Service
```bash
# Start in production mode
npm start

# Start in development mode (with auto-reload)
npm run dev

# Run automated tests
npm test

# Run synthetic movement simulator
npm run simulate
```

