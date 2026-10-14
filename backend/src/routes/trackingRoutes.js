import { Router } from 'express';
import {
  trackingIncidents,
  trackingUnits,
  updateLocation,
} from '../controllers/trackingController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/incidents', trackingIncidents);
router.get('/units', trackingUnits);
router.patch('/units/:id/location', requireRole('Administrator', 'Dispatcher', 'Field Officer'), updateLocation);

export default router;
