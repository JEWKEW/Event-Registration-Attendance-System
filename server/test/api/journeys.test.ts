import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import {
  truncateTables,
  seedTestFixtures,
  disconnectDb,
  TEST_USERS,
  TEST_SEED_PASSWORD
} from '../helpers/db.js';
import { clock } from '../../src/lib/clock.js';
import { EventCategory } from '@prisma/client';

describe('Sprint 1 End-to-End Journeys', () => {
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

  it('TEST-40: (AC-35, AC-18, AC-22, AC-25, AC-32) Main multi-persona journey: org1 creates event X -> stu1 discovers, registers, views in My Registrations -> org1 sees stu1 in roster', async () => {
    const now = new Date();

    // -----------------------------------------------------------------
    // Step 1: org1 logs in
    // -----------------------------------------------------------------
    const orgLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.org1.email,
        password: TEST_SEED_PASSWORD
      });
    expect(orgLoginRes.status).toBe(200);
    expect(orgLoginRes.body.user.role).toBe('ORGANIZER');
    const orgCookie = orgLoginRes.headers['set-cookie'];

    // -----------------------------------------------------------------
    // Step 2: org1 creates and publishes Event X with capacity 2
    // -----------------------------------------------------------------
    const startAt = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
    const endAt = new Date(now.getTime() + 50 * 3600 * 1000).toISOString();
    const registrationDeadline = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const createRes = await request(app)
      .post('/api/events')
      .set('Cookie', orgCookie)
      .send({
        title: 'Full Stack Web Workshop',
        description: 'Hands-on web engineering workshop for KMUTT students',
        category: EventCategory.WORKSHOP,
        location: 'CB2301 Computer Lab',
        startAt,
        endAt,
        registrationDeadline,
        capacity: 2
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.event).toBeDefined();
    expect(createRes.body.event.capacity).toBe(2);
    expect(createRes.body.event.remainingSeats).toBe(2);
    const eventId = createRes.body.event.id;

    // -----------------------------------------------------------------
    // Step 3: org1 logs out
    // -----------------------------------------------------------------
    const orgLogoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', orgCookie);
    expect(orgLogoutRes.status).toBe(204);

    // -----------------------------------------------------------------
    // Step 4: stu1 logs in
    // -----------------------------------------------------------------
    const stuLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.stu1.email,
        password: TEST_SEED_PASSWORD
      });
    expect(stuLoginRes.status).toBe(200);
    expect(stuLoginRes.body.user.role).toBe('STUDENT');
    const stuCookie = stuLoginRes.headers['set-cookie'];

    // -----------------------------------------------------------------
    // Step 5: stu1 browses upcoming events (/api/events) and finds Event X
    // -----------------------------------------------------------------
    const eventsListRes = await request(app)
      .get('/api/events')
      .set('Cookie', stuCookie);
    expect(eventsListRes.status).toBe(200);
    const eventItem = eventsListRes.body.events.find((e: any) => e.id === eventId);
    expect(eventItem).toBeDefined();
    expect(eventItem.title).toBe('Full Stack Web Workshop');
    expect(eventItem.remainingSeats).toBe(2);
    expect(eventItem.registrationOpen).toBe(true);

    // -----------------------------------------------------------------
    // Step 6: stu1 opens event detail view (/api/events/:id)
    // -----------------------------------------------------------------
    const eventDetailRes = await request(app)
      .get(`/api/events/${eventId}`)
      .set('Cookie', stuCookie);
    expect(eventDetailRes.status).toBe(200);
    expect(eventDetailRes.body.event.id).toBe(eventId);
    expect(eventDetailRes.body.event.remainingSeats).toBe(2);
    expect(eventDetailRes.body.event.registrationOpen).toBe(true);
    expect(eventDetailRes.body.myRegistration).toBeNull();

    // -----------------------------------------------------------------
    // Step 7: stu1 registers for Event X
    // -----------------------------------------------------------------
    const registerRes = await request(app)
      .post(`/api/events/${eventId}/registrations`)
      .set('Cookie', stuCookie)
      .send({});
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.registration).toBeDefined();
    expect(registerRes.body.registration.status).toBe('ACTIVE');
    expect(registerRes.body.event.remainingSeats).toBe(1);
    expect(registerRes.body.event.activeCount).toBe(1);
    const registrationId = registerRes.body.registration.id;

    // Verify detail endpoint now returns myRegistration
    const postRegDetailRes = await request(app)
      .get(`/api/events/${eventId}`)
      .set('Cookie', stuCookie);
    expect(postRegDetailRes.status).toBe(200);
    expect(postRegDetailRes.body.myRegistration).toBeDefined();
    expect(postRegDetailRes.body.myRegistration.id).toBe(registrationId);
    expect(postRegDetailRes.body.event.remainingSeats).toBe(1);

    // -----------------------------------------------------------------
    // Step 8: stu1 visits "My Registrations" (/api/me/registrations)
    // -----------------------------------------------------------------
    const myRegsRes = await request(app)
      .get('/api/me/registrations')
      .set('Cookie', stuCookie);
    expect(myRegsRes.status).toBe(200);
    expect(myRegsRes.body.registrations).toHaveLength(1);
    const myReg = myRegsRes.body.registrations[0];
    expect(myReg.id).toBe(registrationId);
    expect(myReg.status).toBe('ACTIVE');
    expect(myReg.event.id).toBe(eventId);
    expect(myReg.event.title).toBe('Full Stack Web Workshop');
    expect(myReg.event.location).toBe('CB2301 Computer Lab');
    expect(myReg.event.effectiveStatus).toBe('PUBLISHED');

    // -----------------------------------------------------------------
    // Step 9: stu1 views registration detail (/api/registrations/:id)
    // -----------------------------------------------------------------
    const regDetailRes = await request(app)
      .get(`/api/registrations/${registrationId}`)
      .set('Cookie', stuCookie);
    expect(regDetailRes.status).toBe(200);
    expect(regDetailRes.body.registration.id).toBe(registrationId);
    expect(regDetailRes.body.registration.status).toBe('ACTIVE');
    expect(regDetailRes.body.registration.event.id).toBe(eventId);

    // -----------------------------------------------------------------
    // Step 10: stu1 logs out
    // -----------------------------------------------------------------
    const stuLogoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', stuCookie);
    expect(stuLogoutRes.status).toBe(204);

    // -----------------------------------------------------------------
    // Step 11: org1 logs back in
    // -----------------------------------------------------------------
    const orgLoginAgainRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.org1.email,
        password: TEST_SEED_PASSWORD
      });
    expect(orgLoginAgainRes.status).toBe(200);
    const orgCookieAgain = orgLoginAgainRes.headers['set-cookie'];

    // -----------------------------------------------------------------
    // Step 12: org1 inspects attendee roster for Event X
    // -----------------------------------------------------------------
    const rosterRes = await request(app)
      .get(`/api/events/${eventId}/registrations`)
      .set('Cookie', orgCookieAgain);
    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.event.capacity).toBe(2);
    expect(rosterRes.body.event.activeCount).toBe(1);
    expect(rosterRes.body.registrations).toHaveLength(1);

    const attendee = rosterRes.body.registrations[0];
    expect(attendee.id).toBe(registrationId);
    expect(attendee.status).toBe('ACTIVE');
    expect(attendee.student.id).toBe(TEST_USERS.stu1.id);
    expect(attendee.student.displayName).toBe(TEST_USERS.stu1.displayName);
    expect(attendee.student.studentNo).toBe(TEST_USERS.stu1.studentNo);
    expect(attendee.student.email).toBe(TEST_USERS.stu1.email);
  });

  it('TEST-41: (AC-25, AC-32) Full-event journey: Event with capacity 1 filled -> stu3 sees Full badge / closed registration -> forced register returns 409 EVENT_FULL', async () => {
    const now = new Date();

    // 1. org1 creates event with capacity 1
    const orgLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.org1.email, password: TEST_SEED_PASSWORD });
    const orgCookie = orgLoginRes.headers['set-cookie'];

    const createRes = await request(app)
      .post('/api/events')
      .set('Cookie', orgCookie)
      .send({
        title: 'Single Seat Seminar',
        description: 'Exclusive 1-seat event',
        category: EventCategory.SEMINAR,
        location: 'Room 303',
        startAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
        endAt: new Date(now.getTime() + 50 * 3600 * 1000).toISOString(),
        registrationDeadline: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
        capacity: 1
      });
    expect(createRes.status).toBe(201);
    const eventId = createRes.body.event.id;

    // 2. stu1 registers to take the only seat
    const stu1LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.stu1.email, password: TEST_SEED_PASSWORD });
    const stu1Cookie = stu1LoginRes.headers['set-cookie'];

    const reg1Res = await request(app)
      .post(`/api/events/${eventId}/registrations`)
      .set('Cookie', stu1Cookie)
      .send({});
    expect(reg1Res.status).toBe(201);
    expect(reg1Res.body.event.remainingSeats).toBe(0);

    // 3. stu3 logs in and views the event
    const stu3LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.stu3.email, password: TEST_SEED_PASSWORD });
    const stu3Cookie = stu3LoginRes.headers['set-cookie'];

    const detailRes = await request(app)
      .get(`/api/events/${eventId}`)
      .set('Cookie', stu3Cookie);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.event.remainingSeats).toBe(0);
    expect(detailRes.body.event.registrationOpen).toBe(false);
    expect(detailRes.body.myRegistration).toBeNull();

    // 4. stu3 attempts to register on the full event
    const reg3Res = await request(app)
      .post(`/api/events/${eventId}/registrations`)
      .set('Cookie', stu3Cookie)
      .send({});
    expect(reg3Res.status).toBe(409);
    expect(reg3Res.body.error.code).toBe('EVENT_FULL');

    // 5. Verify active count remains 1 in DB
    const finalDetailRes = await request(app)
      .get(`/api/events/${eventId}`)
      .set('Cookie', stu3Cookie);
    expect(finalDetailRes.body.event.activeCount).toBe(1);
    expect(finalDetailRes.body.event.remainingSeats).toBe(0);
  });

  it('TEST-09: (AC-07) Session lifecycle: Login -> assert me + role -> Logout -> session invalidated -> wrong password rejected', async () => {
    // 1. Login with valid credentials
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.stu1.email,
        password: TEST_SEED_PASSWORD
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.email).toBe(TEST_USERS.stu1.email);
    expect(loginRes.body.user.displayName).toBe(TEST_USERS.stu1.displayName);
    expect(loginRes.body.user.role).toBe('STUDENT');
    const cookie = loginRes.headers['set-cookie'];

    // 2. Call /api/auth/me with session
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.id).toBe(TEST_USERS.stu1.id);

    // 3. Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie);
    expect(logoutRes.status).toBe(204);

    // 4. Invalidate old cookie: /api/auth/me must return 401
    const postLogoutMe = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);
    expect(postLogoutMe.status).toBe(401);
    expect(postLogoutMe.body.error.code).toBe('UNAUTHENTICATED');

    // 5. Login with wrong password rejected
    const badLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.stu1.email,
        password: 'wrong-password'
      });
    expect(badLoginRes.status).toBe(401);
    expect(badLoginRes.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
