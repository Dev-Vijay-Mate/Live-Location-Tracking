-- Migration 004: Location History and Current Locations
-- Stores append-only audit trail and dedicated current positions.

CREATE TABLE IF NOT EXISTS location_history (
    location_id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE RESTRICT,
    building_id VARCHAR(50) NOT NULL,
    floor_id VARCHAR(50) NOT NULL,
    x_coordinate NUMERIC(8, 2) NOT NULL,
    z_coordinate NUMERIC(8, 2) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'SIMULATION',
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_location_history_building_floor
        FOREIGN KEY (building_id, floor_id)
        REFERENCES floors(building_id, floor_id)
        ON DELETE RESTRICT
);

-- Indexes for location_history
CREATE INDEX IF NOT EXISTS idx_location_history_device_timestamp
    ON location_history (device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_history_floor_timestamp
    ON location_history (floor_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_location_history_timestamp
    ON location_history (timestamp DESC);

CREATE TABLE IF NOT EXISTS current_locations (
    device_id VARCHAR(50) PRIMARY KEY REFERENCES devices(device_id) ON DELETE RESTRICT,
    building_id VARCHAR(50) NOT NULL,
    floor_id VARCHAR(50) NOT NULL,
    x_coordinate NUMERIC(8, 2) NOT NULL,
    z_coordinate NUMERIC(8, 2) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'SIMULATION',
    timestamp TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_current_locations_building_floor
        FOREIGN KEY (building_id, floor_id)
        REFERENCES floors(building_id, floor_id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_current_locations_floor
    ON current_locations (floor_id);

CREATE INDEX IF NOT EXISTS idx_current_locations_building
    ON current_locations (building_id);

