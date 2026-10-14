import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  console.log('=== DATABASE INSPECTION REPORT ===\n');

  const usersCount = await prisma.user.count();
  const incidentsCount = await prisma.incident.count();
  const dispatchesCount = await prisma.dispatch.count();
  const fireUnitsCount = await prisma.fireUnit.count();
  const stationsCount = await prisma.fireStation.count();
  const notifsCount = await prisma.notification.count();
  const activitiesCount = await prisma.incidentActivity.count();

  console.log(`Counts:
  Users: ${usersCount}
  Incidents: ${incidentsCount}
  Dispatches: ${dispatchesCount}
  Fire Units: ${fireUnitsCount}
  Stations: ${stationsCount}
  Notifications: ${notifsCount}
  Activities: ${activitiesCount}
  `);

  const allIncidents = await prisma.incident.findMany({
    orderBy: { id: 'asc' },
    include: {
      dispatches: true,
      activityLog: true,
    }
  });

  console.log(`--- ALL ${allIncidents.length} INCIDENTS ---`);
  for (const inc of allIncidents) {
    console.log(`[${inc.id}] | Type: ${inc.type.padEnd(26)} | Loc: ${inc.location.padEnd(28)} | Status: ${inc.status.padEnd(10)} | Reporter: ${inc.reporter || 'null'} (${inc.reporterId || 'null'}) | Dispatches: ${inc.dispatches.length} | ReportedAt: ${inc.reportedAt.toISOString()}`);
  }

  await prisma.$disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
