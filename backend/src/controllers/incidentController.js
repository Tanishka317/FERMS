import {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  updateIncidentStatus,
  verifyIncident,
  getIncidentStats,
} from '../services/incidentService.js';
import { dispatchUnitsToIncident } from '../services/dispatchService.js';

export async function listIncidents(req, res, next) {
  try {
    const { status, severity, type, search, dateFrom, dateTo, myReports } = req.query;

    const filters = { status, severity, type, search, dateFrom, dateTo };
    // If Citizen role or myReports requested, scope to current user
    if (req.user && (req.user.role === 'Citizen' || myReports === 'true')) {
      filters.reporterId = req.user.id;
    }

    const incidents = await getIncidents(filters);
    res.json({
      success: true,
      data: incidents,
    });
  } catch (err) {
    next(err);
  }
}

export async function getIncident(req, res, next) {
  try {
    const incident = await getIncidentById(req.params.id);

    // Enforce ownership: Citizens can only view/track their own reported incidents
    if (req.user && req.user.role === 'Citizen') {
      if (!incident.reporterId || incident.reporterId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied. You are only authorized to track incidents reported by your account.' },
        });
      }
    }

    res.json({
      success: true,
      data: incident,
    });
  } catch (err) {
    next(err);
  }
}

export async function createNewIncident(req, res, next) {
  try {
    const { type, location, severity, description } = req.body;
    if (!type || !location || !description) {
      return res.status(400).json({
        success: false,
        error: { message: 'Incident type, location, and description are required.' },
      });
    }

    const incident = await createIncident(req.body, req.user);
    res.status(201).json({
      success: true,
      data: incident,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateExistingIncident(req, res, next) {
  try {
    const incident = await updateIncident(req.params.id, req.body, req.user);
    res.json({
      success: true,
      data: incident,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: { message: 'New status is required.' },
      });
    }

    const incident = await updateIncidentStatus(req.params.id, status, note, req.user);
    res.json({
      success: true,
      data: incident,
    });
  } catch (err) {
    next(err);
  }
}

export async function verify(req, res, next) {
  try {
    const incident = await verifyIncident(req.params.id, req.user);
    res.json({
      success: true,
      data: incident,
      message: `Incident ${req.params.id} verified successfully.`,
    });
  } catch (err) {
    next(err);
  }
}

export async function dispatch(req, res, next) {
  try {
    const { unitIds, eta } = req.body;
    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Array of unitIds is required.' },
      });
    }

    const incident = await dispatchUnitsToIncident(req.params.id, unitIds, req.user, eta);
    res.json({
      success: true,
      data: incident,
      message: `${unitIds.length} unit(s) dispatched to incident ${req.params.id}.`,
    });
  } catch (err) {
    next(err);
  }
}

export async function stats(req, res, next) {
  try {
    const result = await getIncidentStats();
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
