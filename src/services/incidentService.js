// Incident Service
// Connects to FERMS REST API backend

import { apiRequest } from './api.js';

/**
 * Get all incidents, with optional filters.
 */
export async function getIncidents(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.severity) params.append('severity', filters.severity);
  if (filters.type) params.append('type', filters.type);
  if (filters.search) params.append('search', filters.search);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.myReports) params.append('myReports', 'true');

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/incidents${query}`);
}

/**
 * Get single incident by ID.
 */
export async function getIncidentById(id) {
  return apiRequest(`/incidents/${id}`);
}

/**
 * Create a new incident.
 */
export async function createIncident(data) {
  return apiRequest('/incidents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update incident details.
 */
export async function updateIncident(id, data) {
  return apiRequest(`/incidents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Update incident status along the workflow.
 * Valid transitions: Reported → Verified → Dispatched → En Route → On-Site → Contained → Resolved → Archived
 */
export async function updateIncidentStatus(id, status, note = '') {
  return apiRequest(`/incidents/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

/**
 * Verify an incident (dispatcher triage).
 */
export async function verifyIncident(id) {
  return apiRequest(`/incidents/${id}/verify`, {
    method: 'POST',
  });
}

/**
 * Assign units to an incident and trigger dispatch.
 */
export async function assignUnitsToIncident(incidentId, unitIds, eta = '8 min') {
  return apiRequest(`/incidents/${incidentId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ unitIds, eta }),
  });
}

/**
 * Get dashboard KPI statistics.
 */
export async function getIncidentStats() {
  return apiRequest('/incidents/stats');
}
