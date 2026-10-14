import { prisma } from '../config/database.js';

export async function getStations() {
  const stations = await prisma.fireStation.findMany({
    include: {
      units: {
        select: {
          id: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  // Calculate live available units count from related units
  return stations.map((s) => ({
    ...s,
    availableUnits: s.units.filter((u) => u.status === 'Available').length,
    totalUnits: s.totalUnits || s.units.length,
  }));
}

export async function getStationById(id) {
  const station = await prisma.fireStation.findUnique({
    where: { id },
    include: {
      units: true,
    },
  });

  if (!station) {
    const error = new Error(`Fire Station ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  return {
    ...station,
    availableUnits: station.units.filter((u) => u.status === 'Available').length,
    totalUnits: station.totalUnits || station.units.length,
  };
}

export async function createStation(data) {
  const count = await prisma.fireStation.count();
  const id = data.id || `STN-${String(count + 1).padStart(3, '0')}`;

  const station = await prisma.fireStation.create({
    data: {
      id,
      name: data.name,
      location: data.location || null,
      address: data.address,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      phone: data.phone,
      status: data.status || 'Operational',
      totalUnits: data.totalUnits || 0,
      availableUnits: data.availableUnits || 0,
      totalPersonnel: data.totalPersonnel || 0,
      activePersonnel: data.activePersonnel || 0,
      commandOfficer: data.commandOfficer || null,
      established: data.established || null,
      coverageArea: data.coverageArea || null,
    },
  });

  return station;
}

export async function updateStation(id, data) {
  await getStationById(id);
  const updated = await prisma.fireStation.update({
    where: { id },
    data,
  });
  return updated;
}

export async function deleteStation(id) {
  await getStationById(id);
  await prisma.fireStation.delete({ where: { id } });
  return true;
}
