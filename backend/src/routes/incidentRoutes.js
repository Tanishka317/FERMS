import { Router } from 'express';
import {
  listIncidents,
  getIncident,
  createNewIncident,
  updateExistingIncident,
  updateStatus,
  verify,
  dispatch,
  stats,
} from '../controllers/incidentController.js';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Public emergency reporting (supports both authenticated citizens and emergency public calls)
router.post('/', optionalAuthenticateToken, createNewIncident);

// All query and modification routes require authentication
router.use(authenticateToken);

router.get('/', listIncidents);
router.get('/stats', stats);
router.get('/:id', getIncident);

// Updates to incident details
router.patch('/:id', requireRole('Administrator', 'Dispatcher', 'Field Officer'), updateExistingIncident);

// Workflow updates
router.patch(
  '/:id/status',
  requireRole('Administrator', 'Dispatcher', 'Field Officer'),
  updateStatus
);

// Triage verification
router.post(
  '/:id/verify',
  requireRole('Administrator', 'Dispatcher'),
  verify
);

// Unit dispatch
router.post(
  '/:id/dispatch',
  requireRole('Administrator', 'Dispatcher'),
  dispatch
);

export default router;
