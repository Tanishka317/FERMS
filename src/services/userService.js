// User / Auth Service
// Connects to FERMS REST API backend

import { apiRequest } from './api.js';

/**
 * Register a new Citizen account.
 */
export async function registerUser({ name, email, password }) {
  const result = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  if (result.token) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ferms_token', result.token);
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.__FERMS_TOKEN__ = result.token;
    }
  }

  return result;
}

/**
 * Get profile of currently authenticated user.
 */
export async function getCurrentUser() {
  return apiRequest('/auth/me');
}

/**
 * Authenticate a user with email and password.
 */
export async function loginUser(email, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.token) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ferms_token', result.token);
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.__FERMS_TOKEN__ = result.token;
    }
  }

  return result;
}

/**
 * Demo login — selects a user by role without password.
 */
export async function demoLogin(role) {
  const result = await apiRequest('/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });

  if (result.token) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ferms_token', result.token);
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.__FERMS_TOKEN__ = result.token;
    }
  }

  return result;
}

/**
 * Get all users (admin / staff access).
 */
export async function getUsers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.role) params.append('role', filters.role);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/users${query}`);
}

/**
 * Get a single user by ID.
 */
export async function getUserById(id) {
  return apiRequest(`/users/${id}`);
}

/**
 * Create a new user (admin only).
 */
export async function createUser(data) {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a user.
 */
export async function updateUser(id, data) {
  return apiRequest(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Deactivate a user.
 */
export async function deactivateUser(id) {
  return apiRequest(`/users/${id}/deactivate`, {
    method: 'PATCH',
  });
}

/**
 * Logout the current user.
 */
export async function logoutUser() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore error on logout if token already expired
  } finally {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('ferms_token');
      sessionStorage.removeItem('ferms_user');
    }
    if (typeof globalThis !== 'undefined') {
      delete globalThis.__FERMS_TOKEN__;
    }
  }
  return true;
}
