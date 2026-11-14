import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  truncateTables,
  seedTestFixtures,
  TEST_USERS,
  TEST_EVENTS,
  TEST_REGISTRATIONS,
  TEST_SEED_PASSWORD,
  disconnectDb
} from '../helpers/db.js';

describe('F-02 Role- and Ownership-based Authorization API', () => {
  const app = createApp();

  beforeEach(async () => {
    await truncateTables();
    await seedTestFixtures();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  async function loginAs(email: string) {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: TEST_SEED_PASSWORD });
    return res.headers['set-cookie'];
  }

  it('TEST-10: (AC-08) all 9 Sprint 1 protected endpoints reject unauthenticated requests with 401 and error-only body', async () => {
    const endpoints = [
      { method: 'get', url: '/api/auth/me' },
      { method: 'get', url: '/api/events' },
      { method: 'get', url: `/api/events/${TEST_EVENTS.e01.id}` },
      { method: 'post', url: '/api/events', body: {} },
      { method: 'get', url: '/api/organizer/events' },
      { method: 'get', url: `/api/events/${TEST_EVENTS.e01.id}/registrations` },
      { method: 'post', url: `/api/events/${TEST_EVENTS.e01.id}/registrations`, body: {} },
      { method: 'get', url: '/api/me/registrations' },
      { method: 'get', url: `/api/registrations/${TEST_REGISTRATIONS.r01.id}` }
    ];

    for (const ep of endpoints) {
      const req = (request(app) as any)[ep.method](ep.url);
      if (ep.body) {
        req.send(ep.body);
      }
      const res = await req;

      expect(res.status, `Endpoint ${ep.method.toUpperCase()} ${ep.url} failed`).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      // Body must contain ONLY ["error"] key (no leaked data fields)
      expect(Object.keys(res.body)).toEqual(['error']);
    }
  });

  it('TEST-11: (AC-09) logged-in STUDENT cannot call organizer operations (403 FORBIDDEN, no rows created)', async () => {
    const studentCookie = await loginAs(TEST_USERS.stu1.email);
    const initialEventsCount = await prisma.event.count();

    // 1. POST /api/events
    const createRes = await request(app)
      .post('/api/events')
      .set('Cookie', studentCookie)
      .send({
        title: 'Hacked Event',
        description: 'Should fail',
        category: 'WORKSHOP',
        location: 'Nowhere',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        endAt: new Date(Date.now() + 90000000).toISOString(),
        registrationDeadline: new Date(Date.now() + 80000000).toISOString(),
        capacity: 10
      });
    expect(createRes.status).toBe(403);
    expect(createRes.body.error.code).toBe('FORBIDDEN');
    expect(await prisma.event.count()).toBe(initialEventsCount);

    // 2. GET /api/organizer/events
    const orgEventsRes = await request(app)
      .get('/api/organizer/events')
      .set('Cookie', studentCookie);
    expect(orgEventsRes.status).toBe(403);
    expect(orgEventsRes.body.error.code).toBe('FORBIDDEN');

    // 3. GET /api/events/:id/registrations
    const rosterRes = await request(app)
      .get(`/api/events/${TEST_EVENTS.e01.id}/registrations`)
      .set('Cookie', studentCookie);
    expect(rosterRes.status).toBe(403);
    expect(rosterRes.body.error.code).toBe('FORBIDDEN');
  });

  it('TEST-12: (AC-10) logged-in ORGANIZER cannot call student operations (403 FORBIDDEN, no rows created)', async () => {
    const organizerCookie = await loginAs(TEST_USERS.org1.email);
    const initialRegCount = await prisma.registration.count();

    // 1. POST /api/events/:id/registrations
    const regRes = await request(app)
      .post(`/api/events/${TEST_EVENTS.e01.id}/registrations`)
      .set('Cookie', organizerCookie)
      .send({});
    expect(regRes.status).toBe(403);
    expect(regRes.body.error.code).toBe('FORBIDDEN');
    expect(await prisma.registration.count()).toBe(initialRegCount);

    // 2. GET /api/me/registrations
    const myRegsRes = await request(app)
      .get('/api/me/registrations')
      .set('Cookie', organizerCookie);
    expect(myRegsRes.status).toBe(403);
    expect(myRegsRes.body.error.code).toBe('FORBIDDEN');
  });

  it('TEST-13: (AC-11) organizer cannot access roster of another organizer event (403 NOT_EVENT_OWNER)', async () => {
    // E-01 is owned by org1. Log in as org2 and attempt to view roster of E-01.
    const org2Cookie = await loginAs(TEST_USERS.org2.email);

    const rosterRes = await request(app)
      .get(`/api/events/${TEST_EVENTS.e01.id}/registrations`)
      .set('Cookie', org2Cookie);

    expect(rosterRes.status).toBe(403);
    expect(rosterRes.body.error.code).toBe('NOT_EVENT_OWNER');
    expect(rosterRes.body.registrations).toBeUndefined();
  });

  it('TEST-14: (AC-12) accessing another student registration returns 404 NOT_FOUND (DEC-14)', async () => {
    // R-01 belongs to stu2. Log in as stu1.
    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    // 1. GET /api/registrations/R-01 as stu1
    const regRes = await request(app)
      .get(`/api/registrations/${TEST_REGISTRATIONS.r01.id}`)
      .set('Cookie', stu1Cookie);

    expect(regRes.status).toBe(404);
    expect(regRes.body.error.code).toBe('NOT_FOUND');

    // 2. GET /api/me/registrations as stu1 must not contain R-01
    const myRegsRes = await request(app)
      .get('/api/me/registrations')
      .set('Cookie', stu1Cookie);

    expect(myRegsRes.status).toBe(200);
    const regIds = myRegsRes.body.registrations.map((r: any) => r.id);
    expect(regIds).not.toContain(TEST_REGISTRATIONS.r01.id);
  });

  it('TEST-15: (AC-13) client identity spoofing rejected with 400 VALIDATION_ERROR (DEC-15)', async () => {
    const org1Cookie = await loginAs(TEST_USERS.org1.email);
    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    const initialEventsCount = await prisma.event.count();
    const initialRegCount = await prisma.registration.count();

    // 1. org1 attempts to create event with spoofed organizerId: org2.id
    const spoofEventRes = await request(app)
      .post('/api/events')
      .set('Cookie', org1Cookie)
      .send({
        title: 'Spoofed Organizer Event',
        description: 'Should fail validation',
        category: 'WORKSHOP',
        location: 'Nowhere',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        endAt: new Date(Date.now() + 90000000).toISOString(),
        registrationDeadline: new Date(Date.now() + 80000000).toISOString(),
        capacity: 10,
        organizerId: TEST_USERS.org2.id // Spoofed field
      });

    expect(spoofEventRes.status).toBe(400);
    expect(spoofEventRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(await prisma.event.count()).toBe(initialEventsCount);

    // 2. stu1 attempts to register with spoofed studentId: stu2.id
    const spoofRegRes = await request(app)
      .post(`/api/events/${TEST_EVENTS.e01.id}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({
        studentId: TEST_USERS.stu2.id // Spoofed field
      });

    expect(spoofRegRes.status).toBe(400);
    expect(spoofRegRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(await prisma.registration.count()).toBe(initialRegCount);
  });
});
