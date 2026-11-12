import { describe, it, expect, beforeEach, afterAll } from 'vitest';
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
import { EventCategory, EventStatus, RegistrationStatus } from '@prisma/client';

describe('F-04 Organizer "My events" and registration roster API', () => {
  beforeEach(async () => {
    await truncateTables();
    await seedTestFixtures();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('TEST-23: (AC-19) org1 GET /api/organizer/events returns only org1 events in asc order with activeCount and remainingSeats', async () => {
    const org1Cookie = await loginAs(TEST_USERS.org1.email);
    const org2Cookie = await loginAs(TEST_USERS.org2.email);

    // Clean fixtures and set up specific test scenario:
    // org1 has 2 events (one with 1 registration, one with 0 registrations)
    // org2 has 1 event
    const now = new Date();
    const hourMs = 3600 * 1000;

    const event1Org1 = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000001',
        organizer_id: TEST_USERS.org1.id,
        title: 'Org1 First Event',
        description: 'First event description',
        category: EventCategory.WORKSHOP,
        location: 'Room 101',
        start_at: new Date(now.getTime() + 10 * hourMs),
        end_at: new Date(now.getTime() + 12 * hourMs),
        registration_deadline: new Date(now.getTime() + 8 * hourMs),
        capacity: 30,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    const event2Org1 = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000002',
        organizer_id: TEST_USERS.org1.id,
        title: 'Org1 Second Event',
        description: 'Second event description',
        category: EventCategory.SEMINAR,
        location: 'Auditorium',
        start_at: new Date(now.getTime() + 20 * hourMs),
        end_at: new Date(now.getTime() + 22 * hourMs),
        registration_deadline: new Date(now.getTime() + 18 * hourMs),
        capacity: 50,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    const eventOrg2 = await prisma.event.create({
      data: {
        id: '20000000-0000-4000-8000-000000000001',
        organizer_id: TEST_USERS.org2.id,
        title: 'Org2 Other Event',
        description: 'Org2 event description',
        category: EventCategory.SPORTS,
        location: 'Gymnasium',
        start_at: new Date(now.getTime() + 15 * hourMs),
        end_at: new Date(now.getTime() + 17 * hourMs),
        registration_deadline: new Date(now.getTime() + 12 * hourMs),
        capacity: 20,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    // 1 ACTIVE registration on event1Org1
    await prisma.registration.create({
      data: {
        id: '30000000-0000-4000-8000-000000000001',
        event_id: event1Org1.id,
        student_id: TEST_USERS.stu1.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: now
      }
    });

    // Action: org1 calls GET /api/organizer/events
    const res = await request(app)
      .get('/api/organizer/events')
      .set('Cookie', org1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.events).toBeDefined();

    // Verify only org1 events are returned (filter to our created test events if seeded events exist)
    const org1EventIds = res.body.events.map((e: any) => e.id);
    expect(org1EventIds).toContain(event1Org1.id);
    expect(org1EventIds).toContain(event2Org1.id);
    expect(org1EventIds).not.toContain(eventOrg2.id);

    // Verify each event has correct activeCount, remainingSeats, and ordering
    const returnedEvent1 = res.body.events.find((e: any) => e.id === event1Org1.id);
    const returnedEvent2 = res.body.events.find((e: any) => e.id === event2Org1.id);

    expect(returnedEvent1.activeCount).toBe(1);
    expect(returnedEvent1.remainingSeats).toBe(29);
    expect(returnedEvent1.capacity).toBe(30);
    expect(returnedEvent1.status).toBe('PUBLISHED');
    expect(returnedEvent1.effectiveStatus).toBe('PUBLISHED');

    expect(returnedEvent2.activeCount).toBe(0);
    expect(returnedEvent2.remainingSeats).toBe(50);
    expect(returnedEvent2.capacity).toBe(50);

    // Ensure sorted ascending by start_at
    const event1Idx = res.body.events.findIndex((e: any) => e.id === event1Org1.id);
    const event2Idx = res.body.events.findIndex((e: any) => e.id === event2Org1.id);
    expect(event1Idx).toBeLessThan(event2Idx);
  });

  it('TEST-24: (AC-20) Event with stu1 registered at t1, stu3 at t2 returns roster in chronological order with student details', async () => {
    const org1Cookie = await loginAs(TEST_USERS.org1.email);
    const now = new Date();

    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000010',
        organizer_id: TEST_USERS.org1.id,
        title: 'Roster Test Event',
        description: 'Testing roster ordering and details',
        category: EventCategory.WORKSHOP,
        location: 'Lab A',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 30,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    const t1 = new Date(now.getTime() - 2 * 3600 * 1000);
    const t2 = new Date(now.getTime() - 1 * 3600 * 1000);

    // stu1 registered at t1
    await prisma.registration.create({
      data: {
        id: '30000000-0000-4000-8000-000000000011',
        event_id: event.id,
        student_id: TEST_USERS.stu1.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: t1
      }
    });

    // stu3 registered at t2
    await prisma.registration.create({
      data: {
        id: '30000000-0000-4000-8000-000000000012',
        event_id: event.id,
        student_id: TEST_USERS.stu3.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: t2
      }
    });

    const res = await request(app)
      .get(`/api/events/${event.id}/registrations`)
      .set('Cookie', org1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.event).toBeDefined();
    expect(res.body.event.id).toBe(event.id);
    expect(res.body.event.title).toBe(event.title);
    expect(res.body.event.capacity).toBe(30);
    expect(res.body.event.activeCount).toBe(2);

    expect(res.body.registrations).toHaveLength(2);

    // Order [stu1, stu3]
    const [firstReg, secondReg] = res.body.registrations;
    expect(firstReg.student.id).toBe(TEST_USERS.stu1.id);
    expect(firstReg.student.displayName).toBe(TEST_USERS.stu1.displayName);
    expect(firstReg.student.studentNo).toBe(TEST_USERS.stu1.studentNo);
    expect(firstReg.student.email).toBe(TEST_USERS.stu1.email);
    expect(firstReg.status).toBe('ACTIVE');
    expect(firstReg.registeredAt).toBe(t1.toISOString());

    expect(secondReg.student.id).toBe(TEST_USERS.stu3.id);
    expect(secondReg.student.displayName).toBe(TEST_USERS.stu3.displayName);
    expect(secondReg.student.studentNo).toBe(TEST_USERS.stu3.studentNo);
    expect(secondReg.student.email).toBe(TEST_USERS.stu3.email);
    expect(secondReg.status).toBe('ACTIVE');
    expect(secondReg.registeredAt).toBe(t2.toISOString());
  });

  it('TEST-25: (AC-21) GET roster for random UUID and for "abc" returns 404 NOT_FOUND', async () => {
    const org1Cookie = await loginAs(TEST_USERS.org1.email);

    // 1. Non-existent UUID
    const randomUuid = '99999999-9999-4999-8999-999999999999';
    const resUuid = await request(app)
      .get(`/api/events/${randomUuid}/registrations`)
      .set('Cookie', org1Cookie);

    expect(resUuid.status).toBe(404);
    expect(resUuid.body.error.code).toBe('NOT_FOUND');

    // 2. Malformed ID "abc"
    const resMalformed = await request(app)
      .get('/api/events/abc/registrations')
      .set('Cookie', org1Cookie);

    expect(resMalformed.status).toBe(404);
    expect(resMalformed.body.error.code).toBe('NOT_FOUND');
  });
});
