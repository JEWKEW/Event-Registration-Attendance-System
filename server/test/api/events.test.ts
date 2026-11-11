import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { clock } from '../../src/lib/clock.js';
import {
  truncateTables,
  seedTestFixtures,
  TEST_USERS,
  TEST_SEED_PASSWORD,
  disconnectDb
} from '../helpers/db.js';

describe('F-03 Create & Publish Event API', () => {
  const app = createApp();

  beforeEach(async () => {
    clock.reset();
    await truncateTables();
    await seedTestFixtures();
  });

  afterEach(() => {
    clock.reset();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  async function loginAsOrganizer() {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.org1.email, password: TEST_SEED_PASSWORD });
    return res.headers['set-cookie'];
  }

  it('TEST-19: (AC-14) org1 creates valid event: returns 201, row in DB is PUBLISHED, appears in GET /events with remainingSeats', async () => {
    const orgCookie = await loginAsOrganizer();

    const validPayload = {
      title: 'Intro to Git Workshop',
      description: 'Hands-on Git for first-years',
      category: 'WORKSHOP',
      location: 'CB2301, KMUTT',
      startAt: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString(),
      endAt: new Date(Date.now() + 8 * 24 * 3600 * 1000 + 3 * 3600 * 1000).toISOString(),
      registrationDeadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      capacity: 30
    };

    const res = await request(app)
      .post('/api/events')
      .set('Cookie', orgCookie)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.event).toBeDefined();
    expect(res.body.event.title).toBe(validPayload.title);
    expect(res.body.event.status).toBe('PUBLISHED');
    expect(res.body.event.capacity).toBe(30);
    expect(res.body.event.remainingSeats).toBe(30);
    expect(res.body.event.activeCount).toBe(0);
    expect(res.body.event.registrationOpen).toBe(true);

    const eventId = res.body.event.id;

    // Verify in PostgreSQL database
    const dbEvent = await prisma.event.findUnique({ where: { id: eventId } });
    expect(dbEvent).not.toBeNull();
    expect(dbEvent?.organizer_id).toBe(TEST_USERS.org1.id);
    expect(dbEvent?.status).toBe('PUBLISHED');
    expect(dbEvent?.published_at).not.toBeNull();

    // Verify it appears in GET /api/events with remainingSeats = 30
    const listRes = await request(app)
      .get('/api/events')
      .set('Cookie', orgCookie);

    expect(listRes.status).toBe(200);
    const listed = listRes.body.events.find((e: any) => e.id === eventId);
    expect(listed).toBeDefined();
    expect(listed.remainingSeats).toBe(30);
  });

  it('TEST-20: (AC-15) POST event with capacity 0 and 1001 returns 400 with capacity field, DB count unchanged', async () => {
    const orgCookie = await loginAsOrganizer();
    const initialCount = await prisma.event.count();

    const basePayload = {
      title: 'Valid Title Here',
      category: 'SEMINAR',
      location: 'Room 101',
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 90000000).toISOString(),
      registrationDeadline: new Date(Date.now() + 80000000).toISOString()
    };

    // Capacity 0
    const resZero = await request(app)
      .post('/api/events')
      .set('Cookie', orgCookie)
      .send({ ...basePayload, capacity: 0 });

    expect(resZero.status).toBe(400);
    expect(resZero.body.error.code).toBe('VALIDATION_ERROR');
    expect(resZero.body.error.details.some((d: any) => d.field === 'capacity')).toBe(true);

    // Capacity 1001
    const resOver = await request(app)
      .post('/api/events')
      .set('Cookie', orgCookie)
      .send({ ...basePayload, capacity: 1001 });

    expect(resOver.status).toBe(400);
    expect(resOver.body.error.code).toBe('VALIDATION_ERROR');
    expect(resOver.body.error.details.some((d: any) => d.field === 'capacity')).toBe(true);

    expect(await prisma.event.count()).toBe(initialCount);
  });

  it('TEST-21: (AC-16) POST event with invalid schedule returns 400 with fields registrationDeadline / startAt', async () => {
    const orgCookie = await loginAsOrganizer();
    const fixedNow = new Date('2026-11-10T12:00:00.000Z');
    clock.setNow(fixedNow);

    const initialCount = await prisma.event.count();

    // 1. Deadline after start
    const deadlineAfterStartRes = await request(app)
      .post('/api/events')
      .set('Cookie', orgCookie)
      .send({
        title: 'Deadline After Start Event',
        category: 'CAMP',
        location: 'Camp Ground',
        startAt: '2026-11-20T10:00:00.000Z',
        endAt: '2026-11-20T18:00:00.000Z',
        registrationDeadline: '2026-11-20T10:00:01.000Z', // After start!
        capacity: 50
      });

    expect(deadlineAfterStartRes.status).toBe(400);
    expect(deadlineAfterStartRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(deadlineAfterStartRes.body.error.details.some((d: any) => d.field === 'registrationDeadline')).toBe(true);

    // 2. Start in the past
    const startInPastRes = await request(app)
      .post('/api/events')
      .set('Cookie', orgCookie)
      .send({
        title: 'Start In Past Event',
        category: 'CAMP',
        location: 'Camp Ground',
        startAt: '2026-11-09T10:00:00.000Z', // Past!
        endAt: '2026-11-20T18:00:00.000Z',
        registrationDeadline: '2026-11-08T10:00:00.000Z',
        capacity: 50
      });

    expect(startInPastRes.status).toBe(400);
    expect(startInPastRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(startInPastRes.body.error.details.some((d: any) => d.field === 'startAt')).toBe(true);

    expect(await prisma.event.count()).toBe(initialCount);
  });

  it('TEST-22: (AC-17) table-driven validation rejects invalid text/category bodies with 400', async () => {
    const orgCookie = await loginAsOrganizer();

    const validBase = {
      title: 'Valid Event Title',
      description: 'Valid description',
      category: 'SPORTS',
      location: 'Sports Field',
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 90000000).toISOString(),
      registrationDeadline: new Date(Date.now() + 80000000).toISOString(),
      capacity: 25
    };

    const cases = [
      {
        name: 'title < 3 chars',
        payload: { ...validBase, title: 'ab' },
        expectedField: 'title'
      },
      {
        name: 'title > 120 chars',
        payload: { ...validBase, title: 'a'.repeat(121) },
        expectedField: 'title'
      },
      {
        name: 'empty location',
        payload: { ...validBase, location: '' },
        expectedField: 'location'
      },
      {
        name: 'description > 2000 chars',
        payload: { ...validBase, description: 'a'.repeat(2001) },
        expectedField: 'description'
      },
      {
        name: 'invalid category enum',
        payload: { ...validBase, category: 'NON_EXISTENT_CATEGORY' },
        expectedField: 'category'
      }
    ];

    for (const testCase of cases) {
      const res = await request(app)
        .post('/api/events')
        .set('Cookie', orgCookie)
        .send(testCase.payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const details = res.body.error.details;
      expect(Array.isArray(details)).toBe(true);
      expect(details.some((d: any) => d.field === testCase.expectedField)).toBe(true);
    }
  });
});
