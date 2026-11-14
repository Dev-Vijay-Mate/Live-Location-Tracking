/**
 * Device Status and Health Monitoring Service
 * Aggregates fleet connectivity metrics and building-level health breakdowns.
 */

const { query } = require('../db');
const { calculateConnectivityStatus } = require('./deviceService');

/**
 * Returns overall fleet operational health and connectivity summary
 */
async function getFleetHealthSummary() {
  const sql = `
    SELECT d.device_id,
           d.device_name,
           d.callsign,
           d.admin_status,
           d.is_active,
           d.last_seen_at,
           a.building_id,
           b.name AS building_name
    FROM devices d
    LEFT JOIN device_assignments a ON d.device_id = a.device_id AND a.unassigned_at IS NULL
    LEFT JOIN buildings b ON a.building_id = b.building_id
    WHERE d.is_active = TRUE;
  `;
  const result = await query(sql);

  const summary = {
    total_active_devices: result.rows.length,
    counts: {
      ONLINE: 0,
      STALE: 0,
      OFFLINE: 0,
      MAINTENANCE: 0,
      DECOMMISSIONED: 0,
      UNKNOWN: 0,
    },
    by_building: {},
    devices: [],
  };

  for (const row of result.rows) {
    const connStatus = calculateConnectivityStatus(row.last_seen_at, row.admin_status);
    summary.counts[connStatus] = (summary.counts[connStatus] || 0) + 1;

    const buildingKey = row.building_id || 'UNASSIGNED';
    if (!summary.by_building[buildingKey]) {
      summary.by_building[buildingKey] = {
        building_id: row.building_id,
        building_name: row.building_name || 'Unassigned / In Transit',
        total: 0,
        ONLINE: 0,
        STALE: 0,
        OFFLINE: 0,
      };
    }
    summary.by_building[buildingKey].total += 1;
    if (['ONLINE', 'STALE', 'OFFLINE'].includes(connStatus)) {
      summary.by_building[buildingKey][connStatus] += 1;
    }

    summary.devices.push({
      device_id: row.device_id,
      callsign: row.callsign,
      admin_status: row.admin_status,
      connectivity_status: connStatus,
      last_seen_at: row.last_seen_at,
      building_id: row.building_id,
      building_name: row.building_name,
    });
  }

  return summary;
}

module.exports = {
  getFleetHealthSummary,
};

