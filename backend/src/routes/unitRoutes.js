import { Router } from 'express';
import {
  listUnits,
  getUnit,
  listAvailableUnits,
  updateStatus,
  updateLocation,
  stats,
} from '../controllers/unitController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listUnits);
router.get('/available', listAvailableUnits);
router.get('/stats', stats);
router.get('/:id', getUnit);

// Status updates can be performed by Dispatchers, Administrators, or Field Officers
router.patch(
  '/:id/status',
  requireRole('Administrator', 'Dispatcher', 'Field Officer'),
  updateStatus
);

router.patch(
  '/:id/location',
  requireRole('Administrator', 'Dispatcher', 'Field Officer'),
  updateLocation
);

export default router;
