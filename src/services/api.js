// Centralized API Client for FERMS Frontend
// Communicates with Node.js / Express backend

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) ||
  'http://localhost:5000/api';

/**
 * Retrieve current JWT auth token from session storage.
 */
export function getToken() {
  if (typeof sessionStorage !== 'undefined') {
    const token = sessionStorage.getItem('ferms_token');
    if (token) return token;

    const storedUser = sessionStorage.getItem('ferms_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return parsed.token || null;
      } catch {
        return null;
      }
    }
  }

  if (typeof globalThis !== 'undefined' && globalThis.__FERMS_TOKEN__) {
    return globalThis.__FERMS_TOKEN__;
  }

  return null;
}

/**
 * Standard fetch wrapper with auth header injection and structured error handling.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle binary streams like CSV and PDF downloads
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv') || contentType.includes('application/pdf')) {
    if (!response.ok) {
      throw new Error(`Failed to download report (${response.status})`);
    }
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data.data !== undefined ? data.data : data;
}
