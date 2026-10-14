// Station Service
// Connects to FERMS REST API backend

import { apiRequest } from './api.js';

/**
 * Get all fire stations.
 */
export async function getStations() {
  return apiRequest('/stations');
}

/**
 * Get a single station by ID.
 */
export async function getStationById(id) {
  return apiRequest(`/stations/${id}`);
}
