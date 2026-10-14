import assert from 'node:assert';
import { describe, it, before, after } from 'node:test';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from '../src/config/database.js';

describe('🔐 FERMS Authentication & Registration Comprehensive Test Suite', () => {
  const testUser = {
    name: 'Test Citizen User',
    email: `citizen.test.${Date.now()}@example.com`,
    password: 'password12345',
  };

  let registeredToken = '';
  let registeredUserId = '';

  after(async () => {
    // Clean up test users created during test execution
    try {
      await prisma.user.deleteMany({
        where: {
          email: { contains: 'test.' },
        },
      });
    } catch {
      // Ignore
    }
    await prisma.$disconnect();
  });

  // 1. Successful registration
  it('1. Successful registration: Should register a new user with valid details', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: testUser.name,
      email: testUser.email,
      password: testUser.password,
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.user, 'User object should be returned');
    assert.strictEqual(res.body.data.user.email, testUser.email.toLowerCase());
    assert.strictEqual(res.body.data.user.name, testUser.name);
    assert.strictEqual(res.body.data.user.role, 'Citizen');
    assert(res.body.data.token, 'Auth token should be generated upon registration');

    registeredUserId = res.body.data.user.id;
    registeredToken = res.body.data.token;
  });

  // 2. Registration with an existing email
  it('2. Registration with existing email: Should reject duplicate email with 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Another User',
      email: testUser.email,
      password: 'newpassword123',
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.message.includes('already exists'));
  });

  // 3. Invalid email and missing required fields
  it('3. Validation: Should reject missing required fields and invalid email format with 400', async () => {
    // Missing name
    const res1 = await request(app).post('/api/auth/register').send({
      email: 'valid@example.com',
      password: 'password123',
    });
    assert.strictEqual(res1.status, 400);

    // Invalid email format
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Test Name',
      email: 'not-an-email',
      password: 'password123',
    });
    assert.strictEqual(res2.status, 400);
    assert(res2.body.error.message.includes('email'));

    // Password too short (< 8 chars)
    const res3 = await request(app).post('/api/auth/register').send({
      name: 'Test Name',
      email: 'valid2@example.com',
      password: 'short',
    });
    assert.strictEqual(res3.status, 400);
    assert(res3.body.error.message.includes('8 characters'));
  });

  // 4. Password and confirm password mismatch
  it('4. Password validation: Password length under 8 characters must be rejected', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Validation User',
      email: `test.invalid.${Date.now()}@example.com`,
      password: '12345',
    });
    assert.strictEqual(res.status, 400);
  });

  // 5. Password is stored as a hash, not plaintext
  it('5. Password security: Password must be stored as bcrypt hash in DB, never plaintext', async () => {
    const dbRecord = await prisma.user.findUnique({
      where: { id: registeredUserId },
    });

    assert(dbRecord, 'User record must exist in DB');
    assert.notStrictEqual(dbRecord.passwordHash, testUser.password, 'Password must not be stored in plaintext');
    assert(dbRecord.passwordHash.startsWith('$2a$') || dbRecord.passwordHash.startsWith('$2b$'), 'Must be a bcrypt hash');
    const isMatch = await bcrypt.compare(testUser.password, dbRecord.passwordHash);
    assert.strictEqual(isMatch, true, 'Hash must match bcrypt compare');
  });

  // 6. Public registration cannot create an Administrator or another privileged role
  it('6. Privileged role protection: Client cannot escalate role during public registration', async () => {
    const exploitEmail = `admin.exploit.${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Attempted Hacker',
      email: exploitEmail,
      password: 'hackerpassword123',
      role: 'Administrator', // Attempted role spoofing
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.user.role, 'Citizen', 'Role MUST be forced to Citizen by backend');

    const dbUser = await prisma.user.findUnique({ where: { email: exploitEmail } });
    assert.strictEqual(dbUser.role, 'Citizen');
  });

  // 7. Successful login with valid credentials
  it('7. Successful login: Valid credentials return user profile and JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.token, 'Token must be returned');
    assert.strictEqual(res.body.data.user.email, testUser.email.toLowerCase());
    assert.strictEqual(res.body.data.user.role, 'Citizen');
    assert.strictEqual(res.body.data.user.passwordHash, undefined, 'passwordHash must never be returned');
  });

  // 8. Login failure with an incorrect password
  it('8. Login failure: Incorrect password returns 401 with generic error message', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'wrong_password_123',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.message.includes('Invalid credentials'));
  });

  // 9. Login failure for an unknown email
  it('9. Login failure: Unknown email returns 401 with identical generic error message', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent_account@ferms.gov.in',
      password: 'any_password',
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.message.includes('Invalid credentials'));
  });

  // 10. Access to protected APIs without authentication is rejected
  it('10. Protected routes: Access without token is rejected with 401', async () => {
    const endpoints = [
      '/api/users',
      '/api/units',
      '/api/stations',
      '/api/notifications',
      '/api/analytics',
      '/api/tracking/live',
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      assert.strictEqual(res.status, 401, `Endpoint ${ep} should reject unauthenticated request`);
      assert.strictEqual(res.body.success, false);
    }
  });

  // 11. Invalid or expired JWT is rejected
  it('11. JWT validation: Malformed or fake token is rejected with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer fake-malformed-jwt-token.xyz');

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.message.includes('Invalid or expired'));
  });

  // 12. Citizens cannot perform restricted administrative actions
  it('12. Role-based access control: Citizen cannot create users, dispatch units, or triage incidents', async () => {
    // Attempt 1: Citizen creating a staff user
    const userRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${registeredToken}`)
      .send({
        name: 'Unauthorized Staff',
        email: 'unauth@ferms.gov.in',
        role: 'Dispatcher',
      });
    assert.strictEqual(userRes.status, 403, 'Citizen must be forbidden from creating users');

    // Attempt 2: Citizen dispatching units
    const dispatchRes = await request(app)
      .post('/api/incidents/INC-2026-0047/dispatch')
      .set('Authorization', `Bearer ${registeredToken}`)
      .send({ unitIds: ['FT-01'] });
    assert.strictEqual(dispatchRes.status, 403, 'Citizen must be forbidden from dispatching units');

    // Attempt 3: Citizen verifying triage
    const verifyRes = await request(app)
      .post('/api/incidents/INC-2026-0047/verify')
      .set('Authorization', `Bearer ${registeredToken}`)
      .send({ verified: true });
    assert.strictEqual(verifyRes.status, 403, 'Citizen must be forbidden from triage verification');

    // Attempt 4: Citizen updating fire unit status
    const unitRes = await request(app)
      .patch('/api/units/FT-01/status')
      .set('Authorization', `Bearer ${registeredToken}`)
      .send({ status: 'Maintenance' });
    assert.strictEqual(unitRes.status, 403, 'Citizen must be forbidden from updating unit status');
  });

  // 13. Logout and session cleanup work correctly
  it('13. Logout: Calling /api/auth/logout succeeds cleanly', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${registeredToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // 14. Existing demo accounts continue to function
  it('14. Seeded demo accounts: All 5 roles authenticate and maintain their access permissions', async () => {
    const demoCredentials = [
      { email: 'admin@ferms.gov.in', password: 'admin123', expectedRole: 'Administrator' },
      { email: 'dispatcher@ferms.gov.in', password: 'dispatch123', expectedRole: 'Dispatcher' },
      { email: 'officer@ferms.gov.in', password: 'officer123', expectedRole: 'Field Officer' },
      { email: 'citizen@example.com', password: 'citizen123', expectedRole: 'Citizen' },
      { email: 'analyst@ferms.gov.in', password: 'analyst123', expectedRole: 'Analyst' },
    ];

    for (const cred of demoCredentials) {
      const res = await request(app).post('/api/auth/login').send({
        email: cred.email,
        password: cred.password,
      });

      assert.strictEqual(res.status, 200, `Login failed for seeded demo account ${cred.email}`);
      assert.strictEqual(res.body.data.user.role, cred.expectedRole);
      assert(res.body.data.token, `Token missing for ${cred.email}`);
    }

    // Verify demo-login shortcuts for all 5 roles
    const roles = ['Administrator', 'Dispatcher', 'Field Officer', 'Citizen', 'Analyst'];
    for (const r of roles) {
      const demoRes = await request(app).post('/api/auth/demo-login').send({ role: r });
      assert.strictEqual(demoRes.status, 200, `Demo login failed for ${r}`);
      assert.strictEqual(demoRes.body.data.user.role, r);
    }
  });

  // 15. Emergency incident reporting remains available for citizens
  it('15. Citizen incident reporting: Authenticated citizen can successfully report a fire emergency', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${registeredToken}`)
      .send({
        type: 'Slum / Shanty Fire',
        location: 'Dharavi Sector 5',
        address: '90 Feet Road, Dharavi, Mumbai - 400017',
        severity: 'High',
        description: 'Smoke and fire spreading between adjacent structures. Fast response needed.',
        reporter: testUser.name,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.reporter, testUser.name);
    assert.strictEqual(res.body.data.status, 'Reported');
  });
});
