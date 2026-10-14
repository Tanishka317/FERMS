import { prisma } from '../config/database.js';
import { getIncidentById } from './incidentService.js';

export async function dispatchUnitsToIncident(incidentId, unitIds, user = null, customEta = null) {
  if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
    const error = new Error('At least one unit must be selected for dispatch.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Verify incident exists
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  });

  if (!incident) {
    const error = new Error(`Incident ${incidentId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  if (['Resolved', 'Archived'].includes(incident.status)) {
    const error = new Error(`Cannot dispatch units to a ${incident.status} incident.`);
    error.statusCode = 400;
    throw error;
  }

  // 2. Verify all units exist
  const units = await prisma.fireUnit.findMany({
    where: { id: { in: unitIds } },
  });

  if (units.length !== unitIds.length) {
    const foundIds = units.map((u) => u.id);
    const missing = unitIds.filter((id) => !foundIds.includes(id));
    const error = new Error(`Units not found: ${missing.join(', ')}`);
    error.statusCode = 404;
    throw error;
  }

  // Check if any unit is in maintenance or unavailable
  const unavailable = units.filter((u) => ['Maintenance', 'Unavailable'].includes(u.status));
  if (unavailable.length > 0) {
    const error = new Error(
      `Cannot dispatch units currently in ${unavailable.map((u) => `${u.id} (${u.status})`).join(', ')}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  let currentUnits = [];
  try {
    currentUnits = JSON.parse(incident.assignedUnits || '[]');
  } catch {
    currentUnits = [];
  }

  const combinedUnits = Array.from(new Set([...currentUnits, ...unitIds]));
  const eta = customEta || '8 min';

  // Execute database transaction
  await prisma.$transaction(async (tx) => {
    // A. Update Incident
    await tx.incident.update({
      where: { id: incidentId },
      data: {
        status: incident.status === 'Reported' || incident.status === 'Verified' ? 'Dispatched' : incident.status,
        assignedUnits: JSON.stringify(combinedUnits),
        dispatchTime: incident.dispatchTime || now,
        eta,
      },
    });

    // B. Update Units and create Dispatches
    for (const unit of units) {
      await tx.fireUnit.update({
        where: { id: unit.id },
        data: {
          status: 'Dispatched',
          currentIncidentId: incidentId,
          eta,
        },
      });

      await tx.dispatch.create({
        data: {
          incidentId,
          unitId: unit.id,
          dispatchedBy: user ? user.id : null,
          estimatedArrival: eta,
          dispatchedAt: now,
          status: 'Active',
        },
      });

      // Activity log entry
      await tx.incidentActivity.create({
        data: {
          incidentId,
          userId: user ? user.id : null,
          time: now,
          action: `Unit ${unit.id} dispatched to incident`,
          type: 'dispatch',
          newStatus: 'Dispatched',
        },
      });
    }

    // C. Notification
    await tx.notification.create({
      data: {
        id: `NOTIF-${String(Date.now()).slice(-6)}`,
        type: 'Dispatch',
        title: `Units Dispatched to ${incident.id}`,
        message: `${unitIds.join(', ')} assigned and dispatched to ${incident.type} at ${incident.location}. ETA: ${eta}.`,
        incidentId,
        timestamp: now,
        priority: 'high',
        targetRoles: JSON.stringify(['Dispatcher', 'Administrator', 'Field Officer']),
      },
    });
  });

  return getIncidentById(incidentId);
}
