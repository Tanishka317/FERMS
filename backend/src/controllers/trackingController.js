import {
  getTrackingIncidents,
  getTrackingUnits,
  updateUnitGps,
} from '../services/trackingService.js';

export async function trackingIncidents(req, res, next) {
  try {
    const data = await getTrackingIncidents();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function trackingUnits(req, res, next) {
  try {
    const data = await getTrackingUnits();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude, location } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'Latitude and longitude are required.' },
      });
    }

    const updated = await updateUnitGps(req.params.id, latitude, longitude, location);
    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}
