import {
  getUnits,
  getUnitById,
  getAvailableUnits,
  updateUnitStatus,
  updateUnitLocation,
  getUnitStats,
} from '../services/unitService.js';

export async function listUnits(req, res, next) {
  try {
    const { status, stationId, type } = req.query;
    const units = await getUnits({ status, stationId, type });
    res.json({
      success: true,
      data: units,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUnit(req, res, next) {
  try {
    const unit = await getUnitById(req.params.id);
    res.json({
      success: true,
      data: unit,
    });
  } catch (err) {
    next(err);
  }
}

export async function listAvailableUnits(req, res, next) {
  try {
    const units = await getAvailableUnits();
    res.json({
      success: true,
      data: units,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: { message: 'Unit status is required.' },
      });
    }

    const updated = await updateUnitStatus(req.params.id, status);
    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'Latitude and longitude coordinates are required.' },
      });
    }

    const updated = await updateUnitLocation(req.params.id, latitude, longitude);
    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function stats(req, res, next) {
  try {
    const result = await getUnitStats();
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
