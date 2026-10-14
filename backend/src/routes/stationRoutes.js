import { Router } from 'express';
import {
  listStations,
  getStation,
  createNewStation,
  updateExistingStation,
  deleteExistingStation,
} from '../controllers/stationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listStations);
router.get('/:id', getStation);

router.post('/', requireRole('Administrator'), createNewStation);
router.patch('/:id', requireRole('Administrator'), updateExistingStation);
router.delete('/:id', requireRole('Administrator'), deleteExistingStation);

export default router;
