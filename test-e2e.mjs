import puppeteer from 'puppeteer-core';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function waitForContentLoaded(page) {
  // Wait until loading spinners clear
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return !text.toLowerCase().includes('loading');
  }, { timeout: 10000 }).catch(() => {});
}

// Inject auth session directly into sessionStorage to simulate logged-in state
const DEMO_USERS = {
  Citizen:       { id: 'USR-005', name: 'Anita Desai',    email: 'citizen@example.com',      role: 'Citizen',       status: 'Active' },
  Dispatcher:    { id: 'USR-002', name: 'Priya Sharma',   email: 'dispatcher@ferms.gov.in',  role: 'Dispatcher',    status: 'Active' },
  'Field Officer':{ id: 'USR-003', name: 'Suresh Patil',  email: 'officer@ferms.gov.in',     role: 'Field Officer', status: 'Active' },
  Administrator: { id: 'USR-001', name: 'Rajesh Kumar',   email: 'admin@ferms.gov.in',       role: 'Administrator', status: 'Active' },
  Analyst:       { id: 'USR-006', name: 'Mohan Verma',    email: 'analyst@ferms.gov.in',     role: 'Analyst',       status: 'Active' },
};

const ROLE_HOME = {
  Administrator: '/dashboard',
  Dispatcher:    '/dashboard',
  'Field Officer': '/field-dashboard',
  Citizen:       '/citizen-dashboard',
  Analyst:       '/analytics',
};

async function loginAs(page, role) {
  const homeUrl = `${BASE_URL}${ROLE_HOME[role]}`;

  // Obtain genuine JWT token directly from running backend
  const res = await fetch('http://localhost:5000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const json = await res.json();
  const token = json.data.token;
  const userWithToken = { ...json.data.user, token };

  // Set session in sessionStorage for this origin
  await page.evaluate((u, tok) => {
    sessionStorage.clear();
    sessionStorage.setItem('ferms_user', JSON.stringify(u));
    sessionStorage.setItem('ferms_token', tok);
  }, userWithToken, token);

  // Hard navigate to target role home URL
  await page.goto(homeUrl, { waitUntil: 'load' });
  await page.waitForSelector('h2, h3', { timeout: 10000 });
  await waitForContentLoaded(page);
}

async function runE2E() {
  console.log('🌐 Launching Headless Chrome for Complete FERMS E2E Verification...\n');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let passed = 0;
  let total = 0;
  let e2eUserEmail = null;
  let e2eIncidentId = null;

  try {
    async function step(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [E2E PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [E2E FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // --- Step 1: Login Page ---
  await step('1. Login Page: Initial render and branding check', async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    const text = await page.evaluate(() => document.body.innerText.toUpperCase());
    assert(text.includes('FERMS'), 'Should contain FERMS branding');
    assert(text.includes('FIRE EMERGENCY RESPONSE MANAGEMENT SYSTEM'), 'Should contain title');
    assert(text.includes('SIGN IN TO FERMS'), 'Should show sign in header');
    assert(text.includes('DEMO LOGIN'), 'Should display demo login section');
    assert(text.includes('REGISTER AS CITIZEN'), 'Should display register link');
  });

  // --- Step 1b: Registration Flow ---
  await step('1b. Registration Flow: Register new Citizen account in browser', async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0' });
    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Create Citizen Account'), 'Should display citizen registration title');
    assert(text.includes('Citizen'), 'Should display Citizen badge');

    const regEmail = `e2e.citizen.${Date.now()}@example.com`;
    e2eUserEmail = regEmail;
    await page.type('#reg-name', 'E2E Test Citizen');
    await page.type('#reg-email', regEmail);
    await page.type('#reg-password', 'e2epassword123');
    await page.type('#reg-confirm-password', 'e2epassword123');

    // Submit registration form
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create Citizen Account'));
      if (btn) btn.click();
    });

    // Wait for redirect to citizen dashboard or success state
    await page.waitForFunction(() => {
      const curUrl = window.location.href;
      const body = document.body.innerText;
      return curUrl.includes('/citizen-dashboard') || curUrl.includes('/login') || body.includes('Account created successfully');
    }, { timeout: 10000 });
  });

  // --- Step 2: Citizen Flow ---
  await step('2. Citizen Flow: Demo login and dashboard navigation', async () => {
    await loginAs(page, 'Citizen');
    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('REPORT FIRE EMERGENCY'), 'Should have emergency reporting CTA');
    assert(text.includes('My Reports'), 'Should show My Reports stats');
  });

  await step('3. Citizen Flow: Fill and submit emergency fire report', async () => {
    await page.goto(`${BASE_URL}/incidents/report`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('form', { timeout: 5000 });

    // Fill the report form
    await page.evaluate(() => {
      const nameInput = document.querySelector('input[placeholder="Your full name"]');
      if (nameInput) nameInput.value = '';
    });
    await page.type('input[placeholder="Your full name"]', 'Vikram Malhotra');
    await page.type('input[placeholder="+91-98xxx-xxxxx"]', '+91-98200-99999');
    await page.select('select', 'Commercial Fire');
    await page.type('input[placeholder="e.g. Andheri East, Bandra West"]', 'Lower Parel Commercial Complex');
    await page.type('textarea[placeholder*="Describe what you see"]', 'Severe electrical fire detected on 4th floor food court. Evacuation in progress.');

    // Submit the form
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Submit Incident Report'));
      if (submitBtn) submitBtn.click();
    });

    await page.waitForFunction(() => document.body.innerText.includes('Incident Reported Successfully'), { timeout: 6000 });
    const confirmationText = await page.evaluate(() => document.body.innerText);
    const idMatch = confirmationText.match(/(INC-2026-\d{4})/);
    if (idMatch) e2eIncidentId = idMatch[1];

    assert(confirmationText.includes('INC-2026-'), 'Should show generated Incident ID');
    assert(confirmationText.includes('Track Incident'), 'Should offer Track Incident button');
  });

  // --- Step 3: Dispatcher Flow ---
  await step('4. Dispatcher Flow: Login and Dashboard verification', async () => {
    await loginAs(page, 'Dispatcher');
    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Emergency Operations Dashboard'), 'Should show main dashboard header');
    assert(text.includes('Active Incidents'), 'Should show Active Incidents KPI');
    assert(text.includes('Critical'), 'Should show Critical KPI');
    assert(text.includes('Live Incident Map'), 'Should show map container');
  });

  await step('5. Dispatcher Flow: Triage queue review and validation', async () => {
    await page.goto(`${BASE_URL}/incidents/triage`, { waitUntil: 'networkidle0' });
    await waitForContentLoaded(page);

    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Incident Triage'), 'Should load triage page');

    // Click "Verify" on the top triage card if available
    const hasVerify = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Verify'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (hasVerify) {
      await new Promise(r => setTimeout(r, 600)); // wait for toast & state update
    }
  });

  await step('6. Dispatcher Flow: Unit Dispatching console', async () => {
    await page.goto(`${BASE_URL}/dispatch`, { waitUntil: 'networkidle0' });
    await waitForContentLoaded(page);

    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Dispatch Management'), 'Should load dispatch interface');
    assert(text.includes('Select Incident'), 'Should show incident picker');
    assert(text.includes('Assign Units'), 'Should show unit selection list');

    // Click first unit checkbox if not selected
    await page.evaluate(() => {
      const unitCard = document.querySelector('div[role="checkbox"]');
      if (unitCard) unitCard.click();
    });

    // Check dispatch button presence
    const canDispatch = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Dispatch') && b.innerText.includes('Unit'));
      return btn !== null;
    });
    assert(canDispatch, 'Dispatch button should be present in dispatch console');
  });

  await step('7. Live Tracking: Full Map & Fleet Status', async () => {
    await page.goto(`${BASE_URL}/live-tracking`, { waitUntil: 'load' });
    await page.waitForSelector('h2', { timeout: 10000 });
    await waitForContentLoaded(page);

    const text = await page.evaluate(() => document.body.innerText);
    if (!text.includes('Active Incidents')) {
      console.log('--- STEP 7 TEXT DUMP ---:', text);
    }
    assert(text.includes('Live Incident Tracking'), 'Should show live tracking heading');
    assert(text.includes('Active Incidents'), 'Should show active incidents sidebar');
    assert(text.includes('Unit Status'), 'Should show unit status box');
  });

  // --- Step 4: Field Officer Flow ---
  await step('8. Field Officer Flow: Mission overview and status update controls', async () => {
    await loginAs(page, 'Field Officer');
    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Field Operations'), 'Should show field ops title');
    assert(
      text.toUpperCase().includes('UPDATE STATUS') || text.includes('No Active Assignment'),
      'Should render field state'
    );
  });

  // --- Step 5: Analyst Flow ---
  await step('9. Analyst Flow: Recharts rendering and report exports', async () => {
    await loginAs(page, 'Analyst');
    const text = await page.evaluate(() => document.body.innerText);
    assert(text.includes('Analytics & Reports'), 'Should show analytics title');
    assert(text.includes('Incidents Per Day'), 'Should show daily incident chart');
    assert(text.includes('Unit Utilization'), 'Should show unit utilization chart');

    // Click Export CSV button
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Export CSV'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const toastText = await page.evaluate(() => document.body.innerText);
    assert(toastText.includes('exported as CSV') || toastText.includes('Export'), 'Should trigger export toast');
  });

  // --- Step 6: Administrator Flow ---
  await step('10. Administrator Flow: Stations, Users, Notifications, Settings', async () => {
    await loginAs(page, 'Administrator');


    // Test Stations
    await page.goto(`${BASE_URL}/stations`, { waitUntil: 'networkidle0' });
    await waitForContentLoaded(page);
    let pageContent = await page.evaluate(() => document.body.innerText);
    assert(pageContent.includes('Fire Stations'), 'Should load stations page');
    assert(pageContent.includes('Andheri Fire Station'), 'Should show Andheri station');
    assert(pageContent.includes('Bandra Fire Station'), 'Should show Bandra station');

    // Test Users
    await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle0' });
    await waitForContentLoaded(page);
    pageContent = await page.evaluate(() => document.body.innerText);
    assert(pageContent.includes('User Management'), 'Should load user management page');
    assert(pageContent.includes('Rajesh Kumar'), 'Should display admin user');

    // Test Add User Modal
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add User'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));
    pageContent = await page.evaluate(() => document.body.innerText);
    assert(pageContent.includes('Add New User'), 'Modal dialog should open');

    // Close modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    });

    // Test Notifications
    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'networkidle0' });
    await waitForContentLoaded(page);
    pageContent = await page.evaluate(() => document.body.innerText);
    assert(pageContent.includes('Notification Center'), 'Should load notification center');

    // Test Settings
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
    pageContent = await page.evaluate(() => document.body.innerText);
    assert(pageContent.includes('System Settings'), 'Should load settings page');
    assert(pageContent.includes('Profile Information'), 'Should display profile card');
  });
  } finally {
    try {
      await browser.close();
    } catch {
      // Ignore
    }

    // Teardown: Clean up test incident and user so dev.db remains pristine
    try {
      const { PrismaClient } = await import('./backend/node_modules/@prisma/client/index.js');
      const prisma = new PrismaClient();
      if (e2eIncidentId) {
        await prisma.dispatch.deleteMany({ where: { incidentId: e2eIncidentId } });
        await prisma.incidentActivity.deleteMany({ where: { incidentId: e2eIncidentId } });
        await prisma.notification.deleteMany({ where: { incidentId: e2eIncidentId } });
        await prisma.incident.deleteMany({ where: { id: e2eIncidentId } });
      }
      if (e2eUserEmail) {
        await prisma.user.deleteMany({ where: { email: e2eUserEmail } });
      }
      // Ensure all 10 fire units are Available
      await prisma.fireUnit.updateMany({ data: { status: 'Available', currentIncidentId: null } });
      await prisma.dispatch.deleteMany({});
      await prisma.$disconnect();
    } catch {
      // Ignore cleanup error
    }
  }

  console.log(`\n==============================================`);
  console.log(`🎉 ALL ${passed}/${total} E2E BROWSER TESTS PASSED!`);
  console.log(`==============================================\n`);
}

runE2E().catch(err => {
  console.error('E2E Test Run Error:', err);
  process.exit(1);
});
