-- Seed Data for NSG Tactical Live Location Tracking System
-- Provides baseline operational building, floors, devices, and active assignments.

-- 1. Tactical Buildings
INSERT INTO buildings (building_id, name, description, is_active)
VALUES (
    'BUILDING_001',
    'NSG Tactical Training Complex',
    'Multi-storey CQB urban operational facility featuring basement bunker and multi-level assault corridors.',
    TRUE
)
ON CONFLICT (building_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 2. Multi-Storey Floors (with 3D elevations and coordinate perimeters)
INSERT INTO floors (floor_id, building_id, floor_name, floor_number, elevation, min_x, max_x, min_z, max_z, is_active)
VALUES
    ('FLOOR_B1', 'BUILDING_001', 'Basement Level 1 - Bunker', -1, -4.00, 0.00, 50.00, 0.00, 50.00, TRUE),
    ('FLOOR_00', 'BUILDING_001', 'Ground Floor - Main Lobby & Staging', 0, 0.00, 0.00, 60.00, 0.00, 60.00, TRUE),
    ('FLOOR_01', 'BUILDING_001', 'First Floor - Tactical Operations Hub', 1, 4.00, 0.00, 60.00, 0.00, 60.00, TRUE),
    ('FLOOR_02', 'BUILDING_001', 'Second Floor - Command & Observation', 2, 8.00, 0.00, 50.00, 0.00, 50.00, TRUE)
ON CONFLICT (building_id, floor_id) DO UPDATE SET
    floor_name = EXCLUDED.floor_name,
    floor_number = EXCLUDED.floor_number,
    elevation = EXCLUDED.elevation,
    min_x = EXCLUDED.min_x,
    max_x = EXCLUDED.max_x,
    min_z = EXCLUDED.min_z,
    max_z = EXCLUDED.max_z,
    is_active = EXCLUDED.is_active;

-- 3. Tactical Tracking Devices
INSERT INTO devices (device_id, device_name, callsign, admin_status, is_active)
VALUES
    ('DEVICE_001', 'Tactical Tag 01', 'HIT Team Alpha - Lead', 'DEPLOYED', TRUE),
    ('DEVICE_002', 'Tactical Tag 02', 'HIT Team Alpha - Scout', 'DEPLOYED', TRUE),
    ('DEVICE_003', 'Tactical Tag 03', 'HIT Team Bravo - Support', 'DEPLOYED', TRUE),
    ('DEVICE_004', 'Tactical Tag 04', 'HIT Team Bravo - Medic', 'DEPLOYED', TRUE)
ON CONFLICT (device_id) DO UPDATE SET
    device_name = EXCLUDED.device_name,
    callsign = EXCLUDED.callsign,
    admin_status = EXCLUDED.admin_status,
    is_active = EXCLUDED.is_active;

-- 4. Active Device Assignments (link devices to BUILDING_001)
INSERT INTO device_assignments (device_id, building_id, assigned_at, unassigned_at, assigned_by, notes)
SELECT
    d.device_id,
    'BUILDING_001',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    NULL,
    'NSG Commander',
    'Initial deployment for Operation Urban Shield'
FROM devices d
WHERE NOT EXISTS (
    SELECT 1 FROM device_assignments a
    WHERE a.device_id = d.device_id AND a.unassigned_at IS NULL
);

