import { Router } from 'express';
import {
  listUsers,
  getUser,
  createNewUser,
  updateExistingUser,
  deactivateExistingUser,
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// Reading users is accessible to Administrator and Dispatcher/Analyst for staff directories
router.get('/', listUsers);
router.get('/:id', getUser);

// Management restricted to Administrator
router.post('/', requireRole('Administrator'), createNewUser);
router.patch('/:id', requireRole('Administrator'), updateExistingUser);
router.patch('/:id/deactivate', requireRole('Administrator'), deactivateExistingUser);

export default router;
