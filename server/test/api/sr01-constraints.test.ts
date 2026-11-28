import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { EventStatus, RegistrationStatus } from '@prisma/client';
import { prisma } from '../../src/lib/prisma.js';
import { truncateTables, seedTestFixtures, disconnectDb, TEST_USERS } from '../helpers/db.js';
import { makeEvent, makeRegistration } from '../helpers/factories.js';

describe('SR-01 Migration 0002 DB constraints & test factories', () => {
  beforeEach(async () => {
    await truncateTables();
    await seedTestFixtures();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('rejects whitespace-only or >500-char cancel_reason and accepts 1..500 chars (chk_cancel_reason_len)', async () => {
    await expect(
      makeEvent({
        status: EventStatus.CANCELLED,
        cancelReason: '   ',
        cancelledAt: new Date()
      })
    ).rejects.toThrow(/chk_cancel_reason_len/);

    await expect(
      makeEvent({
        status: EventStatus.CANCELLED,
        cancelReason: 'x'.repeat(501),
        cancelledAt: new Date()
      })
    ).rejects.toThrow(/chk_cancel_reason_len/);

    const validCancelled = await makeEvent({
      status: EventStatus.CANCELLED,
      cancelReason: 'x'.repeat(500),
      cancelledAt: new Date()
    });
    expect(validCancelled.cancel_reason?.length).toBe(500);
  });

  it('rejects checked_in_at on a non-ACTIVE registration and accepts ACTIVE check-in (chk_checkin_active_only)', async () => {
    const event = await makeEvent({ status: EventStatus.PUBLISHED });

    await expect(
      makeRegistration({
        eventId: event.id,
        studentId: TEST_USERS.stu1.id,
        status: RegistrationStatus.CANCELLED,
        checkedInAt: new Date(),
        checkedInBy: TEST_USERS.org1.id
      })
    ).rejects.toThrow(/chk_checkin_active_only/);

    const valid = await makeRegistration({
      eventId: event.id,
      studentId: TEST_USERS.stu1.id,
      status: RegistrationStatus.ACTIVE,
      checkedInAt: new Date(),
      checkedInBy: TEST_USERS.org1.id
    });
    expect(valid.checked_in_at).not.toBeNull();
    expect(await prisma.registration.count({ where: { event_id: event.id } })).toBe(1);
  });
});
