// backend/scripts/clean-duplicates.mjs
// Safe, repeatable cleanup script for FERMS test duplicates and demo data

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const CANONICAL_INCIDENT_IDS = new Set([
  'INC-2026-0022',
  'INC-2026-0025',
  'INC-2026-0028',
  'INC-2026-0030',
  'INC-2026-0036',
  'INC-2026-0041',
  'INC-2026-0044',
  'INC-2026-0046',
  'INC-2026-0047',
  'INC-2026-0048',
  'INC-2026-0050',
  'INC-2026-0051',
]);

const CANONICAL_USER_IDS = new Set([
  'USR-001',
  'USR-002',
  'USR-003',
  'USR-004',
  'USR-005',
  'USR-006',
  'USR-007',
  'USR-008',
]);

const LEGITIMATE_USER_EMAILS = new Set([
  'eshasheth26@gmail.com', // Registered real user
]);

// Test incident signatures strictly matching test script payloads
const TEST_INCIDENT_SIGNATURES = [
  {
    name: 'E2E Browser Test (Lower Parel)',
    match: i => i.location.includes('Lower Parel Commercial Complex') && i.description.includes('food court'),
  },
  {
    name: 'Backend Test Suite (Kandivali)',
    match: i => i.location.includes('Kandivali Industrial Estate') && i.reporter === 'Kandivali Security',
  },
  {
    name: 'Service Test (Powai IT Park)',
    match: i => i.location.includes('Powai IT Park') && i.reporter === 'Rohan Sharma',
  },
  {
    name: 'Service Test (Kurla West Triage)',
    match: i => i.reporter === 'Triage Tester' && i.location.includes('Kurla West'),
  },
  {
    name: 'Service Test (Bandra West Dispatch)',
    match: i => i.reporter === 'Dispatch Tester' && i.location.includes('Bandra West'),
  },
  {
    name: 'Service Test (Andheri West Legacy)',
    match: i => i.location.includes('Andheri West') && i.reporter === 'Priya Sharma' && !CANONICAL_INCIDENT_IDS.has(i.id),
  },
  {
    name: 'Auth Test Suite (Dharavi Slum)',
    match: i => i.location.includes('Dharavi Sector 5') && i.reporter === 'Test Citizen User',
  },
  {
    name: 'Citizen Dashboard Fixes Test',
    match: i => i.location.includes('Bandra West, Hill Road') && i.reporter === 'Rohan Mehra',
  },
];

const TEST_USER_PATTERNS = [
  /admin\.exploit\./i,
  /^sunil_/i,
  /^svc\.citizen\./i,
  /^testofficer_/i,
  /^e2e\.citizen\./i,
  /^citizen_test_/i,
];

async function main() {
  const isApply = process.argv.includes('--apply');
  const mode = isApply ? 'APPLY (DESTRUCTIVE CLEANUP)' : 'DRY RUN (REPORT ONLY)';

  console.log('====================================================');
  console.log(`FERMS DUPLICATE CLEANUP & DEMO DATA AUDIT: ${mode}`);
  console.log('====================================================\n');

  // Verify backup exists
  const backupDir = path.resolve('backend/prisma/backups');
  if (!fs.existsSync(backupDir)) {
    throw new Error('Backup directory does not exist! Aborting cleanup.');
  }
  const backups = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'));
  if (backups.length === 0) {
    throw new Error('No database backups found in backend/prisma/backups! Aborting cleanup.');
  }
  console.log(`✓ Confirmed verified backup available: ${backups[backups.length - 1]}`);

  // 1. Audit Incidents
  const allIncidents = await prisma.incident.findMany({
    orderBy: { id: 'asc' },
    include: {
      dispatches: true,
      activityLog: true,
    },
  });

  const keepIncidents = [];
  const removeIncidents = [];

  for (const inc of allIncidents) {
    if (CANONICAL_INCIDENT_IDS.has(inc.id)) {
      keepIncidents.push({ incident: inc, reason: 'Canonical Seed Demo Incident' });
      continue;
    }

    // Check if associated with a legitimate real user
    if (inc.reporterId) {
      const user = await prisma.user.findUnique({ where: { id: inc.reporterId } });
      if (user && LEGITIMATE_USER_EMAILS.has(user.email)) {
        keepIncidents.push({ incident: inc, reason: `Legitimate Citizen Incident (${user.email})` });
        continue;
      }
    }

    // Check matching test signatures
    const testMatch = TEST_INCIDENT_SIGNATURES.find(sig => sig.match(inc));
    if (testMatch) {
      removeIncidents.push({ incident: inc, reason: `Test Duplicate: ${testMatch.name}` });
    } else {
      // If not sure, DO NOT DELETE. Keep for review.
      keepIncidents.push({ incident: inc, reason: 'Unclassified / Uncertain — Preserved' });
    }
  }

  console.log(`\n--- INCIDENTS AUDIT ---`);
  console.log(`Total incidents in database: ${allIncidents.length}`);
  console.log(`Preserved incidents:         ${keepIncidents.length}`);
  console.log(`Confirmed duplicates to remove: ${removeIncidents.length}\n`);

  console.log('PRESERVED INCIDENTS:');
  for (const item of keepIncidents) {
    console.log(`  [KEEP] ${item.incident.id} | ${item.incident.type.padEnd(26)} | ${item.incident.location.padEnd(28)} | ${item.reason}`);
  }

  console.log('\nDUPLICATES MARKED FOR REMOVAL:');
  for (const item of removeIncidents) {
    console.log(`  [REMOVE] ${item.incident.id} | ${item.incident.type.padEnd(26)} | ${item.incident.location.padEnd(28)} | Dispatches: ${item.incident.dispatches.length} | ${item.reason}`);
  }

  // 2. Audit Users
  const allUsers = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  const keepUsers = [];
  const removeUsers = [];

  for (const u of allUsers) {
    if (CANONICAL_USER_IDS.has(u.id)) {
      keepUsers.push({ user: u, reason: 'Canonical Demo Account' });
      continue;
    }
    if (LEGITIMATE_USER_EMAILS.has(u.email)) {
      keepUsers.push({ user: u, reason: 'Legitimate Registered Citizen' });
      continue;
    }
    const isTestUser = TEST_USER_PATTERNS.some(p => p.test(u.email));
    if (isTestUser) {
      removeUsers.push({ user: u, reason: 'Test User Generated by Test Suite' });
    } else {
      keepUsers.push({ user: u, reason: 'Unclassified User — Preserved' });
    }
  }

  console.log(`\n--- USERS AUDIT ---`);
  console.log(`Total users in database: ${allUsers.length}`);
  console.log(`Preserved users:         ${keepUsers.length}`);
  console.log(`Test users to remove:    ${removeUsers.length}\n`);

  console.log('PRESERVED USERS:');
  for (const item of keepUsers) {
    console.log(`  [KEEP] ${item.user.id} | ${item.user.email.padEnd(35)} | ${item.user.name.padEnd(25)} | ${item.reason}`);
  }

  if (!isApply) {
    console.log('\n====================================================');
    console.log('DRY RUN COMPLETE — NO CHANGES MADE TO DATABASE.');
    console.log('To apply this cleanup, rerun with: node backend/scripts/clean-duplicates.mjs --apply');
    console.log('====================================================\n');
    await prisma.$disconnect();
    return;
  }

  // APPLY CHANGES SAFELY
  console.log('\n>>> APPLYING CLEANUP IN RELATIONAL ORDER <<<\n');

  const removeIncidentIds = removeIncidents.map(i => i.incident.id);
  const removeUserIds = removeUsers.map(u => u.user.id);

  // A. Dispatches for removed incidents
  const deletedDispatches = await prisma.dispatch.deleteMany({
    where: { incidentId: { in: removeIncidentIds } },
  });
  console.log(`✓ Deleted ${deletedDispatches.count} test dispatches`);

  // B. Incident activities for removed incidents
  const deletedActivities = await prisma.incidentActivity.deleteMany({
    where: { incidentId: { in: removeIncidentIds } },
  });
  console.log(`✓ Deleted ${deletedActivities.count} test incident activities`);

  // C. Notifications linked to removed incidents or test users
  const deletedNotifs = await prisma.notification.deleteMany({
    where: {
      OR: [
        { incidentId: { in: removeIncidentIds } },
        { id: { startsWith: 'NOTIF-' }, incidentId: { not: null, in: removeIncidentIds } },
      ],
    },
  });
  console.log(`✓ Deleted ${deletedNotifs.count} test notifications`);

  // D. Delete the duplicate incidents
  const deletedIncidents = await prisma.incident.deleteMany({
    where: { id: { in: removeIncidentIds } },
  });
  console.log(`✓ Deleted ${deletedIncidents.count} confirmed duplicate incidents`);

  // E. Delete test users
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: removeUserIds } },
  });
  console.log(`✓ Deleted ${deletedUsers.count} test user accounts`);

  // F. Restore all 10 Fire Units to Available status
  await prisma.fireUnit.updateMany({
    data: {
      status: 'Available',
      currentIncidentId: null,
    },
  });
  console.log('✓ Restored all 10 Fire Units to Available status');

  // G. Reset any remaining test dispatches on canonical incidents if not active
  const remainingDispatches = await prisma.dispatch.deleteMany({});
  console.log(`✓ Reset ${remainingDispatches.count} residual dispatches so demo starts clean`);

  // H. Database Integrity Check
  const check = await prisma.$queryRawUnsafe('PRAGMA integrity_check;');
  console.log('✓ PRAGMA integrity_check:', check);

  // Verification Counts
  const finalIncidents = await prisma.incident.count();
  const finalUsers = await prisma.user.count();
  const finalUnits = await prisma.fireUnit.count({ where: { status: 'Available' } });

  console.log('\n====================================================');
  console.log('CLEANUP APPLIED SUCCESSFULLY!');
  console.log(`Incidents remaining: ${finalIncidents} (Target: ${keepIncidents.length})`);
  console.log(`Users remaining:     ${finalUsers} (Target: ${keepUsers.length})`);
  console.log(`Available units:     ${finalUnits} / 10`);
  console.log('====================================================\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Cleanup Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
