// test-citizen-dashboard-fixes.mjs
// Verification script for Citizen Dashboard, Incident Reports, Statistics, and Tracking fixes

const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('\n--- STARTING CITIZEN DASHBOARD BUG FIX VERIFICATION ---\n');

  let testUserId = null;
  let testIncidentId = null;

  try {
    // Step 1: Register a new citizen
    const testEmail = `citizen_test_${Date.now()}@testferms.org`;
    const testPassword = 'Password123!';
    const testName = 'Rohan Mehra';

  console.log(`1. Testing Registration for new citizen (${testEmail})...`);
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
    }),
  });

  assert(regRes.status === 201, `Registration status 201 (got ${regRes.status})`);
  assert(regRes.data.success === true, 'Registration succeeded');
  assert(regRes.data.data.user.role === 'Citizen', 'Role is Citizen');
  const newCitizen = regRes.data.data.user;
  const newCitizenToken = regRes.data.data.token;
  testUserId = newCitizen.id;

  // Step 2: Bug 1 Verification — New citizen dashboard has NO demo incidents
  console.log('\n2. Testing Bug 1: New citizen account sees NO demo "Kitchen Fire" incident...');
  const newCitizenIncidentsRes = await request('/incidents', {
    headers: { Authorization: `Bearer ${newCitizenToken}` },
  });

  assert(newCitizenIncidentsRes.status === 200, 'GET /incidents returns 200 for new citizen');
  assert(Array.isArray(newCitizenIncidentsRes.data.data), 'Returns an array of incidents');
  assert(newCitizenIncidentsRes.data.data.length === 0, `New citizen has 0 incidents initially (got ${newCitizenIncidentsRes.data.data.length})`);
  const hasKitchenFire = newCitizenIncidentsRes.data.data.some(i => i.id === 'INC-2026-0022' || i.type === 'Kitchen Fire');
  assert(!hasKitchenFire, 'New citizen does NOT see the demo "Kitchen Fire" incident');

  // Step 3: Demo account verification — Anita Desai still sees her demo incidents
  console.log('\n3. Testing Demo citizen account (Anita Desai) preservation...');
  const demoLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'citizen@example.com',
      password: 'citizen123',
    }),
  });

  assert(demoLoginRes.status === 200, 'Demo citizen login succeeds');
  const demoToken = demoLoginRes.data.data.token;
  const demoIncidentsRes = await request('/incidents', {
    headers: { Authorization: `Bearer ${demoToken}` },
  });

  assert(demoIncidentsRes.status === 200, 'Demo citizen GET /incidents returns 200');
  const demoKitchenFire = demoIncidentsRes.data.data.find(i => i.id === 'INC-2026-0022');
  assert(Boolean(demoKitchenFire), 'Demo citizen Anita Desai sees her demo Kitchen Fire (INC-2026-0022)');
  if (demoKitchenFire) {
    assert(demoKitchenFire.type === 'Kitchen Fire', 'Demo incident type is Kitchen Fire');
    assert(demoKitchenFire.status === 'Resolved', 'Demo incident status is Resolved');
  }

  // Step 4: Bug 2 Verification — Reporting an incident saves and associates it to the citizen
  console.log('\n4. Testing Bug 2: Citizen reporting new incident and dynamic dashboard updates...');
  const newIncidentPayload = {
    type: 'Electrical Fire',
    location: 'Bandra West, Hill Road',
    address: 'Near Mehboob Studio, Bandra West, Mumbai',
    severity: 'High',
    description: 'Electric transformer sparking violently with heavy smoke billowing into apartments.',
    reporter: testName,
    reporterPhone: '+91 98200 12345',
    affectedPeople: 4,
  };

  const createRes = await request('/incidents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${newCitizenToken}` },
    body: JSON.stringify(newIncidentPayload),
  });

  assert(createRes.status === 201, `Incident created with status 201 (got ${createRes.status})`);
  assert(createRes.data.success === true, 'Incident creation success is true');
  const createdIncident = createRes.data.data;
  testIncidentId = createdIncident.id;
  assert(Boolean(createdIncident.id), `Generated Incident ID: ${createdIncident?.id}`);
  assert(createdIncident.reporterId === newCitizen.id, `Incident reporterId matches new citizen ID (${createdIncident.reporterId})`);
  assert(createdIncident.status === 'Reported', `Initial status is 'Reported'`);

  // Step 5: Verify new citizen dashboard fetches the newly reported incident & stats update
  console.log('\n5. Verifying new citizen incident list and statistics calculation...');
  const updatedListRes = await request('/incidents', {
    headers: { Authorization: `Bearer ${newCitizenToken}` },
  });

  assert(updatedListRes.status === 200, 'GET /incidents returns 200');
  const citizenReports = updatedListRes.data.data;
  assert(citizenReports.length === 1, `Citizen now has exactly 1 report (got ${citizenReports.length})`);
  assert(citizenReports[0].id === createdIncident.id, `Reported incident ID matches (${citizenReports[0]?.id})`);
  assert(citizenReports[0].type === 'Electrical Fire', 'Type matches');
  assert(citizenReports[0].location === 'Bandra West, Hill Road', 'Location matches');
  assert(citizenReports[0].severity === 'High', 'Severity matches');
  assert(citizenReports[0].status === 'Reported', 'Status matches');

  // Calculate dynamic stats
  const total = citizenReports.length;
  const active = citizenReports.filter(i => !['Resolved', 'Archived'].includes(i.status)).length;
  const resolved = citizenReports.filter(i => ['Resolved', 'Archived'].includes(i.status)).length;
  assert(total === 1, `Dynamic stat: Total reports = ${total}`);
  assert(active === 1, `Dynamic stat: Active reports = ${active}`);
  assert(resolved === 0, `Dynamic stat: Resolved reports = ${resolved}`);

  // Step 6: Bug 3 Verification — Tracking incident and authorization security
  console.log('\n6. Testing Bug 3: Citizen incident tracking & strict cross-user authorization...');

  // 6a: New citizen tracks their own incident -> 200 OK
  const trackOwnRes = await request(`/incidents/${createdIncident.id}`, {
    headers: { Authorization: `Bearer ${newCitizenToken}` },
  });
  assert(trackOwnRes.status === 200, `Citizen tracking their own incident returns 200 (got ${trackOwnRes.status})`);
  assert(trackOwnRes.data.data.id === createdIncident.id, 'Tracking returns correct incident ID');
  assert(Array.isArray(trackOwnRes.data.data.activityLog), 'Activity log is provided for tracking');
  assert(trackOwnRes.data.data.activityLog.length > 0, 'Activity log contains report entry');
  assert(trackOwnRes.data.data.status === 'Reported', 'Status is Reported');
  assert(Array.isArray(trackOwnRes.data.data.assignedUnits), 'Assigned units array provided');

  // 6b: New citizen attempts to track Anita Desai's incident (INC-2026-0022) -> 403 Forbidden
  const unauthorizedRes = await request('/incidents/INC-2026-0022', {
    headers: { Authorization: `Bearer ${newCitizenToken}` },
  });
  assert(unauthorizedRes.status === 403, `Accessing another user's incident returns 403 Forbidden (got ${unauthorizedRes.status})`);
  assert(unauthorizedRes.data.success === false, 'unauthorized response success is false');
  assert(Boolean(unauthorizedRes.data.error?.message), `Error message returned: "${unauthorizedRes.data.error?.message}"`);

  // 6c: Anita Desai tracks her own incident -> 200 OK
  const demoTrackRes = await request('/incidents/INC-2026-0022', {
    headers: { Authorization: `Bearer ${demoToken}` },
  });
  assert(demoTrackRes.status === 200, `Anita Desai tracking her own incident returns 200`);

  // 6d: Administrator can track both incidents -> 200 OK
  const adminLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@ferms.gov.in', password: 'admin123' }),
  });
  const adminToken = adminLoginRes.data.data.token;

  const adminTrack1 = await request(`/incidents/${createdIncident.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminTrack2 = await request('/incidents/INC-2026-0022', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminTrack1.status === 200, 'Admin can view new citizen incident (200)');
  assert(adminTrack2.status === 200, 'Admin can view demo incident (200)');

    console.log('\n--- SUMMARY ---');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    // Teardown: Clean up test incident and user so dev.db remains clean
    try {
      const { PrismaClient } = await import('./backend/node_modules/@prisma/client/index.js');
      const prisma = new PrismaClient();
      if (testIncidentId) {
        await prisma.dispatch.deleteMany({ where: { incidentId: testIncidentId } });
        await prisma.incidentActivity.deleteMany({ where: { incidentId: testIncidentId } });
        await prisma.notification.deleteMany({ where: { incidentId: testIncidentId } });
        await prisma.incident.deleteMany({ where: { id: testIncidentId } });
      }
      if (testUserId) {
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
      await prisma.$disconnect();
    } catch {
      // Ignore cleanup error
    }
  }
}

run().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
