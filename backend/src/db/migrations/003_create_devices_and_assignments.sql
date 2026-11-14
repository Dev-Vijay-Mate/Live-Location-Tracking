-- Migration 003: Devices and Device Assignments
-- Creates hardware tracking tags and temporal assignment history across buildings.

CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(50) PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    callsign VARCHAR(100),
    admin_status VARCHAR(20) NOT NULL DEFAULT 'STANDBY',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_device_admin_status CHECK (admin_status IN ('DEPLOYED', 'STANDBY', 'MAINTENANCE', 'DECOMMISSIONED'))
);

CREATE TABLE IF NOT EXISTS device_assignments (
    assignment_id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE RESTRICT,
    building_id VARCHAR(50) NOT NULL REFERENCES buildings(building_id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMPTZ,
    assigned_by VARCHAR(100) DEFAULT 'SYSTEM',
    notes TEXT,
    CONSTRAINT chk_assignment_timestamps CHECK (unassigned_at IS NULL OR unassigned_at >= assigned_at)
);

-- Ensure a device can have at most ONE active deployment (unassigned_at IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_device_active_assignment
    ON device_assignments (device_id)
    WHERE unassigned_at IS NULL;

-- Optimize temporal lookup: find assignment active at observation timestamp
CREATE INDEX IF NOT EXISTS idx_device_assignments_lookup
    ON device_assignments (device_id, building_id, assigned_at, unassigned_at);

