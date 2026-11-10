import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clock, now } from '../../src/lib/clock.js';

describe('NFR-09 Clock Abstraction', () => {
  beforeEach(() => {
    clock.reset();
  });

  afterEach(() => {
    clock.reset();
    vi.useRealTimers();
  });

  it('returns current date by default', () => {
    const before = new Date();
    const current = now();
    const after = new Date();

    expect(current.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(current.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('allows overriding now() via setNow() for second-accurate deadline testing', () => {
    const fixedDate = new Date('2026-11-20T12:00:00.000Z');
    clock.setNow(fixedDate);

    expect(now().toISOString()).toBe('2026-11-20T12:00:00.000Z');

    clock.reset();
    expect(now().toISOString()).not.toBe('2026-11-20T12:00:00.000Z');
  });

  it('integrates with vi.useFakeTimers() seamlessly', () => {
    const fakeTime = new Date('2026-11-25T08:30:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(fakeTime);

    expect(now().toISOString()).toBe('2026-11-25T08:30:00.000Z');
  });
});
