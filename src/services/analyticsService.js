// Analytics Service
// Connects to FERMS REST API backend

import { apiRequest } from './api.js';

/**
 * Get overall analytics summary.
 */
export async function getAnalyticsSummary(range = '7d') {
  return apiRequest(`/analytics/summary?range=${range}`);
}

/**
 * Get incidents per day trend.
 */
export async function getIncidentsPerDay(range = '7d') {
  return apiRequest(`/analytics/incidents-per-day?range=${range}`);
}

/**
 * Get incidents grouped by severity.
 */
export async function getIncidentsBySeverity(range = '7d') {
  return apiRequest(`/analytics/by-severity?range=${range}`);
}

/**
 * Get incidents grouped by region.
 */
export async function getIncidentsByRegion(range = '7d') {
  return apiRequest(`/analytics/by-region?range=${range}`);
}

/**
 * Get average response time by region.
 */
export async function getResponseTimeByRegion(range = '7d') {
  return apiRequest(`/analytics/response-time?range=${range}`);
}

/**
 * Get unit utilization percentages.
 */
export async function getUnitUtilization(range = '7d') {
  return apiRequest(`/analytics/unit-utilization?range=${range}`);
}

/**
 * Get resolution time by incident type.
 */
export async function getResolutionTimeByType(range = '7d') {
  return apiRequest(`/analytics/resolution-time?range=${range}`);
}

/**
 * Get monthly incident trend.
 */
export async function getMonthlyTrend() {
  return apiRequest('/analytics/monthly-trend');
}

/**
 * Get complete analytics data for all charts.
 */
export async function getAnalytics(range = '7d') {
  return apiRequest(`/analytics?range=${range}`);
}

/**
 * Export report and trigger file download.
 */
export async function exportReport(format = 'csv', filters = {}) {
  try {
    const range = typeof filters === 'string' ? filters : (filters?.range || '7d');
    const blob = await apiRequest(`/analytics/export?format=${format}&range=${range}`);

    // If running in browser, trigger file download
    if (typeof window !== 'undefined' && window.URL && blob instanceof Blob) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FERMS_Incident_Report_${range}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    return {
      success: true,
      message: `Report exported as ${format.toUpperCase()} successfully.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || `Failed to export report as ${format.toUpperCase()}`,
    };
  }
}
