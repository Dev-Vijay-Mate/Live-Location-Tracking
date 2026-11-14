-- Migration 005: Spatial Boundary and Immutability Triggers
-- Enforces concurrency-safe coordinate checks, floor alteration guards, and historical immutability.

-- 1. Coordinate Boundary & Timestamp Validation Trigger Function
CREATE OR REPLACE FUNCTION validate_location_record()
RETURNS TRIGGER AS $$
DECLARE
    f_min_x NUMERIC;
    f_max_x NUMERIC;
    f_min_z NUMERIC;
    f_max_z NUMERIC;
    f_is_active BOOLEAN;
BEGIN
    -- Timestamp checks: Prevent future-dated records (beyond 1m clock skew) or excessively stale records (>30 days)
    IF NEW.timestamp > (CURRENT_TIMESTAMP + INTERVAL '1 minute') THEN
        RAISE EXCEPTION 'Observation timestamp % is in the future beyond allowable 1-minute drift', NEW.timestamp
            USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.timestamp < (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN
        RAISE EXCEPTION 'Observation timestamp % is older than allowable 30-day window', NEW.timestamp
            USING ERRCODE = 'check_violation';
    END IF;

    -- Concurrency-Safe Floor Check using FOR SHARE
    -- Locks the floor row in shared mode, preventing concurrent boundary alterations/deletions
    SELECT min_x, max_x, min_z, max_z, is_active
    INTO f_min_x, f_max_x, f_min_z, f_max_z, f_is_active
    FROM floors
    WHERE building_id = NEW.building_id AND floor_id = NEW.floor_id
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Floor % in building % does not exist', NEW.floor_id, NEW.building_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NOT f_is_active THEN
        RAISE EXCEPTION 'Cannot record location on inactive floor %', NEW.floor_id
            USING ERRCODE = 'check_violation';
    END IF;

    -- Spatial boundary validation: Coordinate must lie inside floor perimeter
    IF NEW.x_coordinate < f_min_x OR NEW.x_coordinate > f_max_x OR
       NEW.z_coordinate < f_min_z OR NEW.z_coordinate > f_max_z THEN
        RAISE EXCEPTION 'Coordinates (%, %) are out of bounds for floor % [X: % to %, Z: % to %]',
            NEW.x_coordinate, NEW.z_coordinate, NEW.floor_id, f_min_x, f_max_x, f_min_z, f_max_z
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach boundary validation trigger to location_history
DROP TRIGGER IF EXISTS trg_validate_location_history ON location_history;
CREATE TRIGGER trg_validate_location_history
    BEFORE INSERT OR UPDATE ON location_history
    FOR EACH ROW EXECUTE FUNCTION validate_location_record();

-- Attach boundary validation trigger to current_locations
DROP TRIGGER IF EXISTS trg_validate_current_locations ON current_locations;
CREATE TRIGGER trg_validate_current_locations
    BEFORE INSERT OR UPDATE ON current_locations
    FOR EACH ROW EXECUTE FUNCTION validate_location_record();

-- 2. Immutability Trigger on location_history
-- Blocks any UPDATE or DELETE statement on historical records
CREATE OR REPLACE FUNCTION prevent_location_history_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Historical location records are immutable and cannot be updated or deleted'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_location_history ON location_history;
CREATE TRIGGER trg_immutable_location_history
    BEFORE UPDATE OR DELETE ON location_history
    FOR EACH ROW EXECUTE FUNCTION prevent_location_history_tampering();

-- 3. Floor Boundary Modification Guard Trigger Function
-- Prevents shrinking floor boundaries or deactivating a floor if active current locations would become invalid
CREATE OR REPLACE FUNCTION guard_floor_boundary_alteration()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if deactivating a floor that currently has active device markers
    IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
        IF EXISTS (
            SELECT 1 FROM current_locations
            WHERE building_id = NEW.building_id AND floor_id = NEW.floor_id
        ) THEN
            RAISE EXCEPTION 'Cannot deactivate floor %: active device markers currently exist on it', NEW.floor_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    -- Check if shrinking boundaries would leave existing current locations out of bounds
    IF NEW.min_x > OLD.min_x OR NEW.max_x < OLD.max_x OR
       NEW.min_z > OLD.min_z OR NEW.max_z < OLD.max_z THEN
        IF EXISTS (
            SELECT 1 FROM current_locations
            WHERE building_id = NEW.building_id
              AND floor_id = NEW.floor_id
              AND (x_coordinate < NEW.min_x OR x_coordinate > NEW.max_x
                OR z_coordinate < NEW.min_z OR z_coordinate > NEW.max_z)
        ) THEN
            RAISE EXCEPTION 'Cannot shrink floor % boundaries: existing active device positions would become out-of-bounds', NEW.floor_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_floor_alteration ON floors;
CREATE TRIGGER trg_guard_floor_alteration
    BEFORE UPDATE ON floors
    FOR EACH ROW EXECUTE FUNCTION guard_floor_boundary_alteration();

