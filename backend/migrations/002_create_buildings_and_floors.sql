-- Migration 002: Buildings and Floors
-- Creates physical operational installations and multi-storey floor layouts.

CREATE TABLE IF NOT EXISTS buildings (
    building_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS floors (
    floor_id VARCHAR(50) PRIMARY KEY,
    building_id VARCHAR(50) NOT NULL REFERENCES buildings(building_id) ON DELETE RESTRICT,
    floor_name VARCHAR(100) NOT NULL,
    floor_number INTEGER NOT NULL,
    elevation NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    min_x NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    max_x NUMERIC(8, 2) NOT NULL DEFAULT 100.00,
    min_z NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    max_z NUMERIC(8, 2) NOT NULL DEFAULT 100.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_floor_building_id UNIQUE (building_id, floor_id),
    CONSTRAINT uq_floor_building_number UNIQUE (building_id, floor_number),
    CONSTRAINT chk_floor_x_bounds CHECK (min_x < max_x),
    CONSTRAINT chk_floor_z_bounds CHECK (min_z < max_z)
);

CREATE INDEX IF NOT EXISTS idx_floors_building ON floors (building_id);

