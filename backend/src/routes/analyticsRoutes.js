import { Router } from 'express';
import {
  summary,
  incidentsPerDay,
  bySeverity,
  byRegion,
  responseTime,
  unitUtilization,
  resolutionTime,
  monthlyTrend,
  completeAnalytics,
  exportReport,
} from '../controllers/analyticsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Reading analytics metrics restricted to authorized staff
router.use(authenticateToken);
router.use(requireRole('Administrator', 'Analyst', 'Dispatcher'));

router.get('/', completeAnalytics);
router.get('/summary', summary);
router.get('/incidents-per-day', incidentsPerDay);
router.get('/by-severity', bySeverity);
router.get('/by-region', byRegion);
router.get('/response-time', responseTime);
router.get('/unit-utilization', unitUtilization);
router.get('/resolution-time', resolutionTime);
router.get('/monthly-trend', monthlyTrend);

// Exporting reports restricted to Administrator and Analyst
router.get('/export', requireRole('Administrator', 'Analyst'), exportReport);
router.post('/export', requireRole('Administrator', 'Analyst'), exportReport);

export default router;
