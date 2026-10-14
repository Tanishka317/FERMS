import { prisma } from '../config/database.js';
import { generateIncidentId } from '../utils/incidentId.js';

// Strict lifecycle transitions definition
export const VALID_STATUS_TRANSITIONS = {
  Reported: ['Verified', 'Archived'], // Verified by dispatcher, or rejected/archived
  Verified: ['Dispatched', 'Archived'],
  Dispatched: ['En Route', 'Archived'],
  'En Route': ['On-Site', 'Archived'],
  'On-Site': ['Contained', 'Resolved', 'Archived'],
  Contained: ['Resolved', 'Archived'],
  Resolved: ['Archived'],
  Archived: [],
};

export async function getIncidents(filters = {}) {
  const where = {};

  if (filters.status) where.status = filters.status;
  if (filters.severity) where.severity = filters.severity;
  if (filters.type) where.type = filters.type;
  if (filters.reporterId) where.reporterId = filters.reporterId;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    where.OR = [
      { id: { contains: q } },
      { location: { contains: q } },
      { type: { contains: q } },
      { reporter: { contains: q } },
      { description: { contains: q } },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    where.reportedAt = {};
    if (filters.dateFrom) where.reportedAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.reportedAt.lte = new Date(filters.dateTo);
  }

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      activityLog: {
        orderBy: { time: 'asc' },
      },
      dispatches: {
        include: {
          unit: true,
        },
      },
    },
    orderBy: { reportedAt: 'desc' },
  });

  return incidents.map(formatIncidentResponse);
}

export async function getIncidentById(id) {
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      activityLog: {
        orderBy: { time: 'asc' },
      },
      dispatches: {
        include: {
          unit: true,
        },
      },
    },
  });

  if (!incident) {
    const error = new Error(`Incident ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  return formatIncidentResponse(incident);
}

export async function createIncident(data, user = null) {
  const reporterId = user ? user.id : null;
  const reporter = data.reporter || (user ? user.name : 'Anonymous Reporter');
  const reporterPhone = data.reporterPhone || (user ? user.phone : null);

  // Prevent rapid duplicate submissions (e.g. accidental double clicks, network retries within 30s)
  const recentWindow = new Date(Date.now() - 30 * 1000);
  const duplicateConditions = [
    { reporter },
  ];
  if (reporterId) {
    duplicateConditions.push({ reporterId });
  }

  const existingDuplicate = await prisma.incident.findFirst({
    where: {
      type: data.type,
      location: data.location,
      description: data.description,
      reportedAt: { gte: recentWindow },
      OR: duplicateConditions,
    },
    orderBy: { reportedAt: 'desc' },
  });

  if (existingDuplicate) {
    return getIncidentById(existingDuplicate.id);
  }

  const id = await generateIncidentId();
  const now = new Date();

  const newIncident = await prisma.incident.create({
    data: {
      id,
      type: data.type,
      location: data.location,
      address: data.address || null,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      severity: data.severity || 'Medium',
      description: data.description,
      reporter,
      reporterPhone,
      reporterId,
      reportedAt: now,
      status: 'Reported',
      assignedUnits: JSON.stringify([]),
      affectedPeople: data.affectedPeople ? parseInt(data.affectedPeople, 10) : 0,
      notes: data.notes || null,
    },
  });

  // Record initial activity
  await prisma.incidentActivity.create({
    data: {
      incidentId: id,
      userId: user ? user.id : null,
      time: now,
      action: `Incident reported by ${newIncident.reporter}`,
      type: 'report',
      newStatus: 'Reported',
    },
  });

  // Automatically broadcast notification for Critical incidents
  if (newIncident.severity === 'Critical') {
    await prisma.notification.create({
      data: {
        id: `NOTIF-${String(Date.now()).slice(-6)}`,
        type: 'Critical',
        title: `New Critical Incident: ${newIncident.type}`,
        message: `Critical fire emergency reported at ${newIncident.location}. Immediate dispatch required. Incident ID: ${newIncident.id}`,
        incidentId: newIncident.id,
        timestamp: now,
        priority: 'critical',
        targetRoles: JSON.stringify(['Dispatcher', 'Administrator', 'Field Officer']),
      },
    });
  }

  return getIncidentById(id);
}

export async function updateIncident(id, data, user = null) {
  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) {
    const error = new Error(`Incident ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const updateData = { ...data };
  delete updateData.id;
  delete updateData.activityLog;
  delete updateData.assignedUnits;

  const updated = await prisma.incident.update({
    where: { id },
    data: updateData,
  });

  return getIncidentById(id);
}

export async function updateIncidentStatus(id, newStatus, note = '', user = null) {
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) {
    const error = new Error(`Incident ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Enforce workflow transitions
  const allowed = VALID_STATUS_TRANSITIONS[incident.status] || [];
  if (!allowed.includes(newStatus)) {
    const error = new Error(
      `Invalid status transition from '${incident.status}' to '${newStatus}'. Allowed transitions: ${allowed.join(', ') || 'None'}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const updates = { status: newStatus };

  if (newStatus === 'Resolved') {
    updates.resolutionTime = now;
    if (incident.dispatchTime && !incident.responseTime) {
      const diffMs = now.getTime() - new Date(incident.dispatchTime).getTime();
      const diffMins = Math.round(diffMs / 60000);
      updates.responseTime = `${diffMins} min`;
    }
  }

  if (newStatus === 'On-Site') {
    updates.arrivalTime = incident.arrivalTime || now;
    if (incident.dispatchTime && !incident.responseTime) {
      const diffMs = now.getTime() - new Date(incident.dispatchTime).getTime();
      const diffMins = Math.round(diffMs / 60000);
      updates.responseTime = `${diffMins} min`;
    }
  }

  // Perform updates in transaction
  await prisma.$transaction([
    prisma.incident.update({
      where: { id },
      data: updates,
    }),
    prisma.incidentActivity.create({
      data: {
        incidentId: id,
        userId: user ? user.id : null,
        time: now,
        action: note || `Status updated to ${newStatus}`,
        type: mapStatusToActivityType(newStatus),
        previousStatus: incident.status,
        newStatus,
      },
    }),
  ]);

  // Create notifications on key status transitions
  if (newStatus === 'Resolved') {
    await prisma.notification.create({
      data: {
        id: `NOTIF-${String(Date.now()).slice(-6)}`,
        type: 'Status Update',
        title: `${incident.id} — Resolved`,
        message: `${incident.type} at ${incident.location} has been successfully resolved.`,
        incidentId: incident.id,
        timestamp: now,
        priority: 'medium',
        targetRoles: JSON.stringify(['Dispatcher', 'Administrator', 'Analyst']),
      },
    });
  }

  return getIncidentById(id);
}

export async function verifyIncident(id, user = null) {
  return updateIncidentStatus(id, 'Verified', `Incident verified by ${user ? user.name : 'Dispatcher'}`, user);
}

export async function getIncidentStats() {
  const incidents = await prisma.incident.findMany({
    select: {
      id: true,
      status: true,
      severity: true,
      reportedAt: true,
    },
  });

  const active = incidents.filter((i) => !['Resolved', 'Archived'].includes(i.status));
  const critical = incidents.filter(
    (i) => i.severity === 'Critical' && !['Resolved', 'Archived'].includes(i.status)
  );

  const todayStr = new Date().toDateString();
  const incidentsToday = incidents.filter(
    (i) => new Date(i.reportedAt).toDateString() === todayStr
  );

  return {
    activeIncidents: active.length,
    criticalIncidents: critical.length,
    incidentsToday: incidentsToday.length,
    totalIncidents: incidents.length,
    resolvedIncidents: incidents.filter((i) => i.status === 'Resolved' || i.status === 'Archived').length,
  };
}

function mapStatusToActivityType(status) {
  switch (status) {
    case 'Verified':
      return 'verify';
    case 'Dispatched':
      return 'dispatch';
    case 'On-Site':
      return 'arrive';
    case 'Contained':
      return 'contain';
    case 'Resolved':
      return 'resolve';
    case 'Archived':
      return 'archive';
    default:
      return 'update';
  }
}

function formatIncidentResponse(incident) {
  let assignedUnits = [];
  if (incident.assignedUnits) {
    try {
      assignedUnits = JSON.parse(incident.assignedUnits);
    } catch {
      assignedUnits = [];
    }
  }

  return {
    ...incident,
    assignedUnits,
    reportedAt: incident.reportedAt ? incident.reportedAt.toISOString() : null,
    dispatchTime: incident.dispatchTime ? incident.dispatchTime.toISOString() : null,
    arrivalTime: incident.arrivalTime ? incident.arrivalTime.toISOString() : null,
    resolutionTime: incident.resolutionTime ? incident.resolutionTime.toISOString() : null,
    activityLog: incident.activityLog
      ? incident.activityLog.map((a) => ({
          time: a.time ? a.time.toISOString() : a.createdAt.toISOString(),
          action: a.action,
          type: a.type,
          newStatus: a.newStatus,
          previousStatus: a.previousStatus,
        }))
      : [],
  };
}
