import puppeteer from 'puppeteer-core';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const ROLE_HOME = {
  Administrator: '/dashboard',
  Dispatcher: '/dashboard',
  Analyst: '/dashboard', // we will test Analyst navigating to /dashboard
};

async function loginAs(page, role, targetPath = '/dashboard') {
  const res = await fetch('http://localhost:5000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const json = await res.json();
  const token = json.data.token;
  const userWithToken = { ...json.data.user, token };

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });

  await page.evaluate((u, tok) => {
    sessionStorage.clear();
    sessionStorage.setItem('ferms_user', JSON.stringify(u));
    sessionStorage.setItem('ferms_token', tok);
  }, userWithToken, token);

  await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h2, h3', { timeout: 10000 });
}

async function runVerification() {
  console.log('🗺️  Starting FERMS Google Maps 5-Role/Page Verification in Chrome...\n');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let passed = 0;

  try {
    // 1. Administrator Dashboard
    console.log('1. Checking Administrator Dashboard (/dashboard)...');
    await loginAs(page, 'Administrator', '/dashboard');
    let text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Live Incident Map'), 'Should render Live Incident Map heading');
    assert(text.includes('Active Incidents'), 'Should render Active Incidents panel');
    assert(text.includes('View Full →'), 'Admin should have View Full link');
    assert(text.includes('Triage'), 'Admin should have Triage button');
    assert(text.includes('Dispatch Unit'), 'Admin should have Dispatch Unit button');
    console.log('  ✅ [PASS] Administrator Dashboard verified');
    passed++;

    // 2. Administrator Live Tracking
    console.log('2. Checking Administrator Live Tracking (/live-tracking)...');
    await page.goto(`${BASE_URL}/live-tracking`, { waitUntil: 'networkidle0' });
    text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Live Incident Tracking'), 'Should render Live Incident Tracking');
    assert(text.includes('Active Incidents'), 'Should render Active Incidents panel');
    assert(text.includes('Unit Status'), 'Should render Unit Status');
    console.log('  ✅ [PASS] Administrator Live Tracking verified');
    passed++;

    // 3. Dispatcher Dashboard
    console.log('3. Checking Dispatcher Dashboard (/dashboard)...');
    await loginAs(page, 'Dispatcher', '/dashboard');
    text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Live Incident Map'), 'Should render Live Incident Map');
    assert(text.includes('View Full →'), 'Dispatcher should have View Full link');
    assert(text.includes('Triage'), 'Dispatcher should have Triage button');
    assert(text.includes('Dispatch Unit'), 'Dispatcher should have Dispatch Unit button');
    console.log('  ✅ [PASS] Dispatcher Dashboard verified');
    passed++;

    // 4. Dispatcher Live Tracking
    console.log('4. Checking Dispatcher Live Tracking (/live-tracking)...');
    await page.goto(`${BASE_URL}/live-tracking`, { waitUntil: 'networkidle0' });
    text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Live Incident Tracking'), 'Should render Live Incident Tracking');
    assert(text.includes('Unit Status'), 'Should render Unit Status');
    console.log('  ✅ [PASS] Dispatcher Live Tracking verified');
    passed++;

    // 5. Analyst Dashboard
    console.log('5. Checking Analyst Dashboard (/dashboard)...');
    await loginAs(page, 'Analyst', '/dashboard');
    text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Live Incident Map'), 'Analyst should see Live Incident Map');
    assert(!text.includes('View Full →'), 'Analyst should NOT see View Full link to Live Tracking');
    // Verify Triage and Dispatch buttons are hidden from Analyst
    const hasTriage = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.innerText.includes('Triage'));
    });
    const hasDispatch = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.innerText.includes('Dispatch Unit'));
    });
    assert(!hasTriage, 'Analyst should NOT have Triage button');
    assert(!hasDispatch, 'Analyst should NOT have Dispatch Unit button');
    console.log('  ✅ [PASS] Analyst Dashboard verified (all unauthorized actions strictly hidden)');
    passed++;

    // 6. Security Check: Analyst cannot access /live-tracking
    console.log('6. Security Check: Analyst attempted navigation to /live-tracking...');
    await page.goto(`${BASE_URL}/live-tracking`, { waitUntil: 'networkidle0' });
    const currentUrl = page.url();
    assert(!currentUrl.includes('/live-tracking'), 'Analyst must be redirected away from /live-tracking');
    console.log('  ✅ [PASS] Analyst strictly prevented from accessing /live-tracking (redirected to ' + currentUrl + ')');
    passed++;

    console.log(`\n==============================================`);
    console.log(`🎉 ALL ${passed}/6 MAP & RBAC VERIFICATIONS PASSED!`);
    console.log(`==============================================\n`);
  } finally {
    await browser.close();
  }
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
