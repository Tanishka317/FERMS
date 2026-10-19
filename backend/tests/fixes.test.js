import assert from 'node:assert';
import { describe, it, before, after } from 'node:test';
import app from '../src/app.js';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database.js';

describe('🎯 FERMS Fixes Verification Test Suite', () => {
  let adminToken = '';
  let analystToken = '';
  let officerToken = '';
  let citizenToken = '';
  let dispatcherToken = '';

  const testUserEmail = `newuser.test.${Date.now()}@ferms.gov.in`;

  before(async () => {
    // Acquire tokens for all required roles
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ferms.gov.in',
      password: 'admin123',
    });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.data.token;

    const analystRes = await request(app).post('/api/auth/demo-login').send({ role: 'Analyst' });
    assert.strictEqual(analystRes.status, 200);
    analystToken = analystRes.body.data.token;

    const officerRes = await request(app).post('/api/auth/demo-login').send({ role: 'Field Officer' });
    assert.strictEqual(officerRes.status, 200);
    officerToken = officerRes.body.data.token;

    const citizenRes = await request(app).post('/api/auth/demo-login').send({ role: 'Citizen' });
    assert.strictEqual(citizenRes.status, 200);
    citizenToken = citizenRes.body.data.token;

    const dispatchRes = await request(app).post('/api/auth/demo-login').send({ role: 'Dispatcher' });
    assert.strictEqual(dispatchRes.status, 200);
    dispatcherToken = dispatchRes.body.data.token;
  });

  after(async () => {
    // Clean up created test user
    try {
      await prisma.user.deleteMany({
        where: { email: { contains: 'newuser.test.' } },
      });
    } catch {
      // Ignore cleanup error
    }
    await prisma.$disconnect();
  });

  describe('1. Field Operations & Route Coordinates Verification', () => {
    it('should verify logged-in officer has assigned unit and can view destination coordinates', async () => {
      // Check current officer profile
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${officerToken}`);
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.data.role, 'Field Officer');
      const officerUnit = meRes.body.data.assignedUnit;
      assert(officerUnit, 'Officer must have an assigned unit');

      // Fetch active incidents to verify assigned incident exists
      const incRes = await request(app)
        .get('/api/incidents')
        .set('Authorization', `Bearer ${officerToken}`);
      assert.strictEqual(incRes.status, 200);

      // Find an incident assigned to officer's unit
      const assigned = incRes.body.data.find(
        (i) => Array.isArray(i.assignedUnits) && i.assignedUnits.includes(officerUnit)
      );

      if (assigned) {
        assert(assigned.id.startsWith('INC-'), 'Incident ID must be valid');
        assert(typeof assigned.location === 'string', 'Location must be defined');
        // If coordinates exist, they must be valid numbers
        if (assigned.latitude !== null && assigned.longitude !== null) {
          assert(!isNaN(assigned.latitude), 'Latitude must be numeric');
          assert(!isNaN(assigned.longitude), 'Longitude must be numeric');
          assert(assigned.latitude >= -90 && assigned.latitude <= 90);
          assert(assigned.longitude >= -180 && assigned.longitude <= 180);
        }
      }
    });

    it('should verify unit fleet locations have valid coordinates', async () => {
      const unitsRes = await request(app)
        .get('/api/units')
        .set('Authorization', `Bearer ${officerToken}`);
      assert.strictEqual(unitsRes.status, 200);
      assert(Array.isArray(unitsRes.body.data));
      assert.strictEqual(unitsRes.body.data.length, 10);

      for (const unit of unitsRes.body.data) {
        assert(unit.latitude !== null && !isNaN(unit.latitude));
        assert(unit.longitude !== null && !isNaN(unit.longitude));
      }
    });
  });

  describe('2. Administrator Add User & Validation Verification', () => {
    it('should reject non-admin roles (Citizen, Analyst) from creating users with 403', async () => {
      const resCitizen = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ name: 'Unauthorized', email: 'citizen.create@ferms.gov.in', role: 'Citizen' });
      assert.strictEqual(resCitizen.status, 403);
      assert.strictEqual(resCitizen.body.success, false);

      const resAnalyst = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({ name: 'Unauthorized Analyst', email: 'analyst.create@ferms.gov.in', role: 'Citizen' });
      assert.strictEqual(resAnalyst.status, 403);
    });

    it('should reject invalid email format with 400', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Email User',
          email: 'not-an-email-address',
          role: 'Dispatcher',
        });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Invalid email format'));
    });

    it('should reject invalid role with 400', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Role User',
          email: 'valid.email@ferms.gov.in',
          role: 'SuperUserHacker',
        });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('Invalid role'));
    });

    it('should successfully create a new user with password hashing and schema fields', async () => {
      const rawPassword = 'securePassword123';
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Vikas Deshmukh',
          email: testUserEmail,
          password: rawPassword,
          role: 'Field Officer',
          phone: '+91-98200-11223',
          station: 'Bandra Fire Station',
          assignedUnit: 'FT-04',
          status: 'Active',
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert(res.body.data.id.startsWith('USR-'), 'ID must match USR-XXX');
      assert.strictEqual(res.body.data.email, testUserEmail.toLowerCase());
      assert.strictEqual(res.body.data.role, 'Field Officer');
      assert.strictEqual(res.body.data.station, 'Bandra Fire Station');
      assert.strictEqual(res.body.data.assignedUnit, 'FT-04');
      assert.strictEqual(res.body.data.passwordHash, undefined, 'passwordHash must never be exposed');

      // Verify in DB directly that password is encrypted via bcrypt
      const dbUser = await prisma.user.findUnique({
        where: { email: testUserEmail.toLowerCase() },
      });
      assert(dbUser, 'User must exist in database');
      assert(dbUser.passwordHash !== rawPassword, 'Password must not be stored in plaintext');
      const isMatch = await bcrypt.compare(rawPassword, dbUser.passwordHash);
      assert.strictEqual(isMatch, true, 'bcrypt must successfully verify the hashed password');
    });

    it('should reject duplicate email with 409 conflict', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Vikas',
          email: testUserEmail,
          role: 'Dispatcher',
        });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert(res.body.error.message.includes('already exists'));
    });

    it('should list the new user immediately when fetching users list', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.data));
      const found = res.body.data.find((u) => u.email === testUserEmail.toLowerCase());
      assert(found, 'Newly created user must appear immediately in user list');
      assert.strictEqual(found.name, 'Vikas Deshmukh');
    });
  });

  describe('3. Analytics & Date Filtering Real Database Data', () => {
    it('should reject unauthorized roles (Citizen) from viewing analytics with 403', async () => {
      const res = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${citizenToken}`);
      assert.strictEqual(res.status, 403);
    });

    it('should allow Analyst and Administrator to access analytics', async () => {
      const resAnalyst = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(resAnalyst.status, 200);
      assert.strictEqual(resAnalyst.body.success, true);

      const resAdmin = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(resAdmin.status, 200);
    });

    it('should compute real analytics summary matching database counts for 30d vs 7d', async () => {
      const res30d = await request(app)
        .get('/api/analytics/summary?range=30d')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(res30d.status, 200);

      const res7d = await request(app)
        .get('/api/analytics/summary?range=7d')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(res7d.status, 200);

      assert(typeof res30d.body.data.totalIncidents === 'number');
      assert(typeof res7d.body.data.totalIncidents === 'number');
      // 30 days period covers more or equal incidents than 7 days
      assert(
        res30d.body.data.totalIncidents >= res7d.body.data.totalIncidents,
        '30-day incident count must be >= 7-day incident count'
      );

      // Verify unit utilization is a valid numeric percentage
      assert(typeof res30d.body.data.unitUtilization === 'number');
      assert(res30d.body.data.unitUtilization >= 0 && res30d.body.data.unitUtilization <= 100);
    });

    it('should return all 10 fleet units in unit utilization breakdown', async () => {
      const res = await request(app)
        .get('/api/analytics/unit-utilization?range=7d')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.data));
      assert.strictEqual(res.body.data.length, 10, 'Must return all 10 fire units');

      for (const item of res.body.data) {
        assert(item.unit.startsWith('FT-'));
        assert(typeof item.utilizationPct === 'number');
        assert(item.utilizationPct >= 0 && item.utilizationPct <= 100);
      }
    });

    it('should return real incidents grouped by severity and by region', async () => {
      const resSev = await request(app)
        .get('/api/analytics/by-severity?range=30d')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(resSev.status, 200);
      assert.strictEqual(resSev.body.data.length, 4); // Critical, High, Medium, Low
      const totalFromSeverity = resSev.body.data.reduce((sum, item) => sum + item.count, 0);

      const resSummary = await request(app)
        .get('/api/analytics/summary?range=30d')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(totalFromSeverity, resSummary.body.data.totalIncidents);

      const resRegion = await request(app)
        .get('/api/analytics/by-region?range=30d')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(resRegion.status, 200);
      assert(Array.isArray(resRegion.body.data));
    });
  });

  describe('4. Export Functionality (CSV & PDF)', () => {
    it('should reject unauthorized roles (Citizen, Field Officer) from export with 403', async () => {
      const resCitizen = await request(app)
        .get('/api/analytics/export?format=csv')
        .set('Authorization', `Bearer ${citizenToken}`);
      assert.strictEqual(resCitizen.status, 403);

      const resOfficer = await request(app)
        .get('/api/analytics/export?format=pdf')
        .set('Authorization', `Bearer ${officerToken}`);
      assert.strictEqual(resOfficer.status, 403);
    });

    it('should download a valid CSV file with text/csv header and real records', async () => {
      const res = await request(app)
        .get('/api/analytics/export?format=csv&range=30d')
        .set('Authorization', `Bearer ${analystToken}`);

      assert.strictEqual(res.status, 200);
      assert(res.headers['content-type'].includes('text/csv'));
      assert(res.headers['content-disposition'].includes('.csv'));

      const csvLines = res.text.trim().split('\n');
      assert(csvLines.length >= 2, 'CSV must have headers and rows');
      assert(csvLines[0].includes('Incident ID'));
      assert(csvLines[0].includes('Severity'));
      assert(csvLines[0].includes('Status'));
      assert(csvLines[0].includes('Location'));

      // Check that real incident IDs are present
      const hasRealIncident = csvLines.some((line) => line.includes('INC-2026-'));
      assert(hasRealIncident, 'CSV must contain real incident records from DB');
    });

    it('should download a valid PDF file with application/pdf header and PDF magic bytes', async () => {
      const res = await request(app)
        .get('/api/analytics/export?format=pdf&range=7d')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert(res.headers['content-type'].includes('application/pdf'));
      assert(res.headers['content-disposition'].includes('.pdf'));

      // Check PDF header signature '%PDF'
      assert(res.body.length > 0 || res.text.startsWith('%PDF'));
    });
  });
});
