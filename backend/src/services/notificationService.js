import { prisma } from '../config/database.js';

export async function getNotifications(role = null, userId = null) {
  const notifications = await prisma.notification.findMany({
    orderBy: { timestamp: 'desc' },
  });

  return notifications
    .filter((n) => {
      if (userId && n.targetUserId === userId) return true;
      if (!n.targetRoles) return true;
      try {
        const roles = JSON.parse(n.targetRoles);
        if (!Array.isArray(roles) || roles.length === 0) return true;
        if (!role) return true;
        return roles.includes(role);
      } catch {
        return true;
      }
    })
    .map((n) => ({
      ...n,
      timestamp: n.timestamp.toISOString(),
      targetRoles: n.targetRoles ? JSON.parse(n.targetRoles) : [],
    }));
}

export async function markNotificationRead(id) {
  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return {
    ...updated,
    timestamp: updated.timestamp.toISOString(),
    targetRoles: updated.targetRoles ? JSON.parse(updated.targetRoles) : [],
  };
}

export async function markAllNotificationsRead(role = null) {
  if (!role) {
    await prisma.notification.updateMany({
      data: { read: true },
    });
    return true;
  }

  const all = await prisma.notification.findMany({
    where: { read: false },
  });

  const matchingIds = all
    .filter((n) => {
      if (!n.targetRoles) return true;
      try {
        const roles = JSON.parse(n.targetRoles);
        return roles.includes(role);
      } catch {
        return true;
      }
    })
    .map((n) => n.id);

  if (matchingIds.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: matchingIds } },
      data: { read: true },
    });
  }

  return true;
}

export async function createNotification(data) {
  const id = data.id || `NOTIF-${String(Date.now()).slice(-6)}`;
  const now = new Date();

  const notification = await prisma.notification.create({
    data: {
      id,
      type: data.type || 'System',
      title: data.title,
      message: data.message,
      incidentId: data.incidentId || null,
      timestamp: now,
      read: false,
      priority: data.priority || 'medium',
      targetRoles: data.targetRoles ? JSON.stringify(data.targetRoles) : null,
      targetUserId: data.targetUserId || null,
    },
  });

  return {
    ...notification,
    timestamp: notification.timestamp.toISOString(),
    targetRoles: notification.targetRoles ? JSON.parse(notification.targetRoles) : [],
  };
}

export async function getUnreadCount(role = null, userId = null) {
  const notifs = await getNotifications(role, userId);
  return notifs.filter((n) => !n.read).length;
}
