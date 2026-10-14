import { prisma } from '../config/database.js';

export async function getTrackingIncidents() {
  const incidents = await prisma.incident.findMany({
    where: {
      status: {
        notIn: ['Resolved', 'Archived'],
      },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      type: true,
      location: true,
      latitude: true,
      longitude: true,
      severity: true,
      status: true,
      assignedUnits: true,
      eta: true,
      reportedAt: true,
    },
  });

  return incidents.map((i) => ({
    ...i,
    assignedUnits: i.assignedUnits ? JSON.parse(i.assignedUnits) : [],
    reportedAt: i.reportedAt.toISOString(),
  }));
}

export async function getTrackingUnits() {
  const units = await prisma.fireUnit.findMany({
    include: {
      station: {
        select: {
          name: true,
        },
      },
    },
  });

  return units.map((u) => ({
    id: u.id,
    type: u.type,
    status: u.status,
    station: u.station ? u.station.name : null,
    currentLocation: u.currentLocation,
    latitude: u.latitude,
    longitude: u.longitude,
    currentIncidentId: u.currentIncidentId,
    eta: u.eta,
    updatedAt: u.updatedAt.toISOString(),
  }));
}

export async function updateUnitGps(unitId, latitude, longitude, locationName = null) {
  const data = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
  };
  if (locationName) data.currentLocation = locationName;

  const updated = await prisma.fireUnit.update({
    where: { id: unitId },
    data,
  });

  return updated;
}
