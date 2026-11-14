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

describe('F-06 Event Registration API', () => {
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

  it('TEST-31: (AC-26) stu1 registers for valid open event: returns 201, creates ACTIVE row, decrements remainingSeats', async () => {
    const now = new Date();
    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000001',
        organizer_id: TEST_USERS.org1.id,
        title: 'Open Workshop',
        description: 'Valid open event for registration',
        category: EventCategory.WORKSHOP,
        location: 'CB2301',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 30,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    // 3 active registrations initially (remainingSeats = 27)
    await prisma.registration.createMany({
      data: [
        {
          id: '20000000-0000-4000-8000-000000000001',
          event_id: event.id,
          student_id: TEST_USERS.stu2.id,
          status: RegistrationStatus.ACTIVE,
          registered_at: now
        },
        {
          id: '20000000-0000-4000-8000-000000000002',
          event_id: event.id,
          student_id: TEST_USERS.stu3.id,
          status: RegistrationStatus.ACTIVE,
          registered_at: now
        },
        {
          id: '20000000-0000-4000-8000-000000000003',
          event_id: event.id,
          student_id: TEST_USERS.stu4.id,
          status: RegistrationStatus.ACTIVE,
          registered_at: now
        }
      ]
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    const res = await request(app)
      .post(`/api/events/${event.id}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.registration).toBeDefined();
    expect(res.body.registration.eventId).toBe(event.id);
    expect(res.body.registration.status).toBe('ACTIVE');
    expect(res.body.event).toBeDefined();
    expect(res.body.event.activeCount).toBe(4);
    expect(res.body.event.remainingSeats).toBe(26);

    // Verify row in DB
    const dbReg = await prisma.registration.findFirst({
      where: {
        event_id: event.id,
        student_id: TEST_USERS.stu1.id,
        status: RegistrationStatus.ACTIVE
      }
    });
    expect(dbReg).not.toBeNull();
  });

  it('TEST-32: (AC-27) duplicate registration by stu1 returns 409 ALREADY_REGISTERED, active count unchanged', async () => {
    const now = new Date();
    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000002',
        organizer_id: TEST_USERS.org1.id,
        title: 'Duplicate Test Event',
        description: 'Testing duplicate registration',
        category: EventCategory.SEMINAR,
        location: 'Room 101',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 20,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    // stu1 already registered
    await prisma.registration.create({
      data: {
        id: '20000000-0000-4000-8000-000000000010',
        event_id: event.id,
        student_id: TEST_USERS.stu1.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: now
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    const res = await request(app)
      .post(`/api/events/${event.id}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_REGISTERED');

    // Verify exactly 1 active row remains for (event, stu1)
    const activeRows = await prisma.registration.count({
      where: {
        event_id: event.id,
        student_id: TEST_USERS.stu1.id,
        status: RegistrationStatus.ACTIVE
      }
    });
    expect(activeRows).toBe(1);
  });

  it('TEST-33: (AC-28) registration on full event returns 409 EVENT_FULL, no row added', async () => {
    const now = new Date();
    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000003',
        organizer_id: TEST_USERS.org1.id,
        title: 'Full Event',
        description: 'Capacity 1 filled',
        category: EventCategory.WORKSHOP,
        location: 'Lab 1',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 1,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    // stu2 takes the single seat
    await prisma.registration.create({
      data: {
        id: '20000000-0000-4000-8000-000000000020',
        event_id: event.id,
        student_id: TEST_USERS.stu2.id,
        status: RegistrationStatus.ACTIVE,
        registered_at: now
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    const res = await request(app)
      .post(`/api/events/${event.id}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_FULL');

    // Total active count remains 1
    const totalActive = await prisma.registration.count({
      where: { event_id: event.id, status: RegistrationStatus.ACTIVE }
    });
    expect(totalActive).toBe(1);
  });

  it('TEST-34: (AC-29) deadline boundary: registers at now=D succeeds (201), registers at now=D+1s returns 409 REGISTRATION_CLOSED', async () => {
    const deadline = new Date('2026-11-20T12:00:00.000Z');
    const startAt = new Date('2026-11-21T10:00:00.000Z');
    const endAt = new Date('2026-11-21T12:00:00.000Z');

    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000004',
        organizer_id: TEST_USERS.org1.id,
        title: 'Deadline Boundary Event',
        description: 'Testing inclusive deadline',
        category: EventCategory.SEMINAR,
        location: 'Online',
        start_at: startAt,
        end_at: endAt,
        registration_deadline: deadline,
        capacity: 10,
        status: EventStatus.PUBLISHED,
        published_at: new Date('2026-11-01T00:00:00.000Z')
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);
    const stu3Cookie = await loginAs(TEST_USERS.stu3.email);

    // 1. Exactly at now = deadline -> 201
    clock.setNow(deadline);
    const resAtDeadline = await request(app)
      .post(`/api/events/${event.id}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({});
    expect(resAtDeadline.status).toBe(201);

    // 2. At now = deadline + 1s -> 409 REGISTRATION_CLOSED
    clock.setNow(new Date(deadline.getTime() + 1000));
    const resAfterDeadline = await request(app)
      .post(`/api/events/${event.id}/registrations`)
      .set('Cookie', stu3Cookie)
      .send({});
    expect(resAfterDeadline.status).toBe(409);
    expect(resAfterDeadline.body.error.code).toBe('REGISTRATION_CLOSED');
  });

  it('TEST-35: (AC-30) CANCELLED or ended event returns 409 EVENT_NOT_OPEN, no rows added', async () => {
    const fixedNow = new Date('2026-11-15T12:00:00.000Z');
    clock.setNow(fixedNow);

    // 1. CANCELLED event
    const cancelledEvent = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000005',
        organizer_id: TEST_USERS.org1.id,
        title: 'Cancelled Activity',
        description: 'Cancelled',
        category: EventCategory.SPORTS,
        location: 'Field',
        start_at: new Date(fixedNow.getTime() + 24 * 3600 * 1000),
        end_at: new Date(fixedNow.getTime() + 26 * 3600 * 1000),
        registration_deadline: new Date(fixedNow.getTime() + 12 * 3600 * 1000),
        capacity: 20,
        status: EventStatus.CANCELLED,
        published_at: fixedNow
      }
    });

    // 2. Ended event
    const endedEvent = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000006',
        organizer_id: TEST_USERS.org1.id,
        title: 'Past Event',
        description: 'Already ended',
        category: EventCategory.WORKSHOP,
        location: 'Room 2',
        start_at: new Date(fixedNow.getTime() - 4 * 3600 * 1000),
        end_at: new Date(fixedNow.getTime() - 1 * 3600 * 1000),
        registration_deadline: new Date(fixedNow.getTime() - 10 * 3600 * 1000),
        capacity: 20,
        status: EventStatus.PUBLISHED,
        published_at: new Date(fixedNow.getTime() - 20 * 3600 * 1000)
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    // Attempt register on cancelled event
    const resCancelled = await request(app)
      .post(`/api/events/${cancelledEvent.id}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({});
    expect(resCancelled.status).toBe(409);
    expect(resCancelled.body.error.code).toBe('EVENT_NOT_OPEN');

    // Attempt register on ended event
    const resEnded = await request(app)
      .post(`/api/events/${endedEvent.id}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({});
    expect(resEnded.status).toBe(409);
    expect(resEnded.body.error.code).toBe('EVENT_NOT_OPEN');
  });

  it('TEST-36: (AC-31) Concurrency last-seat race: 10 students concurrently register for 1 seat -> exactly 1 gets 201, 9 get 409 EVENT_FULL, active count = 5', async () => {
    const now = new Date();
    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000007',
        organizer_id: TEST_USERS.org1.id,
        title: 'Last Seat Race Event',
        description: 'Capacity 5 with 4 active -> exactly 1 seat left',
        category: EventCategory.WORKSHOP,
        location: 'Lab C',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 5,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    // 4 active registrations initially using stu11..stu14
    await prisma.registration.createMany({
      data: [
        {
          id: '20000000-0000-4000-8000-000000000041',
          event_id: event.id,
          student_id: TEST_USERS.stu11.id,
          status: RegistrationStatus.ACTIVE,
          registered_at: now
        },
        {
          id: '20000000-0000-4000-8000-000000000042',
          event_id: event.id,
          student_id: TEST_USERS.stu12.id,
          status: RegistrationStatus.ACTIVE,
          registered_at: now
        },
        {
          id: '20000000-0000-4000-8000-000000000043',
          event_id: event.id,
          student_id: TEST_USERS.stu13.id,
          status: RegistrationStatus.ACTIVE,
          registered_at: now
        },
        {
          id: '20000000-0000-4000-8000-000000000044',
          event_id: event.id,
          student_id: TEST_USERS.stu14.id,
          status: RegistrationStatus.ACTIVE,
          registered_at: now
        }
      ]
    });

    // Log in 10 different students (stu1 to stu10)
    const studentUsers = [
      TEST_USERS.stu1,
      TEST_USERS.stu2,
      TEST_USERS.stu3,
      TEST_USERS.stu4,
      TEST_USERS.stu5,
      TEST_USERS.stu6,
      TEST_USERS.stu7,
      TEST_USERS.stu8,
      TEST_USERS.stu9,
      TEST_USERS.stu10
    ];

    const cookies = await Promise.all(studentUsers.map((u) => loginAs(u.email)));

    // Fire 10 concurrent register requests
    const responses = await Promise.all(
      cookies.map((cookie) =>
        request(app)
          .post(`/api/events/${event.id}/registrations`)
          .set('Cookie', cookie)
          .send({})
      )
    );

    const successful = responses.filter((r) => r.status === 201);
    const fullErrors = responses.filter((r) => r.status === 409 && r.body.error?.code === 'EVENT_FULL');

    expect(successful).toHaveLength(1);
    expect(fullErrors).toHaveLength(9);

    const finalActiveCount = await prisma.registration.count({
      where: { event_id: event.id, status: RegistrationStatus.ACTIVE }
    });
    expect(finalActiveCount).toBe(5);
  });

  it('TEST-37: (AC-31) Concurrency same-student race: 5 concurrent requests from stu1 -> exactly 1 gets 201, 4 get 409 ALREADY_REGISTERED', async () => {
    const now = new Date();
    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000008',
        organizer_id: TEST_USERS.org1.id,
        title: 'Same Student Race Event',
        description: 'Testing partial unique index race safety',
        category: EventCategory.WORKSHOP,
        location: 'Lab D',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 30,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    // 5 concurrent requests by the same student
    const responses = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        request(app)
          .post(`/api/events/${event.id}/registrations`)
          .set('Cookie', stu1Cookie)
          .send({})
      )
    );

    const successful = responses.filter((r) => r.status === 201);
    const duplicateErrors = responses.filter(
      (r) => r.status === 409 && r.body.error?.code === 'ALREADY_REGISTERED'
    );

    expect(successful).toHaveLength(1);
    expect(duplicateErrors).toHaveLength(4);

    const activeRows = await prisma.registration.count({
      where: {
        event_id: event.id,
        student_id: TEST_USERS.stu1.id,
        status: RegistrationStatus.ACTIVE
      }
    });
    expect(activeRows).toBe(1);
  });

  it('rejects unexpected body keys with 400 VALIDATION_ERROR', async () => {
    const now = new Date();
    const event = await prisma.event.create({
      data: {
        id: '10000000-0000-4000-8000-000000000009',
        organizer_id: TEST_USERS.org1.id,
        title: 'Validation Test Event',
        description: 'Testing strict body validation',
        category: EventCategory.WORKSHOP,
        location: 'Room 202',
        start_at: new Date(now.getTime() + 48 * 3600 * 1000),
        end_at: new Date(now.getTime() + 50 * 3600 * 1000),
        registration_deadline: new Date(now.getTime() + 24 * 3600 * 1000),
        capacity: 10,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    const res = await request(app)
      .post(`/api/events/${event.id}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({ unexpectedField: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 NOT_FOUND for non-existent or malformed event id', async () => {
    const stu1Cookie = await loginAs(TEST_USERS.stu1.email);

    // Non-existent UUID
    const resNotFound = await request(app)
      .post('/api/events/99999999-9999-4999-8999-999999999999/registrations')
      .set('Cookie', stu1Cookie)
      .send({});
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.error.code).toBe('NOT_FOUND');

    // Malformed ID
    const resMalformed = await request(app)
      .post('/api/events/invalid-uuid/registrations')
      .set('Cookie', stu1Cookie)
      .send({});
    expect(resMalformed.status).toBe(404);
    expect(resMalformed.body.error.code).toBe('NOT_FOUND');
  });
});
