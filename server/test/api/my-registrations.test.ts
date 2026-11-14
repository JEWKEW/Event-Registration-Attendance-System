import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { app, createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  truncateTables,
  seedTestFixtures,
  disconnectDb,
  TEST_USERS,
  TEST_SEED_PASSWORD
} from '../helpers/db.js';
import { loginAs } from '../helpers/auth.js';
import { clock } from '../../src/lib/clock.js';
import { EventCategory, EventStatus, RegistrationStatus } from '@prisma/client';

describe('F-07 My Registrations API', () => {
  beforeEach(async () => {
    await truncateTables();
    await seedTestFixtures();
  });

  afterEach(() => {
    clock.reset();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('TEST-38: (AC-33) stu1 GET /api/me/registrations returns only stu1 registrations ordered by event start_at asc', async () => {
    const now = new Date();

    // Event 1: starts in 48h
    const e1 = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000001',
        organizer_id: TEST_USERS.org1.id,
        title: 'Later Workshop (E1)',
        description: 'Starts in 48 hours',
        category: EventCategory.WORKSHOP,
        location: 'Room 101',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 30,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    // Event 2: starts in 24h (earlier than E1)
    const e2 = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000002',
        organizer_id: TEST_USERS.org1.id,
        title: 'Earlier Seminar (E2)',
        description: 'Starts in 24 hours',
        category: EventCategory.SEMINAR,
        location: 'Auditorium',
        start_at: new Date(now.getTime() + 24 * 3600 * 1000),
        end_at: new Date(now.getTime() + 26 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 12 * 3600 * 1000),
        capacity: 50,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    // Event 5: starts in 72h (registered by stu2)
    const e5 = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000005',
        organizer_id: TEST_USERS.org1.id,
        title: 'Other Event (E5)',
        description: 'Registered by stu2 only',
        category: EventCategory.CAMP,
        location: 'Field',
        start_at: new Date(now.getTime() + 72 * 3600 * 1000),
        end_at: new Date(now.getTime() + 74 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 48 * 3600 * 1000),
        capacity: 20,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    // stu1 registers on E1 first, then on E2
    await prisma.registration.create({
      data: {
        id: '20000000-0000-4000-8000-000000000001',
        event_id: e1.id,
        student_id: TEST_USERS.stu1.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: new Date(now.getTime() - 10000)
      }
    });

    await prisma.registration.create({
      data: {
        id: '20000000-0000-4000-8000-000000000002',
        event_id: e2.id,
        student_id: TEST_USERS.stu1.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: new Date(now.getTime() - 5000)
      }
    });

    // stu2 registers on E5
    await prisma.registration.create({
      data: {
        id: '20000000-0000-4000-8000-000000000005',
        event_id: e5.id,
        student_id: TEST_USERS.stu2.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: now
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    const res = await request(app)
      .get('/api/me/registrations')
      .set('Cookie', stu1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.registrations).toBeDefined();
    expect(res.body.registrations).toHaveLength(2);

    // Verify ordering: E2 (earlier start_at) must come before E1 (later start_at)
    const [first, second] = res.body.registrations;
    expect(first.event.id).toBe(e2.id);
    expect(first.event.title).toBe('Earlier Seminar (E2)');
    expect(first.event.location).toBe('Auditorium');
    expect(first.event.startAt).toBe(e2.start_at.toISOString());
    expect(first.event.effectiveStatus).toBe('PUBLISHED');
    expect(first.status).toBe('ACTIVE');
    expect(first.registeredAt).toBeDefined();

    expect(second.event.id).toBe(e1.id);
    expect(second.event.title).toBe('Later Workshop (E1)');
    expect(second.event.location).toBe('Room 101');
    expect(second.event.startAt).toBe(e1.start_at.toISOString());
    expect(second.event.effectiveStatus).toBe('PUBLISHED');
    expect(second.status).toBe('ACTIVE');

    // E5 registered by stu2 must NOT appear
    const eventIds = res.body.registrations.map((r: any) => r.event.id);
    expect(eventIds).not.toContain(e5.id);
  });

  it('TEST-39: (AC-34) persistence across restart: registration retrieved via fresh app instance', async () => {
    const now = new Date();
    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000010',
        organizer_id: TEST_USERS.org1.id,
        title: 'Restart Persistence Event',
        description: 'Testing survival across server restart',
        category: EventCategory.WORKSHOP,
        location: 'Building A',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 25,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    // 1. stu1 registers via instance #1
    const regRes = await request(app)
      .post(`/api/events/${event.id}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({});
    expect(regRes.status).toBe(201);
    const regId = regRes.body.registration.id;
    const initialRegisteredAt = regRes.body.registration.registeredAt;

    // 2. Build a fresh createApp() instance to simulate app process restart (NFR-06)
    const freshApp = createApp();

    // 3. New login on the fresh app instance
    const newLoginRes = await request(freshApp)
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.stu1.email,
        password: TEST_SEED_PASSWORD
      });
    expect(newLoginRes.status).toBe(200);
    const freshCookie = newLoginRes.headers['set-cookie'];

    // 4. Retrieve registration via fresh instance
    const detailRes = await request(freshApp)
      .get(`/api/registrations/${regId}`)
      .set('Cookie', freshCookie);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.registration).toBeDefined();
    expect(detailRes.body.registration.id).toBe(regId);
    expect(detailRes.body.registration.status).toBe('ACTIVE');
    expect(detailRes.body.registration.registeredAt).toBe(initialRegisteredAt);
    expect(detailRes.body.registration.event.id).toBe(event.id);
    expect(detailRes.body.registration.event.title).toBe('Restart Persistence Event');
    expect(detailRes.body.registration.event.location).toBe('Building A');
    expect(detailRes.body.registration.event.effectiveStatus).toBe('PUBLISHED');
  });

  it('returns empty array when student has no active registrations', async () => {
    const stu3Cookie = await loginAs(TEST_USERS.stu3.email);

    const res = await request(app)
      .get('/api/me/registrations')
      .set('Cookie', stu3Cookie);

    expect(res.status).toBe(200);
    expect(res.body.registrations).toEqual([]);
  });

  it('returns 404 NOT_FOUND when accessing non-existent registration ID', async () => {
    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    const res = await request(app)
      .get('/api/registrations/99999999-9999-4999-8999-999999999999')
      .set('Cookie', stu1Cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
