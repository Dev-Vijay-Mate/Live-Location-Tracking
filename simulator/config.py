"""
Simulator Configuration
Defines tactical units, CQB patrol paths, waypoints, and simulation parameters.
"""
import os

# Backend API endpoint to send telemetry updates to
API_ENDPOINT = os.getenv("SIMULATOR_API_URL", "http://localhost:8000/api/locations")

# Default telemetry broadcast interval in seconds
UPDATE_INTERVAL_SECONDS = float(os.getenv("SIMULATOR_INTERVAL", "1.5"))

# Building Identifier
BUILDING_ID = "DEMO_BUILDING_001"

# Simulated CQB House Intervention Team (HIT) Units and Patrol Waypoints
# Each waypoint is defined as (x, z, floor_id) within building boundaries:
# X: [-14.0, 14.0], Z: [-9.0, 9.0]
SIMULATED_UNITS = [
    {
        "device_id": "DEMO_DEVICE_001",
        "name": "HIT Alpha-1 (Lead)",
        "team": "HIT Alpha",
        "speed": 1.2,  # meters per second
        "waypoints": [
            {"x": -10.0, "z": -6.0, "floor_id": "GROUND"},  # West Wing A
            {"x": -6.0, "z": -4.0, "floor_id": "GROUND"},
            {"x": 0.0, "z": -2.0, "floor_id": "GROUND"},   # Central Corridor
            {"x": 0.0, "z": 4.0, "floor_id": "GROUND"},    # North Corridor
            {"x": 8.0, "z": 5.0, "floor_id": "GROUND"},    # East Wing B
            {"x": 10.0, "z": 2.0, "floor_id": "GROUND"},
            {"x": 4.0, "z": -2.0, "floor_id": "GROUND"},
            {"x": -4.0, "z": -2.0, "floor_id": "GROUND"}
        ]
    },
    {
        "device_id": "DEMO_DEVICE_002",
        "name": "HIT Alpha-2 (Breacher)",
        "team": "HIT Alpha",
        "speed": 1.1,
        "waypoints": [
            {"x": -11.0, "z": -5.0, "floor_id": "GROUND"},
            {"x": -7.0, "z": -3.0, "floor_id": "GROUND"},
            {"x": -1.0, "z": -1.0, "floor_id": "GROUND"},
            {"x": -1.0, "z": 3.0, "floor_id": "GROUND"},
            {"x": 6.5, "z": 4.0, "floor_id": "GROUND"},
            {"x": 8.5, "z": 1.0, "floor_id": "GROUND"},
            {"x": 3.0, "z": -3.0, "floor_id": "GROUND"},
            {"x": -5.0, "z": -3.0, "floor_id": "GROUND"}
        ]
    },
    {
        "device_id": "DEMO_DEVICE_003",
        "name": "HIT Bravo-1 (Overwatch)",
        "team": "HIT Bravo",
        "speed": 0.6,  # Slower deliberate movement
        "waypoints": [
            {"x": 10.0, "z": 7.0, "floor_id": "SECOND"},   # East Balcony
            {"x": 8.0, "z": 7.5, "floor_id": "SECOND"},
            {"x": 6.0, "z": 6.0, "floor_id": "SECOND"},
            {"x": 9.0, "z": 5.0, "floor_id": "SECOND"},
            {"x": 11.5, "z": 6.5, "floor_id": "SECOND"}
        ]
    },
    {
        "device_id": "DEMO_DEVICE_004",
        "name": "HIT Charlie-1 (Basement Ingress)",
        "team": "HIT Charlie",
        "speed": 1.0,
        "waypoints": [
            {"x": 0.0, "z": 6.0, "floor_id": "BASEMENT"},   # Entry ramp
            {"x": -5.0, "z": 4.0, "floor_id": "BASEMENT"},  # Utility room
            {"x": -10.0, "z": 2.0, "floor_id": "BASEMENT"}, # Server room
            {"x": -8.0, "z": -4.0, "floor_id": "BASEMENT"}, # Generator
            {"x": -2.0, "z": -3.0, "floor_id": "BASEMENT"},
            {"x": 2.0, "z": 0.0, "floor_id": "BASEMENT"}
        ]
    },
    {
        "device_id": "DEMO_DEVICE_005",
        "name": "HIT Delta-1 (Support)",
        "team": "HIT Delta",
        "speed": 0.9,
        "waypoints": [
            {"x": 6.0, "z": -4.0, "floor_id": "FIRST"},    # Briefing Room
            {"x": 10.0, "z": -6.0, "floor_id": "FIRST"},   # Exec Office
            {"x": 8.0, "z": -1.0, "floor_id": "FIRST"},
            {"x": 1.0, "z": 0.0, "floor_id": "FIRST"},     # Mid Landing
            {"x": -4.0, "z": 2.0, "floor_id": "FIRST"},    # West Corridor
            {"x": -8.0, "z": 5.0, "floor_id": "FIRST"},
            {"x": -4.0, "z": 0.0, "floor_id": "FIRST"}
        ]
    }
]
