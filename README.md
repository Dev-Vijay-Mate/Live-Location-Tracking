
# Live Location Tracking System

A real-time 3D indoor location tracking system designed to visualize the positions of personnel operating inside complex, multi-storey buildings, including floors and underground basements.

## 📌 Problem Statement

**Organization:** National Security Guard (NSG), Ministry of Home Affairs  
**Year:** 2024  
**Domain:** Miscellaneous  
**Category:** Software  

The National Security Guard (NSG) operates in Close Quarters Battle (CQB) environments, where teams operate inside complex structures such as hotels, hospitals, metro stations, and buildings of national importance.

In these environments, knowing the precise location of personnel, including their floor or basement level, is essential for effective command and control.

Traditional GPS/GSM-based tracking systems primarily provide two-dimensional location information and often fail to determine the exact floor level inside buildings.

This project aims to address this limitation by developing a system capable of tracking personnel in real time and visualizing their positions on 3D building models.

## 🎯 Project Objectives

- Enable real-time location tracking of personnel and House Intervention Teams (HITs).
- Identify the floor or basement level at which personnel are operating.
- Provide a 3D visualization of personnel positions inside buildings.
- Integrate tracking information with 3D building models.
- Provide a centralized dashboard for monitoring and situational awareness.

## ⚙️ System Overview

This academic software prototype demonstrates indoor floor-level location visualization using simulated device data. The system displays simulated personnel positions in a multi-storey 3D building and updates positions in real time.

### Data Flow

```
Python Location Simulator
        │
        ▼
FastAPI Backend (REST API)
        │
        ▼
PostgreSQL Database
        │
        ▼
WebSocket Broadcast
        │
        ▼
React Frontend + Three.js 3D Visualization
        │
        ▼
Real-Time Monitoring Dashboard
```

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js, Vite, JavaScript |
| **3D Visualization** | Three.js, React Three Fiber, Drei |
| **Backend** | Python, FastAPI |
| **Database** | PostgreSQL |
| **Real-Time** | WebSockets |
| **Simulator** | Python |

## 📁 Project Structure

```
live-location-tracking/
├── frontend/          # React + Vite application
│   └── src/
│       ├── components/    # UI components
│       ├── three/         # 3D building and markers
│       ├── services/      # API and WebSocket clients
│       ├── hooks/         # Custom React hooks
│       └── config/        # Building configuration
├── backend/           # Python FastAPI application
│   └── app/
│       ├── api/           # Route handlers
│       ├── models/        # Database models
│       ├── schemas/       # Validation schemas
│       ├── services/      # Business logic
│       └── core/          # Config and database
├── simulator/         # Python location simulator
├── docs/              # Project documentation
└── README.md
```

## 🚀 Quick Start

> Setup instructions will be added as development progresses.

### Prerequisites

- Node.js (v18+)
- Python (3.10+)
- PostgreSQL (14+)

## 📋 Features

- [x] Project architecture and documentation
- [ ] Interactive 3D multi-storey building
- [ ] Device/personnel position markers
- [ ] Real-time location updates via WebSocket
- [ ] Device status monitoring (online/offline/stale)
- [ ] Floor selection and filtering
- [ ] Location history
- [ ] Simulation controls
- [ ] Professional monitoring dashboard

## 📖 Documentation

Detailed documentation is available in the [`docs/`](docs/) directory:

- [Project Context](docs/PROJECT_CONTEXT.md) — Problem statement and objectives
- [Architecture](docs/ARCHITECTURE.md) — System design and data flow
- [API Contract](docs/API_CONTRACT.md) — Endpoints and data formats
- [Team Responsibilities](docs/TEAM_RESPONSIBILITIES.md) — Member roles and deliverables
- [Development Plan](docs/DEVELOPMENT_PLAN.md) — 14-day roadmap

## 🚧 Project Status

**Status:** Day 1–2 — Foundation & Setup

## ⚠️ Disclaimer

This project is an academic software-development initiative based on the NSG problem statement. It is intended for research, educational purposes, and controlled testing environments.

It does not represent an officially deployed NSG system. Simulated tracking does not demonstrate real-world indoor positioning accuracy.

## 👨‍💻 Contributors

**Project Team:** To be updated.

---

**Project Name:** Live Location Tracking System  
**Problem Statement Source:** National Security Guard (NSG), Ministry of Home Affairs (2024)
