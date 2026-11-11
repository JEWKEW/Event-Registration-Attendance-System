import { describe, it, expect } from 'vitest';
import { validateSchedule } from '../../src/modules/events/events.validator.js';
import { createEventSchema } from '../../src/modules/events/events.schemas.js';

describe('TEST-17: (AC-16) validateSchedule Unit Tests', () => {
  const fixedNow = new Date('2026-11-10T00:00:00.000Z');

  it('valid schedule passes with 0 issues', () => {
    const issues = validateSchedule(
      {
        startAt: '2026-11-12T10:00:00.000Z',
        endAt: '2026-11-12T12:00:00.000Z',
        registrationDeadline: '2026-11-11T10:00:00.000Z'
      },
      fixedNow
    );
    expect(issues).toEqual([]);
  });

  it('end = start produces issue on endAt', () => {
    const issues = validateSchedule(
      {
        startAt: '2026-11-12T10:00:00.000Z',
        endAt: '2026-11-12T10:00:00.000Z',
        registrationDeadline: '2026-11-11T10:00:00.000Z'
      },
      fixedNow
    );
    expect(issues.some((i) => i.field === 'endAt')).toBe(true);
  });

  it('end < start produces issue on endAt', () => {
    const issues = validateSchedule(
      {
        startAt: '2026-11-12T10:00:00.000Z',
        endAt: '2026-11-12T09:00:00.000Z',
        registrationDeadline: '2026-11-11T10:00:00.000Z'
      },
      fixedNow
    );
    expect(issues.some((i) => i.field === 'endAt')).toBe(true);
  });

  it('deadline = start is valid (0 issues)', () => {
    const issues = validateSchedule(
      {
        startAt: '2026-11-12T10:00:00.000Z',
        endAt: '2026-11-12T12:00:00.000Z',
        registrationDeadline: '2026-11-12T10:00:00.000Z'
      },
      fixedNow
    );
    expect(issues).toEqual([]);
  });

  it('deadline = start + 1s produces issue on registrationDeadline', () => {
    const issues = validateSchedule(
      {
        startAt: '2026-11-12T10:00:00.000Z',
        endAt: '2026-11-12T12:00:00.000Z',
        registrationDeadline: '2026-11-12T10:00:01.000Z'
      },
      fixedNow
    );
    expect(issues.some((i) => i.field === 'registrationDeadline')).toBe(true);
  });

  it('start = now is invalid (issue on startAt)', () => {
    const issues = validateSchedule(
      {
        startAt: '2026-11-10T00:00:00.000Z',
        endAt: '2026-11-10T02:00:00.000Z',
        registrationDeadline: '2026-11-09T00:00:00.000Z'
      },
      fixedNow
    );
    expect(issues.some((i) => i.field === 'startAt')).toBe(true);
  });

  it('start = now + 1s is valid (0 issues)', () => {
    const issues = validateSchedule(
      {
        startAt: '2026-11-10T00:00:01.000Z',
        endAt: '2026-11-10T02:00:00.000Z',
        registrationDeadline: '2026-11-10T00:00:00.000Z'
      },
      fixedNow
    );
    expect(issues).toEqual([]);
  });
});

describe('TEST-18: (AC-15) createEventSchema Capacity Boundary Unit Tests', () => {
  const basePayload = {
    title: 'Intro to Workshop',
    description: 'A great workshop',
    category: 'WORKSHOP',
    location: 'Building 1',
    startAt: '2026-11-20T09:00:00.000Z',
    endAt: '2026-11-20T12:00:00.000Z',
    registrationDeadline: '2026-11-18T23:59:00.000Z'
  };

  const cases = [
    { capacity: 0, expectedValid: false },
    { capacity: 1, expectedValid: true },
    { capacity: 1000, expectedValid: true },
    { capacity: 1001, expectedValid: false },
    { capacity: -1, expectedValid: false },
    { capacity: 1.5, expectedValid: false },
    { capacity: 'abc', expectedValid: false }
  ];

  for (const { capacity, expectedValid } of cases) {
    it(`capacity ${capacity} should be ${expectedValid ? 'VALID' : 'INVALID'}`, () => {
      const res = createEventSchema.safeParse({
        ...basePayload,
        capacity
      });
      expect(res.success).toBe(expectedValid);
    });
  }
});
