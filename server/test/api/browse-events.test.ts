import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  truncateTables,
  seedTestFixtures,
  disconnectDb,
  TEST_USERS
} from '../helpers/db.js';
import { loginAs } from '../helpers/auth.js';
import { clock } from '../../src/lib/clock.js';
import { EventCategory, EventStatus, RegistrationStatus } from '@prisma/client';

describe('F-05 Browse & View Events API', () => {
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

  it('TEST-26: (AC-23) stu1 GET /events returns only future published events in asc order, excludes ended and cancelled, counts correct', async () => {
    const fixedNow = new Date('2026-11-15T09:00:00.000Z');
    clock.setNow(fixedNow);
    const dayMs = 24 * 60 * 60 * 1000;
    const hourMs = 60 * 60 * 1000;

    // 1. Future Event 1: starts in +2 days (2026-11-17), capacity 30
    const eventFutureFar = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000001',
        organizer_id: TEST_USERS.org1.id,
        title: 'Future Event 2 Days',
        description: 'Starts in two days',
        category: EventCategory.WORKSHOP,
        location: 'CB2301',
        start_at: new Date(fixedNow.getTime() + 2 * dayMs),
        end_at: new Date(fixedNow.getTime() + 2 * dayMs + 2 * hourMs),
        registration_deadline: new Date(fixedNow.getTime() + 1 * dayMs),
        capacity: 30,
        status: EventStatus.PUBLISHED,
        published_at: fixedNow
      }
    });

    // 2. Future Event 2: starts in +1 day (2026-11-16), capacity 1, 1 active registration (FULL)
    const eventFutureNear = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000002',
        organizer_id: TEST_USERS.org1.id,
        title: 'Future Event 1 Day (Full)',
        description: 'Starts in one day, already full',
        category: EventCategory.SEMINAR,
        location: 'Auditorium',
        start_at: new Date(fixedNow.getTime() + 1 * dayMs),
        end_at: new Date(fixedNow.getTime() + 1 * dayMs + 2 * hourMs),
        registration_deadline: new Date(fixedNow.getTime() + 12 * hourMs),
        capacity: 1,
        status: EventStatus.PUBLISHED,
        published_at: fixedNow
      }
    });

    // Active registration on eventFutureNear by stu2 -> makes remainingSeats = 0
    await prisma.registration.create({
      data: {
        id: '30000000-0000-4000-8000-000000000001',
        event_id: eventFutureNear.id,
        student_id: TEST_USERS.stu2.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: fixedNow
      }
    });

    // 3. Ended Event: ended 1 hour ago
    await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000003',
        organizer_id: TEST_USERS.org1.id,
        title: 'Past Ended Event',
        description: 'Already ended',
        category: EventCategory.SPORTS,
        location: 'Gymnasium',
        start_at: new Date(fixedNow.getTime() - 3 * hourMs),
        end_at: new Date(fixedNow.getTime() - 1 * hourMs),
        registration_deadline: new Date(fixedNow.getTime() - 5 * hourMs),
        capacity: 20,
        status: EventStatus.PUBLISHED,
        published_at: new Date(fixedNow.getTime() - 10 * dayMs)
      }
    });

    // 4. CANCELLED Event in the future
    await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000004',
        organizer_id: TEST_USERS.org1.id,
        title: 'Cancelled Future Event',
        description: 'Should not appear',
        category: EventCategory.CAMP,
        location: 'Campground',
        start_at: new Date(fixedNow.getTime() + 3 * dayMs),
        end_at: new Date(fixedNow.getTime() + 4 * dayMs),
        registration_deadline: new Date(fixedNow.getTime() + 2 * dayMs),
        capacity: 50,
        status: EventStatus.CANCELLED,
        published_at: fixedNow
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    const res = await request(app)
      .get('/api/events')
      .set('Cookie', stu1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.events).toBeDefined();

    // Verify exactly the 2 future events are present among test events
    const eventIds = res.body.events.map((e: any) => e.id);
    expect(eventIds).toContain(eventFutureNear.id);
    expect(eventIds).toContain(eventFutureFar.id);
    expect(eventIds).not.toContain('10000000-0000-4000-8000-000000000003'); // ended
    expect(eventIds).not.toContain('10000000-0000-4000-8000-000000000004'); // cancelled

    // Order: Near (+1d) before Far (+2d)
    const nearIdx = eventIds.indexOf(eventFutureNear.id);
    const farIdx = eventIds.indexOf(eventFutureFar.id);
    expect(nearIdx).toBeLessThan(farIdx);

    // Verify Near event (Full)
    const returnedNear = res.body.events.find((e: any) => e.id === eventFutureNear.id);
    expect(returnedNear.capacity).toBe(1);
    expect(returnedNear.activeCount).toBe(1);
    expect(returnedNear.remainingSeats).toBe(0);
    expect(returnedNear.registrationOpen).toBe(false);
    expect(returnedNear.organizerName).toBe(TEST_USERS.org1.displayName);

    // Verify Far event (Open)
    const returnedFar = res.body.events.find((e: any) => e.id === eventFutureFar.id);
    expect(returnedFar.capacity).toBe(30);
    expect(returnedFar.activeCount).toBe(0);
    expect(returnedFar.remainingSeats).toBe(30);
    expect(returnedFar.registrationOpen).toBe(true);
    expect(returnedFar.organizerName).toBe(TEST_USERS.org1.displayName);
  });

  it('TEST-27: (AC-23) Event with registration by stu2 never leaks stu2 id/email/name in GET /events or GET /events/:id', async () => {
    const now = new Date();
    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000020',
        organizer_id: TEST_USERS.org1.id,
        title: 'Privacy Verification Workshop',
        description: 'Ensuring zero registrant identity leaks',
        category: EventCategory.WORKSHOP,
        location: 'CB2301',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 25,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    // stu2 is registered on this event
    await prisma.registration.create({
      data: {
        id: '30000000-0000-4000-8000-000000000021',
        event_id: event.id,
        student_id: TEST_USERS.stu2.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: now
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    // 1. GET /api/events
    const listRes = await request(app)
      .get('/api/events')
      .set('Cookie', stu1Cookie);

    expect(listRes.status).toBe(200);
    const listStr = JSON.stringify(listRes.body);
    expect(listStr).not.toContain(TEST_USERS.stu2.id);
    expect(listStr).not.toContain(TEST_USERS.stu2.email);
    expect(listStr).not.toContain(TEST_USERS.stu2.displayName);

    // 2. GET /api/events/:id
    const detailRes = await request(app)
      .get(`/api/events/${event.id}`)
      .set('Cookie', stu1Cookie);

    expect(detailRes.status).toBe(200);
    const detailStr = JSON.stringify(detailRes.body);
    expect(detailStr).not.toContain(TEST_USERS.stu2.id);
    expect(detailStr).not.toContain(TEST_USERS.stu2.email);
    expect(detailStr).not.toContain(TEST_USERS.stu2.displayName);
  });

  it('TEST-28: (AC-24) stu1 registered on E gets myRegistration, while unregistered stu3 gets myRegistration=null', async () => {
    const now = new Date();
    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000030',
        organizer_id: TEST_USERS.org1.id,
        title: 'Registration Status Event',
        description: 'Checking myRegistration field',
        category: EventCategory.SEMINAR,
        location: 'Room 202',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 40,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    const stu1Reg = await prisma.registration.create({
      data: {
        id: '30000000-0000-4000-8000-000000000031',
        event_id: event.id,
        student_id: TEST_USERS.stu1.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: now
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);
    const stu3Cookie = await loginAs(TEST_USERS.stu3.email);

    // 1. stu1 GET /api/events/:id -> has myRegistration
    const resStu1 = await request(app)
      .get(`/api/events/${event.id}`)
      .set('Cookie', stu1Cookie);

    expect(resStu1.status).toBe(200);
    expect(resStu1.body.event).toBeDefined();
    expect(resStu1.body.event.id).toBe(event.id);
    expect(resStu1.body.myRegistration).not.toBeNull();
    expect(resStu1.body.myRegistration.id).toBe(stu1Reg.id);
    expect(resStu1.body.myRegistration.status).toBe('ACTIVE');
    expect(resStu1.body.myRegistration.registeredAt).toBeDefined();

    // 2. stu3 GET /api/events/:id -> myRegistration is null
    const resStu3 = await request(app)
      .get(`/api/events/${event.id}`)
      .set('Cookie', stu3Cookie);

    expect(resStu3.status).toBe(200);
    expect(resStu3.body.event).toBeDefined();
    expect(resStu3.body.event.id).toBe(event.id);
    expect(resStu3.body.myRegistration).toBeNull();
  });

  it('TEST-29: (AC-24) GET /events with non-existent UUID or malformed id returns 404 NOT_FOUND', async () => {
    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    // 1. Random non-existent UUID
    const randomUuid = '99999999-9999-4999-8999-999999999999';
    const resUuid = await request(app)
      .get(`/api/events/${randomUuid}`)
      .set('Cookie', stu1Cookie);

    expect(resUuid.status).toBe(404);
    expect(resUuid.body.error.code).toBe('NOT_FOUND');

    // 2. Malformed id 'abc'
    const resMalformed = await request(app)
      .get('/api/events/abc')
      .set('Cookie', stu1Cookie);

    expect(resMalformed.status).toBe(404);
    expect(resMalformed.body.error.code).toBe('NOT_FOUND');
  });
});
