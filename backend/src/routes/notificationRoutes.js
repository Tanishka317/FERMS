import { Router } from 'express';
import {
  listNotifications,
  markRead,
  markAllRead,
  unreadCount,
  createNewNotification,
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listNotifications);
router.get('/unread-count', unreadCount);
router.patch('/:id/read', markRead);
router.post('/mark-all-read', markAllRead);
router.patch('/read-all', markAllRead);

// Creating system notifications
router.post('/', requireRole('Administrator', 'Dispatcher'), createNewNotification);

export default router;
