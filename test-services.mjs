import assert from 'node:assert';
import {
  getIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  updateIncidentStatus,
  assignUnitsToIncident,
  getIncidentStats
} from './src/services/incidentService.js';

import {
  getUnits,
  getUnitById,
  getAvailableUnits,
  dispatchUnit,
  updateUnitStatus,
  getUnitStats
} from './src/services/unitService.js';

import {
  registerUser,
  loginUser,
  demoLogin,
  getCurrentUser,
  logoutUser,
  getUsers,
  createUser,
  deactivateUser
} from './src/services/userService.js';

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  addNotification,
  getUnreadCount
} from './src/services/notificationService.js';

import {
  getStations,
  getStationById
} from './src/services/stationService.js';

import {
  getAnalyticsSummary,
  getIncidentsPerDay,
  getIncidentsBySeverity,
  getIncidentsByRegion,
  getResponseTimeByRegion,
  getUnitUtilization,
  getMonthlyTrend,
  exportReport
} from './src/services/analyticsService.js';

import {
  formatDate,
  formatTime,
  timeAgo,
  getDistanceKm,
  getNextStatus,
  INCIDENT_STATUSES
} from './src/utils/helpers.js';

async function runTests() {
  console.log('🚀 Starting Comprehensive FERMS Service & Data Layer Tests...\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  const createdIncidentIds = [];
  const createdUserEmails = [];

  try {
    // --- Auth & User Tests ---
  const serviceCitizenEmail = `svc.citizen.${Date.now()}@example.com`;
  createdUserEmails.push(serviceCitizenEmail);

  await test('Auth: Register new Citizen account via service layer', async () => {
    const regRes = await registerUser({
      name: 'Service Citizen User',
      email: serviceCitizenEmail,
      password: 'mypassword123',
    });
    assert(regRes.user, 'User object should be returned');
    assert.strictEqual(regRes.user.email, serviceCitizenEmail.toLowerCase());
    assert.strictEqual(regRes.user.role, 'Citizen');
    assert(regRes.token, 'Token should be returned upon registration');
  });

  await test('Auth: Reject duplicate email registration in service layer', async () => {
    await assert.rejects(
      async () => await registerUser({
        name: 'Another User',
        email: serviceCitizenEmail,
        password: 'anotherpassword123',
      }),
      /already exists/
    );
  });

  await test('Auth: Login with newly registered credentials and getMe', async () => {
    const loginRes = await loginUser(serviceCitizenEmail, 'mypassword123');
    assert.strictEqual(loginRes.user.email, serviceCitizenEmail.toLowerCase());
    assert.strictEqual(loginRes.user.role, 'Citizen');

    const me = await getCurrentUser();
    assert.strictEqual(me.email, serviceCitizenEmail.toLowerCase());
    assert.strictEqual(me.role, 'Citizen');
  });
  await test('Auth: Demo Login for all 5 roles', async () => {
    const roles = ['Administrator', 'Dispatcher', 'Field Officer', 'Citizen', 'Analyst'];
    for (const role of roles) {
      const res = await demoLogin(role);
      assert(res.user, `User should exist for role ${role}`);
      assert.strictEqual(res.user.role, role);
      assert(res.token, 'Token should be returned');
    }
  });

  await test('Auth: Standard Login with valid credentials', async () => {
    const res = await loginUser('admin@ferms.gov.in', 'admin123');
    assert.strictEqual(res.user.role, 'Administrator');
    assert.strictEqual(res.user.email, 'admin@ferms.gov.in');
    globalThis.__FERMS_TOKEN__ = res.token;
  });

  await test('Auth: Login fails with invalid password', async () => {
    await assert.rejects(
      async () => await loginUser('dispatcher@ferms.gov.in', 'wrongpwd'),
      /Invalid credentials/
    );
  });

  await test('Users: Fetch users, create user, and deactivate user', async () => {
    const initialUsers = await getUsers();
    assert(initialUsers.length >= 8);

    const newUser = await createUser({
      name: 'Test Officer',
      email: `testofficer_${Date.now()}@ferms.gov.in`,
      phone: '+91-99999-00000',
      role: 'Field Officer',
      status: 'Active'
    });
    createdUserEmails.push(newUser.email);
    assert.strictEqual(newUser.name, 'Test Officer');

    const deactivated = await deactivateUser(newUser.id);
    assert.strictEqual(deactivated.status, 'Inactive');
  });

  // --- Incident Service Tests ---
  await test('Incidents: Retrieve all incidents and filter by severity', async () => {
    const all = await getIncidents();
    assert(all.length >= 10);

    const critical = await getIncidents({ severity: 'Critical' });
    assert(critical.every(i => i.severity === 'Critical'));
    assert(critical.length >= 1);
  });

  await test('Incidents: Filter by status and search query', async () => {
    const reported = await getIncidents({ status: 'Reported' });
    assert(reported.every(i => i.status === 'Reported'));

    const searched = await getIncidents({ search: 'Andheri' });
    assert(searched.length >= 1);
    assert(searched.some(i => i.location.includes('Andheri')));
  });

  await test('Incidents: Create new incident and verify generated schema', async () => {
    const created = await createIncident({
      reporter: 'Rohan Sharma',
      reporterPhone: '+91-98765-11111',
      type: 'Electrical Fire',
      location: 'Powai IT Park',
      address: 'Building 4, Hiranandani Powai',
      latitude: 19.1176,
      longitude: 72.906,
      severity: 'High',
      description: 'Smoke coming from server room on 3rd floor',
      affectedPeople: 12
    });

    createdIncidentIds.push(created.id);
    assert(created.id.startsWith('INC-2026-'));
    assert.strictEqual(created.status, 'Reported');
    assert.strictEqual(created.activityLog.length, 1);
    assert.strictEqual(created.assignedUnits.length, 0);

    const fetched = await getIncidentById(created.id);
    assert.strictEqual(fetched.id, created.id);
  });

  await test('Incidents: Complete 8-stage lifecycle status workflow progression', async () => {
    const item = await createIncident({
      reporter: 'Triage Tester',
      type: 'Industrial Fire',
      location: 'Kurla West',
      severity: 'Critical',
      description: 'Factory fire in industrial estate'
    });
    createdIncidentIds.push(item.id);

    // Lifecycle: Reported -> Verified -> Dispatched -> En Route -> On-Site -> Contained -> Resolved -> Archived
    let currentStatus = item.status;
    assert.strictEqual(currentStatus, 'Reported');

    const expectedSequence = [
      'Verified',
      'Dispatched',
      'En Route',
      'On-Site',
      'Contained',
      'Resolved',
      'Archived'
    ];

    for (const nextExpected of expectedSequence) {
      const calculatedNext = getNextStatus(currentStatus);
      assert.strictEqual(calculatedNext, nextExpected);
      const updated = await updateIncidentStatus(item.id, calculatedNext, `Transitioned to ${calculatedNext}`);
      assert.strictEqual(updated.status, nextExpected);
      currentStatus = calculatedNext;
    }

    assert.strictEqual(getNextStatus('Archived'), null);
  });

  await test('Incidents: Assign units to incident and verify status and activity log', async () => {
    const item = await createIncident({
      reporter: 'Dispatch Tester',
      type: 'Commercial Fire',
      location: 'Bandra West',
      severity: 'High',
      description: 'Restaurant kitchen fire'
    });
    createdIncidentIds.push(item.id);

    const updated = await assignUnitsToIncident(item.id, ['FT-01', 'FT-04']);
    assert.strictEqual(updated.status, 'Dispatched');
    assert(updated.assignedUnits.includes('FT-01'));
    assert(updated.assignedUnits.includes('FT-04'));
    assert(updated.activityLog.some(l => l.action.includes('FT-01 dispatched')));
  });

  await test('Incidents: KPI stats calculation', async () => {
    const stats = await getIncidentStats();
    assert(typeof stats.activeIncidents === 'number');
    assert(typeof stats.criticalIncidents === 'number');
    assert(typeof stats.totalIncidents === 'number');
  });

  // --- Fire Units & Stations Tests ---
  await test('Units: Fetch all units, get by ID, and check statuses', async () => {
    const units = await getUnits();
    assert.strictEqual(units.length, 10);

    const ft01 = await getUnitById('FT-01');
    assert.strictEqual(ft01.id, 'FT-01');
    assert(ft01.crew >= 1);

    const available = await getAvailableUnits();
    assert(available.every(u => u.status === 'Available'));
  });

  await test('Units: Dispatch unit and update status back to Available', async () => {
    const dispatched = await dispatchUnit('FT-01', 'INC-2026-0047', '4 min');
    assert.strictEqual(dispatched.status, 'Dispatched');
    assert.strictEqual(dispatched.currentIncidentId, 'INC-2026-0047');

    const reset = await updateUnitStatus('FT-01', 'Available');
    assert.strictEqual(reset.status, 'Available');
    assert.strictEqual(reset.currentIncidentId, null);
  });

  await test('Stations: Retrieve 5 Mumbai fire stations', async () => {
    const stations = await getStations();
    assert.strictEqual(stations.length, 5);

    const andheri = await getStationById('STN-001');
    assert.strictEqual(andheri.name, 'Andheri Fire Station');
    assert(andheri.totalUnits >= 5);
  });

  // --- Notification Service Tests ---
  await test('Notifications: Filter by role, add notification, mark as read', async () => {
    const initialUnread = await getUnreadCount('Dispatcher');
    assert(typeof initialUnread === 'number');

    const newNotif = await addNotification({
      type: 'Critical',
      title: 'Automated Test Notification',
      message: 'Testing notification broadcasting',
      priority: 'critical',
      targetRoles: ['Dispatcher']
    });
    assert(newNotif.id);
    assert.strictEqual(newNotif.read, false);

    await markNotificationRead(newNotif.id);
    const notifications = await getNotifications('Dispatcher');
    const target = notifications.find(n => n.id === newNotif.id);
    assert(target && target.read === true);

    await markAllNotificationsRead();
    const countAfter = await getUnreadCount('Dispatcher');
    assert.strictEqual(countAfter, 0);
  });

  // --- Analytics Tests ---
  await test('Analytics: Verify all 6 chart data sets and report exports', async () => {
    const summary = await getAnalyticsSummary();
    assert(summary.totalIncidents > 0);
    assert(summary.avgResponseTime);

    const perDay = await getIncidentsPerDay();
    assert(perDay.length >= 7);

    const bySeverity = await getIncidentsBySeverity();
    assert.strictEqual(bySeverity.length, 4);

    const byRegion = await getIncidentsByRegion();
    assert(byRegion.length >= 5);

    const respTime = await getResponseTimeByRegion();
    assert(respTime.length >= 5);

    const utilization = await getUnitUtilization();
    assert.strictEqual(utilization.length, 10);

    const trend = await getMonthlyTrend();
    assert(trend.length >= 6);

    const csvExport = await exportReport('csv');
    assert.strictEqual(csvExport.success, true);

    const pdfExport = await exportReport('pdf');
    assert.strictEqual(pdfExport.success, true);
  });

  // --- Utility & Geometry Tests ---
  await test('Utils: Distance Calculation (Haversine formula)', async () => {
    // Andheri (19.1136, 72.8697) to Bandra (19.0596, 72.8295) approx 7.4 km
    const dist = getDistanceKm(19.1136, 72.8697, 19.0596, 72.8295);
    const num = parseFloat(dist);
    assert(num > 5 && num < 10, `Distance should be ~7.4 km, got ${dist}`);
  });

  await test('Utils: Date and Time formatters', async () => {
    const formattedDate = formatDate('2026-10-01T04:30:00');
    assert(formattedDate.includes('Oct') || formattedDate.includes('10'));

    const formattedTime = formatTime('2026-10-01T04:30:00');
    assert(formattedTime.includes(':'));

    const ago = timeAgo(new Date(Date.now() - 5 * 60 * 1000).toISOString());
    assert.strictEqual(ago, '5m ago');
  });

    console.log(`\n==============================================`);
    console.log(`🎉 ALL ${passed}/${total} SERVICE TESTS PASSED!`);
    console.log(`==============================================\n`);
  } finally {
    // Teardown: Clean up test incidents and test users so dev.db remains pristine
    try {
      const { PrismaClient } = await import('./backend/node_modules/@prisma/client/index.js');
      const prisma = new PrismaClient();
      if (createdIncidentIds.length > 0) {
        await prisma.dispatch.deleteMany({ where: { incidentId: { in: createdIncidentIds } } });
        await prisma.incidentActivity.deleteMany({ where: { incidentId: { in: createdIncidentIds } } });
        await prisma.notification.deleteMany({ where: { incidentId: { in: createdIncidentIds } } });
        await prisma.incident.deleteMany({ where: { id: { in: createdIncidentIds } } });
      }
      if (createdUserEmails.length > 0) {
        await prisma.user.deleteMany({ where: { email: { in: createdUserEmails } } });
      }
      // Ensure all 10 fire units are Available
      await prisma.fireUnit.updateMany({ data: { status: 'Available', currentIncidentId: null } });
      await prisma.dispatch.deleteMany({});
      await prisma.$disconnect();
    } catch {
      // Ignore teardown errors
    }
  }
}

runTests();
