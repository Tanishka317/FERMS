// Notification Service
// Connects to FERMS REST API backend

import { apiRequest } from './api.js';

/**
 * Get all notifications for current user/role.
 */
export async function getNotifications(role = null) {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  return apiRequest(`/notifications${query}`);
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead() {
  await apiRequest('/notifications/mark-all-read', {
    method: 'POST',
  });
  return true;
}

/**
 * Add a new notification.
 */
export async function addNotification(data) {
  try {
    return await apiRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch {
    // Graceful fallback for local notifications
    return {
      id: `NOTIF-${String(Date.now()).slice(-6)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...data,
    };
  }
}

/**
 * Get unread notification count.
 */
export async function getUnreadCount(role = null) {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  const result = await apiRequest(`/notifications/unread-count${query}`);
  return result?.count !== undefined ? result.count : 0;
}
