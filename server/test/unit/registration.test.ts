import { describe, it, expect } from 'vitest';
import {
  checkRegistrationEligibility,
  EventForEligibility
} from '../../src/modules/registrations/registrations.validator.js';

describe('F-06 Registration Eligibility Rules (Unit)', () => {
  const baseEvent: EventForEligibility = {
    status: 'PUBLISHED',
    startAt: new Date('2026-11-20T10:00:00.000Z'),
    endAt: new Date('2026-11-20T12:00:00.000Z'),
    registrationDeadline: new Date('2026-11-18T23:59:00.000Z'),
    capacity: 30
  };

  const validNow = new Date('2026-11-15T10:00:00.000Z');

  it('TEST-30: (AC-27..30) checkRegistrationEligibility table-driven rules and boundaries', () => {
    const cases = [
      // 1. Valid registration
      {
        name: 'normal valid registration',
        event: baseEvent,
        activeCount: 10,
        alreadyRegistered: false,
        now: validNow,
        expectedOk: true,
        expectedCode: undefined
      },
      // 2. Status != PUBLISHED (e.g. CANCELLED or DRAFT) -> EVENT_NOT_OPEN
      {
        name: 'cancelled event returns EVENT_NOT_OPEN',
        event: { ...baseEvent, status: 'CANCELLED' },
        activeCount: 0,
        alreadyRegistered: false,
        now: validNow,
        expectedOk: false,
        expectedCode: 'EVENT_NOT_OPEN'
      },
      // 3. now > endAt -> EVENT_NOT_OPEN
      {
        name: 'past ended event returns EVENT_NOT_OPEN',
        event: baseEvent,
        activeCount: 0,
        alreadyRegistered: false,
        now: new Date('2026-11-20T12:00:01.000Z'),
        expectedOk: false,
        expectedCode: 'EVENT_NOT_OPEN'
      },
      // 4. now = registrationDeadline (inclusive boundary) -> OK
      {
        name: 'now exactly at registration deadline is accepted',
        event: baseEvent,
        activeCount: 5,
        alreadyRegistered: false,
        now: new Date('2026-11-18T23:59:00.000Z'),
        expectedOk: true,
        expectedCode: undefined
      },
      // 5. now = registrationDeadline + 1s -> REGISTRATION_CLOSED
      {
        name: 'now 1 second after registration deadline returns REGISTRATION_CLOSED',
        event: baseEvent,
        activeCount: 5,
        alreadyRegistered: false,
        now: new Date('2026-11-18T23:59:01.000Z'),
        expectedOk: false,
        expectedCode: 'REGISTRATION_CLOSED'
      },
      // 6. alreadyRegistered = true -> ALREADY_REGISTERED
      {
        name: 'student already registered returns ALREADY_REGISTERED',
        event: baseEvent,
        activeCount: 5,
        alreadyRegistered: true,
        now: validNow,
        expectedOk: false,
        expectedCode: 'ALREADY_REGISTERED'
      },
      // 7. activeCount = capacity - 1 -> OK
      {
        name: 'last remaining seat (activeCount = capacity - 1) is accepted',
        event: baseEvent,
        activeCount: 29,
        alreadyRegistered: false,
        now: validNow,
        expectedOk: true,
        expectedCode: undefined
      },
      // 8. activeCount = capacity -> EVENT_FULL
      {
        name: 'full event (activeCount = capacity) returns EVENT_FULL',
        event: baseEvent,
        activeCount: 30,
        alreadyRegistered: false,
        now: validNow,
        expectedOk: false,
        expectedCode: 'EVENT_FULL'
      },
      // 9. Precedence: alreadyRegistered takes precedence over EVENT_FULL
      {
        name: 'already registered on a full event returns ALREADY_REGISTERED',
        event: baseEvent,
        activeCount: 30,
        alreadyRegistered: true,
        now: validNow,
        expectedOk: false,
        expectedCode: 'ALREADY_REGISTERED'
      },
      // 10. Precedence: EVENT_NOT_OPEN takes precedence over REGISTRATION_CLOSED
      {
        name: 'cancelled event past deadline returns EVENT_NOT_OPEN',
        event: { ...baseEvent, status: 'CANCELLED' },
        activeCount: 0,
        alreadyRegistered: false,
        now: new Date('2026-11-19T00:00:00.000Z'),
        expectedOk: false,
        expectedCode: 'EVENT_NOT_OPEN'
      }
    ];

    for (const c of cases) {
      const result = checkRegistrationEligibility(
        c.event,
        c.activeCount,
        c.alreadyRegistered,
        c.now
      );

      expect(result.ok, `Case '${c.name}' failed ok check`).toBe(c.expectedOk);
      if (!c.expectedOk && 'code' in result) {
        expect(result.code, `Case '${c.name}' failed code check`).toBe(c.expectedCode);
      }
    }
  });
});
