import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  getUnreadCount,
} from '../services/notificationService.js';

export async function listNotifications(req, res, next) {
  try {
    const role = req.query.role || (req.user ? req.user.role : null);
    const userId = req.user ? req.user.id : null;
    const notifications = await getNotifications(role, userId);
    res.json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const updated = await markNotificationRead(req.params.id);
    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const role = req.query.role || null;
    await markAllNotificationsRead(role);
    res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(req, res, next) {
  try {
    const role = req.query.role || (req.user ? req.user.role : null);
    const userId = req.user ? req.user.id : null;
    const count = await getUnreadCount(role, userId);
    res.json({
      success: true,
      data: { count },
    });
  } catch (err) {
    next(err);
  }
}

export async function createNewNotification(req, res, next) {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: { message: 'Title and message are required.' },
      });
    }

    const created = await createNotification(req.body);
    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err) {
    next(err);
  }
}
