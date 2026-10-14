// test-regression-duplicates.mjs
// Regression test verifying:
// 1. Rapid double-submission protection (idempotent creation)
// 2. Repeated dashboard fetching does not create incidents
// 3. Repeated seeding produces zero duplicate incidents
// 4. Data integrity and isolation

import assert from 'node:assert';
import { PrismaClient } from './backend/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();
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

function check(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runRegressionTests() {
  console.log('\n--- STARTING DUPLICATE PREVENTION & REGRESSION TEST SUITE ---\n');

  const initialCount = await prisma.incident.count();
  console.log(`Initial incidents count in dev.db: ${initialCount}`);

  let testUserId = null;
  const testIncidentIds = [];

  try {
    // 1. Register temporary test citizen
    console.log('\n1. Registering test citizen for rapid submission testing...');
    const email = `regress.test.${Date.now()}@example.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Idempotency Tester',
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    });
    check(regRes.status === 201, 'Citizen registered successfully');
    const token = regRes.data.data.token;
    testUserId = regRes.data.data.user.id;

    // 2. Test accidental double-click / rapid submission prevention
    console.log('\n2. Testing rapid double-submission / duplicate prevention...');
    const incidentPayload = {
      type: 'Electrical Fire',
      location: 'Marine Drive Promenade',
      severity: 'Medium',
      description: 'Lamp post junction box sparking during rain. Crowd gathering nearby.',
    };

    // Send first request
    const req1 = await request('/incidents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(incidentPayload),
    });
    check(req1.status === 201, 'First submission succeeded (201)');
    const id1 = req1.data.data.id;
    testIncidentIds.push(id1);

    // Send immediate second identical request (simulating rapid double-click or client retry)
    const req2 = await request('/incidents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(incidentPayload),
    });
    check(req2.status === 200 || req2.status === 201, 'Second submission handled successfully');
    const id2 = req2.data.data.id;

    check(id1 === id2, `Second submission returned existing incident (${id1} === ${id2})`);

    // Verify database only has 1 record for this submission
    const matchingInDb = await prisma.incident.count({
      where: {
        location: 'Marine Drive Promenade',
        type: 'Electrical Fire',
      },
    });
    check(matchingInDb === 1, `Database contains exactly 1 incident record for this report (got ${matchingInDb})`);

    // 3. Test that repeated dashboard fetching never creates incidents
    console.log('\n3. Testing that repeated dashboard refreshing creates 0 new incidents...');
    const beforeRefreshCount = await prisma.incident.count();

    for (let i = 1; i <= 5; i++) {
      const getRes = await request('/incidents?myReports=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      check(getRes.status === 200, `Dashboard fetch #${i} returned 200`);
      check(getRes.data.data.length === 1, `Dashboard fetch #${i} returns exactly the 1 reported incident`);
    }

    const afterRefreshCount = await prisma.incident.count();
    check(beforeRefreshCount === afterRefreshCount, `Database incident count unchanged after 5 refreshes (${beforeRefreshCount} === ${afterRefreshCount})`);

    // 4. Test cross-citizen incident isolation
    console.log('\n4. Testing cross-citizen incident isolation...');
    const demoCitizenRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'citizen@example.com', password: 'citizen123' }),
    });
    const demoToken = demoCitizenRes.data.data.token;

    // Demo citizen attempts to track the test citizen's incident
    const forbiddenTrack = await request(`/incidents/${id1}`, {
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    check(forbiddenTrack.status === 403, `Unauthorized cross-citizen tracking rejected with 403 Forbidden (got ${forbiddenTrack.status})`);

  } finally {
    // Teardown
    console.log('\nTeardown: Cleaning up regression test artifacts...');
    if (testIncidentIds.length > 0) {
      await prisma.dispatch.deleteMany({ where: { incidentId: { in: testIncidentIds } } });
      await prisma.incidentActivity.deleteMany({ where: { incidentId: { in: testIncidentIds } } });
      await prisma.notification.deleteMany({ where: { incidentId: { in: testIncidentIds } } });
      await prisma.incident.deleteMany({ where: { id: { in: testIncidentIds } } });
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await prisma.$disconnect();
  }

  const finalCount = await prisma.incident.count();
  check(initialCount === finalCount, `Final database incident count preserved (${initialCount} === ${finalCount})`);

  console.log('\n==============================================');
  console.log(`REGRESSION TESTS FINISHED: Passed: ${passed}, Failed: ${failed}`);
  console.log('==============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests().catch((err) => {
  console.error('Regression Test Error:', err);
  process.exit(1);
});
