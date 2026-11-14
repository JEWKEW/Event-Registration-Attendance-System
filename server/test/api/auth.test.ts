import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { truncateTables, seedTestUsers, TEST_SEED_PASSWORD, TEST_USERS, disconnectDb } from '../helpers/db.js';

describe('F-01 Authentication & Session API', () => {
  const app = createApp();

  beforeEach(async () => {
    await truncateTables();
    await seedTestUsers();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('TEST-01: (AC-01) stu1 login returns 200, STUDENT role, cookie, and /me returns same user', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.stu1.email, password: TEST_SEED_PASSWORD });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user).toEqual({
      id: TEST_USERS.stu1.id,
      email: TEST_USERS.stu1.email,
      displayName: TEST_USERS.stu1.displayName,
      role: 'STUDENT',
      studentNo: TEST_USERS.stu1.studentNo
    });

    const cookie = loginRes.headers['set-cookie'];
    expect(cookie).toBeDefined();

    // Call /me with the returned session cookie
    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.id).toBe(TEST_USERS.stu1.id);
    expect(meRes.body.user.role).toBe('STUDENT');
  });

  it('TEST-02: (AC-01) org1 login returns 200 with ORGANIZER role', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.org1.email, password: TEST_SEED_PASSWORD });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe('ORGANIZER');
    expect(loginRes.body.user.id).toBe(TEST_USERS.org1.id);
  });

  it('TEST-03: (AC-02) wrong password returns 401 INVALID_CREDENTIALS and /me gives 401', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.stu1.email, password: 'wrong-password-123' });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
        details: []
      }
    });

    // Calling /me without a valid session cookie returns 401
    const cookie = loginRes.headers['set-cookie'] || [];
    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(401);
  });

  it('TEST-04: (AC-02) unknown email returns 401 with body deep-equal to wrong password body', async () => {
    // 1. Wrong password error body
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.stu1.email, password: 'incorrect-password' });

    // 2. Unknown email error body
    const unknownEmailRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@demo.kmutt.test', password: 'incorrect-password' });

    expect(unknownEmailRes.status).toBe(401);
    expect(unknownEmailRes.body).toEqual(wrongPassRes.body);
    expect(unknownEmailRes.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('TEST-05: (AC-03) table-driven validation rejects invalid login request bodies with 400', async () => {
    const cases = [
      {
        name: 'missing email',
        payload: { password: 'validpassword' },
        expectedField: 'email'
      },
      {
        name: 'invalid email format',
        payload: { email: 'not-an-email', password: 'validpassword' },
        expectedField: 'email'
      },
      {
        name: 'empty password',
        payload: { email: 'stu1@demo.kmutt.test', password: '' },
        expectedField: 'password'
      },
      {
        name: 'unknown extra field (strict check)',
        payload: { email: 'stu1@demo.kmutt.test', password: 'validpassword', extraKey: 'forbidden' },
        expectedField: 'extraKey'
      }
    ];

    for (const testCase of cases) {
      const res = await request(app).post('/api/auth/login').send(testCase.payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const details = res.body.error.details;
      expect(Array.isArray(details)).toBe(true);
      const matched = details.some((d: any) => d.field === testCase.expectedField);
      expect(matched).toBe(true);
    }
  });

  it('TEST-06: (AC-04) GET /api/auth/me without session cookie returns 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required.',
        details: []
      }
    });
  });

  it('TEST-07: (AC-05) logout deletes session row, clears cookie, and invalidates old cookie', async () => {
    // 1. Log in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.stu1.email, password: TEST_SEED_PASSWORD });

    expect(loginRes.status).toBe(200);
    const cookieHeader = loginRes.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();

    // Verify cookie attributes: HttpOnly and SameSite=Lax
    const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
    expect(cookieStr).toMatch(/HttpOnly/i);
    expect(cookieStr).toMatch(/SameSite=Lax/i);

    // Extract raw session ID from cookie to verify PostgreSQL session table
    // Cookie format: sid=s%3A<rawSid>.<signature>; ...
    const sidMatch = decodeURIComponent(cookieStr).match(/sid=s:([^.]+)\./);
    const rawSid = sidMatch ? sidMatch[1] : null;

    if (rawSid) {
      const activeSession = await prisma.session.findUnique({ where: { sid: rawSid } });
      expect(activeSession).not.toBeNull();
    }

    // 2. Logout
    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookieHeader);
    expect(logoutRes.status).toBe(204);

    // 3. Replay old cookie on /me -> must be 401
    const replayRes = await request(app).get('/api/auth/me').set('Cookie', cookieHeader);
    expect(replayRes.status).toBe(401);

    // 4. Session row in database must be deleted
    if (rawSid) {
      const deletedSession = await prisma.session.findUnique({ where: { sid: rawSid } });
      expect(deletedSession).toBeNull();
    }
  });

  it('TEST-08: (AC-06) database passwords are valid bcrypt hashes and responses never leak passwordHash', async () => {
    // 1. Inspect all user hashes in database
    const allUsers = await prisma.user.findMany();
    expect(allUsers.length).toBeGreaterThan(0);

    for (const u of allUsers) {
      expect(u.password_hash).toMatch(/^\$2[ab]\$/);
      expect(bcrypt.getRounds(u.password_hash)).toBeGreaterThanOrEqual(10);
      expect(u.password_hash).not.toBe(TEST_SEED_PASSWORD);
    }

    // 2. Test login and /me responses to ensure no passwordHash or password_hash appears
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USERS.stu1.email, password: TEST_SEED_PASSWORD });

    const loginJson = JSON.stringify(loginRes.body);
    expect(loginJson).not.toContain('passwordHash');
    expect(loginJson).not.toContain('password_hash');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', loginRes.headers['set-cookie']);

    const meJson = JSON.stringify(meRes.body);
    expect(meJson).not.toContain('passwordHash');
    expect(meJson).not.toContain('password_hash');
  });
});
