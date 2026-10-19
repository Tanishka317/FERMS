import {
  getAnalyticsSummary,
  getIncidentsPerDay,
  getIncidentsBySeverity,
  getIncidentsByRegion,
  getResponseTimeByRegion,
  getUnitUtilization,
  getResolutionTimeByType,
  getMonthlyTrend,
  getCompleteAnalytics,
  generateCsvReport,
  generatePdfReportStream,
} from '../services/analyticsService.js';

export async function summary(req, res, next) {
  try {
    const data = await getAnalyticsSummary(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function incidentsPerDay(req, res, next) {
  try {
    const data = await getIncidentsPerDay(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function bySeverity(req, res, next) {
  try {
    const data = await getIncidentsBySeverity(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function byRegion(req, res, next) {
  try {
    const data = await getIncidentsByRegion(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function responseTime(req, res, next) {
  try {
    const data = await getResponseTimeByRegion(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function unitUtilization(req, res, next) {
  try {
    const data = await getUnitUtilization(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function resolutionTime(req, res, next) {
  try {
    const data = await getResolutionTimeByType(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function monthlyTrend(req, res, next) {
  try {
    const data = await getMonthlyTrend();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function completeAnalytics(req, res, next) {
  try {
    const data = await getCompleteAnalytics(req.query.range);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function exportReport(req, res, next) {
  try {
    const format = (req.query.format || req.body?.format || 'csv').toLowerCase();
    const range = req.query.range || req.body?.range || '7d';

    if (format === 'pdf') {
      return generatePdfReportStream(res, range, req.user);
    }

    const csvContent = await generateCsvReport(range);
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="FERMS_Incident_Report_${range}_${dateStr}.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
}
