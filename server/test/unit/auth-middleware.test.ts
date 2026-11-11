import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../../src/middleware/requireRole.js';
import { AppError } from '../../src/lib/errors.js';
import { UserRole } from '@prisma/client';

describe('TEST-16: (AC-09, AC-10) requireRole Middleware Unit Test', () => {
  const middleware = requireRole(UserRole.ORGANIZER);

  it('calls next() without error when user has ORGANIZER role', () => {
    const req: any = {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'org1@demo.kmutt.test',
        displayName: 'Organizer One',
        role: UserRole.ORGANIZER,
        studentNo: null
      }
    };
    const res: any = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes AppError(403) when user has STUDENT role', () => {
    const req: any = {
      user: {
        id: '33333333-3333-4333-8333-333333333331',
        email: 'stu1@demo.kmutt.test',
        displayName: 'Student One',
        role: UserRole.STUDENT,
        studentNo: '65000001'
      }
    };
    const res: any = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('passes AppError(401) when user is not present (unauthenticated)', () => {
    const req: any = {};
    const res: any = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHENTICATED');
  });
});
