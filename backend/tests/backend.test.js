import assert from 'node:assert';
import { describe, it, before, after } from 'node:test';
import app from '../src/app.js';
import request from 'supertest';
import { prisma } from '../src/config/database.js';

describe('🚨 FERMS Backend API Integration Tests', () => {
  let adminToken = '';
  let dispatcherToken = '';
  let officerToken = '';
  let citizenToken = '';
  let analystToken = '';

  before(async () => {
    // Acquire tokens for all 5 roles
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ferms.gov.in',
      password: 'admin123',
    });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.data.token;

    const dispatchRes = await request(app).post('/api/auth/demo-login').send({
      role: 'Dispatcher',
    });
    assert.strictEqual(dispatchRes.status, 200);
    dispatcherToken = dispatchRes.body.data.token;

    const officerRes = await request(app).post('/api/auth/demo-login').send({
      role: 'Field Officer',
    });
    officerToken = officerRes.body.data.token;

    const citizenRes = await request(app).post('/api/auth/demo-login').send({
      role: 'Citizen',
    });
    citizenToken = citizenRes.body.data.token;

    const analystRes = await request(app).post('/api/auth/demo-login').send({
      role: 'Analyst',
    });
    analystToken = analystRes.body.data.token;
  });

  describe('1. Authentication & RBAC', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@ferms.gov.in',
        password: 'incorrect-password',
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should return authenticated user details via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.role, 'Dispatcher');
      assert.strictEqual(res.body.data.email, 'dispatcher@ferms.gov.in');
    });

    it('should reject unauthenticated requests to protected routes', async () => {
      const res = await request(app).get('/api/incidents');
      assert.strictEqual(res.status, 401);
    });

    it('should reject non-admin access to admin user creation', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          name: 'Hacker',
          email: 'hacker@ferms.gov.in',
          role: 'Administrator',
        });
      assert.strictEqual(res.status, 403);
    });
  });

  describe('2. Incidents & Strict Status Workflow', () => {
    let createdIncidentId = '';

    it('should list incidents with filters', async () => {
      const res = await request(app)
        .get('/api/incidents?severity=Critical')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.data));
      assert(res.body.data.every((i) => i.severity === 'Critical'));
    });

    it('should create an incident with correct schema and INC-YYYY-XXXX format', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'Factory Fire',
          location: 'Kandivali Industrial Estate',
          address: 'Plot 88, Charkop, Kandivali West, Mumbai',
          latitude: 19.205,
          longitude: 72.825,
          severity: 'Critical',
          description: 'Plastics packaging unit caught fire. Dense black smoke visible.',
          reporter: 'Kandivali Security',
          affectedPeople: 18,
        });

      assert.strictEqual(res.status, 201);
      assert(res.body.data.id.startsWith('INC-2026-'));
      assert.strictEqual(res.body.data.status, 'Reported');
      assert.strictEqual(res.body.data.activityLog.length, 1);
      createdIncidentId = res.body.data.id;
    });

    it('should verify incident through dispatcher triage', async () => {
      const res = await request(app)
        .post(`/api/incidents/${createdIncidentId}/verify`)
        .set('Authorization', `Bearer ${dispatcherToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'Verified');
    });

    it('should reject invalid status skip (Verified -> Resolved)', async () => {
      const res = await request(app)
        .patch(`/api/incidents/${createdIncidentId}/status`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({ status: 'Resolved' });

      assert.strictEqual(res.status, 400);
      assert(res.body.error.message.includes('Invalid status transition'));
    });

    it('should transition incident along valid workflow steps', async () => {
      // Verified -> Dispatched
      let res = await request(app)
        .patch(`/api/incidents/${createdIncidentId}/status`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({ status: 'Dispatched', note: 'Units assigned' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'Dispatched');

      // Dispatched -> En Route
      res = await request(app)
        .patch(`/api/incidents/${createdIncidentId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'En Route', note: 'En route with siren' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'En Route');

      // En Route -> On-Site
      res = await request(app)
        .patch(`/api/incidents/${createdIncidentId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'On-Site', note: 'First crew arrived' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'On-Site');

      // On-Site -> Contained
      res = await request(app)
        .patch(`/api/incidents/${createdIncidentId}/status`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({ status: 'Contained', note: 'Perimeter secured' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'Contained');

      // Contained -> Resolved
      res = await request(app)
        .patch(`/api/incidents/${createdIncidentId}/status`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({ status: 'Resolved', note: 'Fire extinguished and site cleared' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'Resolved');
    });

    it('should retrieve incident KPI statistics', async () => {
      const res = await request(app)
        .get('/api/incidents/stats')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(res.status, 200);
      assert(typeof res.body.data.activeIncidents === 'number');
      assert(typeof res.body.data.criticalIncidents === 'number');
    });
  });

  describe('3. Units & Dispatch System', () => {
    it('should list all fire units and available units', async () => {
      const res = await request(app)
        .get('/api/units')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 10);

      const availRes = await request(app)
        .get('/api/units/available')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(availRes.status, 200);
      assert(availRes.body.data.every((u) => u.status === 'Available'));
    });

    it('should dispatch units to an incident and update statuses atomically', async () => {
      // Find open incident
      const incRes = await request(app)
        .get('/api/incidents?status=Verified')
        .set('Authorization', `Bearer ${dispatcherToken}`);

      let targetId = incRes.body.data[0]?.id;
      if (!targetId) {
        // Create one to test
        const newInc = await request(app)
          .post('/api/incidents')
          .set('Authorization', `Bearer ${dispatcherToken}`)
          .send({
            type: 'Commercial Fire',
            location: 'Andheri West',
            severity: 'High',
            description: 'Shop fire in market',
          });
        targetId = newInc.body.data.id;
        await request(app)
          .post(`/api/incidents/${targetId}/verify`)
          .set('Authorization', `Bearer ${dispatcherToken}`);
      }

      const dispatchRes = await request(app)
        .post(`/api/incidents/${targetId}/dispatch`)
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          unitIds: ['FT-01', 'FT-07'],
          eta: '6 min',
        });

      assert.strictEqual(dispatchRes.status, 200);
      assert.strictEqual(dispatchRes.body.data.status, 'Dispatched');
      assert(dispatchRes.body.data.assignedUnits.includes('FT-01'));

      // Check unit status directly
      const unit1 = await request(app)
        .get('/api/units/FT-01')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(unit1.body.data.status, 'Dispatched');
      assert.strictEqual(unit1.body.data.currentIncidentId, targetId);
    });

    it('should reject dispatching units with maintenance status', async () => {
      // Temporarily mark FT-10 as Maintenance to verify guard
      await prisma.fireUnit.update({ where: { id: 'FT-10' }, data: { status: 'Maintenance' } });

      const res = await request(app)
        .post('/api/incidents/INC-2026-0047/dispatch')
        .set('Authorization', `Bearer ${dispatcherToken}`)
        .send({
          unitIds: ['FT-10'],
        });
      assert.strictEqual(res.status, 400);
      assert(res.body.error.message.includes('Maintenance'));

      // Restore FT-10 back to Available
      await prisma.fireUnit.update({ where: { id: 'FT-10' }, data: { status: 'Available' } });
    });
  });

  describe('4. Fire Stations & Users', () => {
    it('should list all fire stations', async () => {
      const res = await request(app)
        .get('/api/stations')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 5);
      assert.strictEqual(res.body.data[0].id, 'STN-001');
    });

    it('should allow Administrator to create and deactivate users', async () => {
      const uniqueEmail = `sunil_${Date.now()}@ferms.gov.in`;
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sunil Gavaskar',
          email: uniqueEmail,
          role: 'Field Officer',
          phone: '+91-98765-99999',
        });
      assert.strictEqual(createRes.status, 201);
      const newUserId = createRes.body.data.id;

      const deactRes = await request(app)
        .patch(`/api/users/${newUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(deactRes.status, 200);
      assert.strictEqual(deactRes.body.data.status, 'Inactive');
    });
  });

  describe('5. Notifications System', () => {
    it('should fetch role-scoped notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.data));
      assert(res.body.data.length > 0);
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app)
        .post('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(res.status, 200);

      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(countRes.status, 200);
      assert.strictEqual(countRes.body.data.count, 0);
    });
  });

  describe('6. Analytics & Reports Export', () => {
    it('should provide full analytics data summary and charts', async () => {
      const res = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(res.status, 200);
      assert(res.body.data.summary);
      assert(Array.isArray(res.body.data.incidentsPerDay));
      assert(Array.isArray(res.body.data.incidentsBySeverity));
      assert(Array.isArray(res.body.data.incidentsByRegion));
      assert(Array.isArray(res.body.data.unitUtilization));
    });

    it('should export CSV report with text/csv content type', async () => {
      const res = await request(app)
        .get('/api/analytics/export?format=csv')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(res.status, 200);
      assert(res.headers['content-type'].includes('text/csv'));
      assert(res.text.includes('Incident ID'));
    });

    it('should export PDF report with application/pdf content type', async () => {
      const res = await request(app)
        .get('/api/analytics/export?format=pdf')
        .set('Authorization', `Bearer ${analystToken}`);
      assert.strictEqual(res.status, 200);
      assert(res.headers['content-type'].includes('application/pdf'));
    });
  });

  describe('7. Live Tracking Feeds', () => {
    it('should provide active incidents with coordinates', async () => {
      const res = await request(app)
        .get('/api/tracking/incidents')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.data));
    });

    it('should provide fleet units with coordinates', async () => {
      const res = await request(app)
        .get('/api/tracking/units')
        .set('Authorization', `Bearer ${dispatcherToken}`);
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body.data));
      assert(res.body.data[0].latitude !== undefined);
    });

    it('should allow updating unit GPS coordinates', async () => {
      const res = await request(app)
        .patch('/api/tracking/units/FT-01/location')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          latitude: 19.115,
          longitude: 72.871,
          location: 'Andheri Metro Junction',
        });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.currentLocation, 'Andheri Metro Junction');
    });
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
