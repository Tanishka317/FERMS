import {
  getStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation,
} from '../services/stationService.js';

export async function listStations(req, res, next) {
  try {
    const stations = await getStations();
    res.json({
      success: true,
      data: stations,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStation(req, res, next) {
  try {
    const station = await getStationById(req.params.id);
    res.json({
      success: true,
      data: station,
    });
  } catch (err) {
    next(err);
  }
}

export async function createNewStation(req, res, next) {
  try {
    const station = await createStation(req.body);
    res.status(201).json({
      success: true,
      data: station,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateExistingStation(req, res, next) {
  try {
    const updated = await updateStation(req.params.id, req.body);
    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteExistingStation(req, res, next) {
  try {
    await deleteStation(req.params.id);
    res.json({
      success: true,
      message: `Station ${req.params.id} deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
}
