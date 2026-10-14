import { prisma } from '../config/database.js';

export async function getUnits(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.stationId) where.stationId = filters.stationId;
  if (filters.type) where.type = filters.type;

  const units = await prisma.fireUnit.findMany({
    where,
    include: {
      station: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  return units.map((u) => ({
    ...u,
    station: u.station ? u.station.name : null,
    crewNames: u.crewNames ? JSON.parse(u.crewNames) : [],
  }));
}

export async function getUnitById(id) {
  const unit = await prisma.fireUnit.findUnique({
    where: { id },
    include: {
      station: true,
      currentIncident: {
        select: {
          id: true,
          type: true,
          location: true,
          severity: true,
          status: true,
        },
      },
      dispatches: {
        orderBy: { dispatchedAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!unit) {
    const error = new Error(`Fire Unit ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  return {
    ...unit,
    station: unit.station ? unit.station.name : null,
    crewNames: unit.crewNames ? JSON.parse(unit.crewNames) : [],
  };
}

export async function getAvailableUnits() {
  return getUnits({ status: 'Available' });
}

export async function updateUnitStatus(unitId, status) {
  const existing = await prisma.fireUnit.findUnique({ where: { id: unitId } });
  if (!existing) {
    const error = new Error(`Fire Unit ${unitId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const updates = { status };
  if (status === 'Available') {
    updates.currentIncidentId = null;
    updates.eta = null;
  }

  const updated = await prisma.fireUnit.update({
    where: { id: unitId },
    data: updates,
    include: {
      station: true,
    },
  });

  return {
    ...updated,
    station: updated.station ? updated.station.name : null,
    crewNames: updated.crewNames ? JSON.parse(updated.crewNames) : [],
  };
}

export async function updateUnitLocation(unitId, latitude, longitude) {
  const updated = await prisma.fireUnit.update({
    where: { id: unitId },
    data: {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    },
  });

  return updated;
}

export async function getUnitStats() {
  const units = await prisma.fireUnit.findMany({
    select: { status: true },
  });

  return {
    total: units.length,
    available: units.filter((u) => u.status === 'Available').length,
    dispatched: units.filter((u) => u.status === 'Dispatched').length,
    enRoute: units.filter((u) => u.status === 'En Route').length,
    onSite: units.filter((u) => u.status === 'On-Site').length,
    maintenance: units.filter((u) => u.status === 'Maintenance').length,
    unavailable: units.filter((u) => u.status === 'Unavailable').length,
  };
}
