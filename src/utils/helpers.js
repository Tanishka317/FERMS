// Utility functions for FERMS

/**
 * Format a date string for display.
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const defaults = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleString('en-IN', { ...defaults, ...options });
}

/**
 * Format only the time portion.
 */
export function formatTime(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format only the date portion.
 */
export function formatDateOnly(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get a human-readable "time ago" string.
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

/**
 * Get severity color class.
 */
export function getSeverityColor(severity) {
  switch (severity) {
    case 'Critical': return { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', badge: 'badge-critical' };
    case 'High': return { bg: '#fff7ed', text: '#9a3412', border: '#fdba74', badge: 'badge-high' };
    case 'Medium': return { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', badge: 'badge-medium' };
    case 'Low': return { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', badge: 'badge-low' };
    default: return { bg: '#f9fafb', text: '#374151', border: '#d1d5db', badge: '' };
  }
}

/**
 * Get status color class.
 */
export function getStatusColor(status) {
  switch (status) {
    case 'Reported': return { bg: '#f3f4f6', text: '#374151' };
    case 'Verified': return { bg: '#eff6ff', text: '#1d4ed8' };
    case 'Dispatched': return { bg: '#fff7ed', text: '#c2410c' };
    case 'En Route': return { bg: '#fef9c3', text: '#854d0e' };
    case 'On-Site': return { bg: '#fff7ed', text: '#c2410c' };
    case 'Contained': return { bg: '#f0fdf4', text: '#166534' };
    case 'Resolved': return { bg: '#dcfce7', text: '#15803d' };
    case 'Archived': return { bg: '#f3f4f6', text: '#6b7280' };
    default: return { bg: '#f9fafb', text: '#374151' };
  }
}

/**
 * Get unit status color.
 */
export function getUnitStatusColor(status) {
  switch (status) {
    case 'Available': return { bg: '#dcfce7', text: '#15803d' };
    case 'Dispatched': return { bg: '#fff7ed', text: '#c2410c' };
    case 'En Route': return { bg: '#fef9c3', text: '#854d0e' };
    case 'On-Site': return { bg: '#fef2f2', text: '#991b1b' };
    case 'Maintenance': return { bg: '#f3f4f6', text: '#6b7280' };
    case 'Unavailable': return { bg: '#f3f4f6', text: '#9ca3af' };
    default: return { bg: '#f9fafb', text: '#374151' };
  }
}

/**
 * Get the ordered list of incident statuses.
 */
export const INCIDENT_STATUSES = [
  'Reported',
  'Verified',
  'Dispatched',
  'En Route',
  'On-Site',
  'Contained',
  'Resolved',
  'Archived',
];

/**
 * Get the next valid status for an incident.
 */
export function getNextStatus(currentStatus) {
  const idx = INCIDENT_STATUSES.indexOf(currentStatus);
  if (idx === -1 || idx === INCIDENT_STATUSES.length - 1) return null;
  return INCIDENT_STATUSES[idx + 1];
}

/**
 * Get notification priority color.
 */
export function getNotifPriorityColor(priority) {
  switch (priority) {
    case 'critical': return { bg: '#fef2f2', text: '#991b1b', dot: '#dc2626' };
    case 'high': return { bg: '#fff7ed', text: '#9a3412', dot: '#ea580c' };
    case 'medium': return { bg: '#fffbeb', text: '#92400e', dot: '#d97706' };
    case 'low': return { bg: '#f0fdf4', text: '#166534', dot: '#16a34a' };
    default: return { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' };
  }
}

/**
 * Calculate distance between two lat/lng coordinates (Haversine formula).
 */
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

/**
 * Truncate long text strings.
 */
export function truncate(str, maxLen = 60) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}
