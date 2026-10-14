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

router.use(authenticateToken);

router.get('/', completeAnalytics);
router.get('/summary', summary);
router.get('/incidents-per-day', incidentsPerDay);
router.get('/by-severity', bySeverity);
router.get('/by-region', byRegion);
router.get('/response-time', responseTime);
router.get('/unit-utilization', unitUtilization);
router.get('/resolution-time', resolutionTime);
router.get('/monthly-trend', monthlyTrend);

// Export report
router.get('/export', exportReport);
router.post('/export', exportReport);

export default router;
