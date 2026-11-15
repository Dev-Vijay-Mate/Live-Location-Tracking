/**
 * REST API Client for NSG CQB Live Location Tracking
 * Adheres strictly to docs/API_CONTRACT.md
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Common fetch helper with timeout and error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(url, { ...config, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    console.warn(`[API] Request failed for ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Health check endpoint
 * @returns {Promise<{ status: string, timestamp: string }>}
 */
export async function fetchHealth() {
  return request('/health');
}

/**
 * Retrieve roster of all registered devices with their current status
 * @returns {Promise<{ devices: Array }>}
 */
export async function fetchDevices() {
  return request('/devices');
}

/**
 * Retrieve latest known locations for all active units
 * @returns {Promise<{ locations: Array }>}
 */
export async function fetchLatestLocations() {
  return request('/locations/latest');
}

/**
 * Ingest new location reading
 * @param {Object} locationData
 * @returns {Promise<{ status: string, device_id: string, timestamp: string }>}
 */
export async function postLocation(locationData) {
  return request('/locations', {
    method: 'POST',
    body: JSON.stringify(locationData)
  });
}

/**
 * Retrieve historical trajectory coordinates for a unit
 * @param {string} deviceId
 * @param {number} limit
 * @returns {Promise<{ device_id: string, history: Array }>}
 */
export async function fetchLocationHistory(deviceId, limit = 50) {
  return request(`/locations/history/${encodeURIComponent(deviceId)}?limit=${limit}`);
}
