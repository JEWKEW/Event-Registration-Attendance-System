let customNow: Date | null = null;

/**
 * Clock abstraction for deterministic time testing (NFR-09).
 * By default returns new Date() (evaluated by system/Vitest fake timers).
 * Can be explicitly overridden with setNow() for precise test assertions.
 */
export const clock = {
  now(): Date {
    if (customNow !== null) {
      return new Date(customNow.getTime());
    }
    return new Date();
  },
  setNow(date: Date | string | number | null): void {
    if (date === null) {
      customNow = null;
    } else {
      customNow = new Date(date);
    }
  },
  reset(): void {
    customNow = null;
  }
};

export const now = (): Date => clock.now();
