
# Live Location Tracking System

A real-time 3D location tracking system designed to visualize the positions of personnel operating inside complex, multi-storey buildings, including floors and underground basements.

## 📌 Problem Statement

**Organization:** National Security Guard (NSG), Ministry of Home Affairs  
**Year:** 2024  
**Domain:** Miscellaneous  
**Category:** Software  

The National Security Guard (NSG) operates in Close Quarters Battle (CQB) environments, where teams operate inside complex structures such as hotels, hospitals, metro stations, and buildings of national importance.

In these environments, knowing the precise location of personnel, including their floor or basement level, is essential for effective command and control.

Traditional GPS/GSM-based tracking systems primarily provide two-dimensional location information and often fail to determine the exact floor level inside buildings.

This project aims to address this limitation by developing a system capable of tracking personnel in real time and visualizing their positions on existing 3D building models.

## 🎯 Project Objectives

- Enable real-time location tracking of personnel and House Intervention Teams (HITs).
- Identify the floor or basement level at which personnel are operating.
- Provide a 3D visualization of personnel positions inside buildings.
- Integrate tracking information with existing 3D building models.
- Provide a centralized dashboard for monitoring and situational awareness.
- Improve location visibility and command-and-control capabilities.

## ⚙️ Proposed System

The proposed system focuses on combining indoor positioning technologies, location data processing, and 3D visualization.

### 1. Indoor Location Tracking
Explore suitable indoor positioning approaches to estimate personnel locations where conventional GPS signals are unreliable.

### 2. Floor-Level Detection
Determine the vertical position of personnel to distinguish between different floors and basement levels.

### 3. Real-Time Data Processing
Process incoming location updates and make the latest position information available to the visualization system.

### 4. 3D Building Visualization
Display personnel positions within pre-existing 3D building models, providing a spatial representation of their locations.

### 5. Monitoring Dashboard
Develop a centralized interface for viewing personnel positions and tracking information.

## 🏗️ High-Level Architecture

```text
       Indoor Tracking Devices
                 |
                 v
       Location Data Collection
                 |
                 v
        Position Estimation
                 |
          +------+------+
          |             |
          v             v
    Floor Detection   Coordinate
                      Processing
          |             |
          +------+------+
                 |
                 v
         Real-Time Backend
                 |
                 v
          Data Transmission
                 |
                 v
       3D Building Visualization
                 |
                 v
        Central Monitoring UI
```

## 🛠️ Technology Stack

The final technology stack will be selected during the research and system-design phase.

Potential technology areas include:

- **Frontend:** React.js / Three.js
- **Backend:** Node.js / Python
- **Database:** PostgreSQL
- **Real-Time Communication:** WebSockets
- **3D Visualization:** Three.js
- **Indoor Positioning:** Research into suitable sensor-based positioning technologies
- **Data Processing:** Python

## 📋 Key Challenges

- Accurate indoor positioning in GPS-denied environments.
- Reliable floor and basement identification.
- Minimizing location estimation errors.
- Handling real-time location updates.
- Integrating tracking coordinates with existing 3D building models.
- Maintaining reliable system performance.

## 🚧 Project Status

**Status:** Planning and Research

The project is currently in the problem analysis and system-design phase.

Planned development milestones:

- [ ] Requirement analysis
- [ ] Research on indoor positioning technologies
- [ ] System architecture design
- [ ] Database and backend development
- [ ] Real-time location processing
- [ ] 3D building model integration
- [ ] Monitoring dashboard development
- [ ] Testing and performance evaluation
- [ ] Final documentation

## 🎯 Expected Outcome

A functional prototype capable of displaying simulated or test-environment personnel locations in real time on a multi-storey 3D building model, including floor-level identification.

The system will demonstrate how indoor positioning and 3D visualization can improve spatial awareness in complex indoor environments.

## ⚠️ Disclaimer

This project is an academic software-development initiative based on the NSG problem statement. It is intended for research, educational purposes, and controlled testing environments.

It does not represent an officially deployed NSG system.

## 👨‍💻 Contributors

**Project Team:** To be updated.

---

**Project Name:** Live Location Tracking System  
**Problem Statement Source:** National Security Guard (NSG), Ministry of Home Affairs (2024)
