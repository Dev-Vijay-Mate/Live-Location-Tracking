-- Migration 001: Schema Migrations Tracking Table
-- Records all successfully executed migrations to ensure idempotency.

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER NOT NULL
);

