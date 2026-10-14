// Unit Service
// Connects to FERMS REST API backend

import { apiRequest } from './api.js';

/**
 * Get all fire units, with optional filters.
 */
export async function getUnits(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.stationId) params.append('stationId', filters.stationId);
  if (filters.type) params.append('type', filters.type);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/units${query}`);
}

/**
 * Get a single unit by ID.
 */
export async function getUnitById(id) {
  return apiRequest(`/units/${id}`);
}

/**
 * Get available units.
 */
export async function getAvailableUnits() {
  return apiRequest('/units/available');
}

/**
 * Dispatch a single unit to an incident.
 */
export async function dispatchUnit(unitId, incidentId, eta = '10 min') {
  await apiRequest(`/incidents/${incidentId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ unitIds: [unitId], eta }),
  });
  return getUnitById(unitId);
}

/**
 * Update a unit's status.
 */
export async function updateUnitStatus(unitId, status) {
  return apiRequest(`/units/${unitId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * Update a unit's GPS location.
 */
export async function updateUnitLocation(unitId, latitude, longitude, location = null) {
  return apiRequest(`/units/${unitId}/location`, {
    method: 'PATCH',
    body: JSON.stringify({ latitude, longitude, location }),
  });
}

/**
 * Get unit statistics for dashboard.
 */
export async function getUnitStats() {
  return apiRequest('/units/stats');
}
