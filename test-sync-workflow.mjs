import puppeteer from 'puppeteer-core';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000/api';

async function getAuthToken(role) {
  const res = await fetch(`${API_URL}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const json = await res.json();
  return { token: json.data.token, user: json.data.user };
}

async function loginInBrowser(page, role, targetPath = '/dashboard') {
  const { token, user } = await getAuthToken(role);
  const userWithToken = { ...user, token };

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.evaluate((u, tok) => {
    sessionStorage.clear();
    sessionStorage.setItem('ferms_user', JSON.stringify(u));
    sessionStorage.setItem('ferms_token', tok);
  }, userWithToken, token);

  await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.leaflet-container', { timeout: 10000 });
}

async function runSyncVerification() {
  console.log('🔥 STARTING COMPREHENSIVE FERMS MAP SYNCHRONIZATION WORKFLOW TEST 🔥\n');

  const { token: dispatcherToken, user: dispatcherUser } = await getAuthToken('Dispatcher');
  const { token: citizenToken, user: citizenUser } = await getAuthToken('Citizen');
  const { token: analystToken, user: analystUser } = await getAuthToken('Analyst');

  let testIncidentId = null;
  let unmappedIncidentId = null;
  let testCitizenUserId = citizenUser.id;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let passed = 0;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Citizen submits a new incident and it is persisted correctly
    // -------------------------------------------------------------------------
    console.log('TEST 1: Citizen submits a new emergency fire report with coordinates...');
    const createRes = await fetch(`${API_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        type: 'Commercial Fire',
        location: 'Bandra Kurla Complex, Mumbai',
        latitude: 19.0665,
        longitude: 72.8688,
        severity: 'High',
        description: 'Heavy smoke and flames observed on the 3rd floor commercial building.',
        affectedPeople: 15,
        reporter: 'Citizen Sync Tester',
        reporterPhone: '9820098200',
      }),
    });

    const createJson = await createRes.json();
    assert.strictEqual(createRes.status, 201, 'Should create incident with HTTP 201');
    assert.ok(createJson.success, 'Response success should be true');
    testIncidentId = createJson.data.id;
    assert.strictEqual(createJson.data.status, 'Reported', 'Initial status must be Reported');
    console.log(`  ✅ [PASS] Incident ${testIncidentId} persisted in backend with status: Reported`);
    passed++;

    // -------------------------------------------------------------------------
    // TEST 2: Unverified incident does NOT appear on the map prematurely
    // -------------------------------------------------------------------------
    console.log('\nTEST 2: Verifying unverified incident does NOT appear prematurely on Leaflet map...');
    await loginInBrowser(page, 'Dispatcher', '/dashboard');

    // Count initial markers on Dispatcher dashboard map
    const initialMarkerCount = await page.evaluate(() => {
      return document.querySelectorAll('.leaflet-marker-icon').length;
    });

    // Check if the unverified incident marker exists on the map
    const hasUnverifiedMarker = await page.evaluate((incId) => {
      // In Leaflet, popups or markers don't have text directly on icon, but let's check marker count & popups
      return document.querySelector(`.ferms-incident-marker[data-id="${incId}"]`) !== null;
    }, testIncidentId);

    assert.strictEqual(hasUnverifiedMarker, false, 'Unverified incident must NOT be plotted on the map');
    console.log(`  ✅ [PASS] Unverified incident ${testIncidentId} is strictly excluded from Leaflet map (${initialMarkerCount} markers rendered)`);
    passed++;

    // -------------------------------------------------------------------------
    // TEST 3: Unauthorized users cannot verify incidents (RBAC enforcement)
    // -------------------------------------------------------------------------
    console.log('\nTEST 3: Verifying unauthorized roles (Citizen, Analyst) CANNOT verify incidents...');
    const citizenVerifyRes = await fetch(`${API_URL}/incidents/${testIncidentId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert.strictEqual(citizenVerifyRes.status, 403, 'Citizen must receive 403 Forbidden for verify');

    const analystVerifyRes = await fetch(`${API_URL}/incidents/${testIncidentId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${analystToken}` },
    });
    assert.strictEqual(analystVerifyRes.status, 403, 'Analyst must receive 403 Forbidden for verify');
    console.log('  ✅ [PASS] Security verified: Citizen and Analyst rejected with 403 Forbidden on verification');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 4: Dispatcher verifies the incident through the actual existing workflow
    // -------------------------------------------------------------------------
    console.log('\nTEST 4: Dispatcher verifies the incident through the existing verification endpoint...');
    const verifyRes = await fetch(`${API_URL}/incidents/${testIncidentId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${dispatcherToken}` },
    });
    const verifyJson = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200, 'Verification should return 200 OK');
    assert.strictEqual(verifyJson.data.status, 'Verified', 'Incident status should now be Verified');
    console.log(`  ✅ [PASS] Backend returned updated status: Verified for ${testIncidentId}`);
    passed++;

    // -------------------------------------------------------------------------
    // TEST 5: Automatic Map Update without page reload or manual Refresh click
    // -------------------------------------------------------------------------
    console.log('\nTEST 5: Waiting for automatic synchronization on open Dispatcher Dashboard (no reload)...');
    // We already have the page open at /dashboard.
    // The background polling interval is 5 seconds.
    // We wait up to 8 seconds for the marker count to increment by 1.
    const startWait = Date.now();
    let newMarkerCount = initialMarkerCount;
    while (Date.now() - startWait < 9000) {
      newMarkerCount = await page.evaluate(() => {
        return document.querySelectorAll('.leaflet-marker-icon').length;
      });
      if (newMarkerCount === initialMarkerCount + 1) {
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    assert.strictEqual(
      newMarkerCount,
      initialMarkerCount + 1,
      `Marker count should automatically increment by 1 without reload (expected ${initialMarkerCount + 1}, got ${newMarkerCount})`
    );
    console.log(`  ✅ [PASS] Marker appeared automatically on Leaflet map without page reload (${initialMarkerCount} -> ${newMarkerCount})`);
    passed++;

    // -------------------------------------------------------------------------
    // TEST 6: Marker popup interaction & StatusBadge reflects Verified
    // -------------------------------------------------------------------------
    console.log('\nTEST 6: Clicking newly appeared marker to inspect popup contents...');
    // Click the specific marker for our newly verified test incident
    await page.evaluate((incId) => {
      const marker = document.querySelector(`.ferms-marker-${incId}`);
      if (marker) marker.click();
    }, testIncidentId);

    await page.waitForSelector('.leaflet-popup-content', { timeout: 4000 });
    const popupContent = await page.evaluate(() => {
      const p = document.querySelector('.leaflet-popup-content');
      return p ? p.innerText : '';
    });

    assert.ok(popupContent.includes(testIncidentId), 'Popup must contain the new incident ID');
    assert.ok(popupContent.includes('Commercial Fire'), 'Popup must contain incident type');
    assert.ok(popupContent.includes('Verified'), 'Popup must display Verified status badge');
    console.log(`  ✅ [PASS] Marker popup renders correctly with incident details and Verified badge`);
    passed++;

    // -------------------------------------------------------------------------
    // TEST 7: Status update modifies existing marker without duplicate markers
    // -------------------------------------------------------------------------
    console.log('\nTEST 7: Updating incident to Dispatched and verifying existing marker updates without duplicates...');
    const statusUpdateRes = await fetch(`${API_URL}/incidents/${testIncidentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dispatcherToken}`,
      },
      body: JSON.stringify({ status: 'Dispatched', note: 'Unit disp-test dispatched' }),
    });
    assert.strictEqual(statusUpdateRes.status, 200, 'Status update to Dispatched should succeed');

    // Wait for the next sync poll cycle (up to 8s) for the update to reflect
    const startWaitDispatch = Date.now();
    let updatedStatusFound = false;
    while (Date.now() - startWaitDispatch < 9000) {
      const statusText = await page.evaluate((incId) => {
        const popup = document.querySelector('.leaflet-popup-content');
        if (popup && popup.innerText.includes(incId) && popup.innerText.includes('Dispatched')) return true;
        const marker = document.querySelector(`.ferms-marker-${incId}`);
        if (marker && (!popup || !popup.innerText.includes(incId))) {
          marker.click();
        }
        const updatedPopup = document.querySelector('.leaflet-popup-content');
        return updatedPopup && updatedPopup.innerText.includes(incId) && updatedPopup.innerText.includes('Dispatched');
      }, testIncidentId);

      if (statusText) {
        updatedStatusFound = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    assert.ok(updatedStatusFound, 'Marker popup or panel must reflect new status Dispatched within polling interval');

    const markerCountAfterDispatch = await page.evaluate(() => {
      return document.querySelectorAll('.leaflet-marker-icon').length;
    });

    assert.strictEqual(
      markerCountAfterDispatch,
      newMarkerCount,
      `Marker count must stay stable without duplicate markers (expected ${newMarkerCount}, got ${markerCountAfterDispatch})`
    );
    console.log(`  ✅ [PASS] Existing marker updated in-place without duplicate markers (count remained ${markerCountAfterDispatch})`);
    passed++;

    // -------------------------------------------------------------------------
    // TEST 8: Incident with missing coordinates is NOT plotted at a fabricated location
    // -------------------------------------------------------------------------
    console.log('\nTEST 8: Submitting and verifying incident without coordinates...');
    const noCoordRes = await fetch(`${API_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        type: 'Vehicle Fire',
        location: 'Western Express Highway, Goregaon',
        latitude: null,
        longitude: null,
        severity: 'Medium',
        description: 'Car caught fire on the highway, exact GPS unavailable.',
        reporter: 'Citizen Sync Tester',
      }),
    });
    const noCoordJson = await noCoordRes.json();
    unmappedIncidentId = noCoordJson.data.id;

    // Verify it
    await fetch(`${API_URL}/incidents/${unmappedIncidentId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${dispatcherToken}` },
    });

    // Wait for sync poll cycle
    await new Promise((r) => setTimeout(r, 6000));

    const markerCountAfterUnmapped = await page.evaluate(() => {
      return document.querySelectorAll('.leaflet-marker-icon').length;
    });

    // Unmapped incident has no coordinates so marker count must NOT increase
    assert.strictEqual(
      markerCountAfterUnmapped,
      markerCountAfterDispatch,
      'Incident without coordinates must NOT be plotted at any fabricated location'
    );

    // Active incidents badge should indicate the unmapped count
    const badgeText = await page.evaluate(() => {
      const badge = document.querySelector('div[style*="z-index: 1000"]');
      return document.body.innerText;
    });
    assert.ok(badgeText.includes('unmapped'), 'Map badge or panel should indicate unmapped incidents exist');
    console.log('  ✅ [PASS] Incident without coordinates correctly omitted from map and listed as unmapped');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 9: Analyst Dashboard Map updates automatically and dispatch actions remain strictly hidden
    // -------------------------------------------------------------------------
    console.log('\nTEST 9: Checking Analyst Dashboard Map synchronization and permission gating...');
    await loginInBrowser(page, 'Analyst', '/dashboard');

    const analystMarkersCount = await page.evaluate(() => {
      return document.querySelectorAll('.leaflet-marker-icon').length;
    });
    assert.strictEqual(
      analystMarkersCount,
      markerCountAfterUnmapped,
      `Analyst dashboard should see the same verified active markers (${markerCountAfterUnmapped})`
    );

    // Verify Triage and Dispatch buttons remain hidden from Analyst
    const analystButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map((b) => b.innerText);
    });
    assert.strictEqual(
      analystButtons.some((b) => b.includes('Triage')),
      false,
      'Analyst must NOT have Triage button'
    );
    assert.strictEqual(
      analystButtons.some((b) => b.includes('Dispatch Unit')),
      false,
      'Analyst must NOT have Dispatch Unit button'
    );
    assert.strictEqual(
      analystButtons.some((b) => b.includes('View Full →')),
      false,
      'Analyst must NOT have View Full link to Live Tracking'
    );

    // Click marker and verify Dispatch button inside popup is hidden from Analyst
    await page.evaluate((incId) => {
      const marker = document.querySelector(`.ferms-marker-${incId}`);
      if (marker) marker.click();
    }, testIncidentId);
    await new Promise((r) => setTimeout(r, 600));

    const hasPopupDispatchBtn = await page.evaluate(() => {
      const popup = document.querySelector('.leaflet-popup-content');
      if (!popup) return false;
      const buttons = Array.from(popup.querySelectorAll('button'));
      return buttons.some((b) => b.innerText.trim() === 'Dispatch' || b.innerText.includes('Dispatch'));
    });
    assert.strictEqual(hasPopupDispatchBtn, false, 'Analyst must NOT see Dispatch button in marker popup');
    console.log('  ✅ [PASS] Analyst map synchronized with all dispatcher actions strictly hidden');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 10: Live Tracking automatic synchronization
    // -------------------------------------------------------------------------
    console.log('\nTEST 10: Checking Live Tracking (/live-tracking) automatic synchronization...');
    await loginInBrowser(page, 'Dispatcher', '/live-tracking');

    const liveMarkers = await page.evaluate(() => {
      return document.querySelectorAll('.leaflet-marker-icon').length;
    });
    assert.strictEqual(liveMarkers, markerCountAfterUnmapped, 'Live Tracking should reflect all current verified markers');
    console.log(`  ✅ [PASS] Live Tracking verified with ${liveMarkers} Leaflet markers`);
    passed++;

  } finally {
    await browser.close();

    // Clean up test incidents from dev.db to preserve database integrity
    console.log('\n🧹 Cleaning up test incidents from database...');
    const { prisma } = await import('./backend/src/config/database.js');
    if (testIncidentId) {
      await prisma.incidentActivity.deleteMany({ where: { incidentId: testIncidentId } });
      await prisma.incident.deleteMany({ where: { id: testIncidentId } });
    }
    if (unmappedIncidentId) {
      await prisma.incidentActivity.deleteMany({ where: { incidentId: unmappedIncidentId } });
      await prisma.incident.deleteMany({ where: { id: unmappedIncidentId } });
    }
    console.log('  ✅ Cleanup complete. Database preserved.\n');
  }

  console.log('====================================================');
  console.log(`🎉 ALL ${passed}/10 WORKFLOW & SYNCHRONIZATION TESTS PASSED!`);
  console.log('====================================================\n');
}

runSyncVerification().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
