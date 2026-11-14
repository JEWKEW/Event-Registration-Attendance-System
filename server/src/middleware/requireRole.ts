import { RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from '../lib/errors.js';

/**
 * Ensures user has one of the allowed roles.
 * Unauthenticated -> 401 UNAUTHENTICATED
 * Unauthorized role -> 403 FORBIDDEN
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Forbidden resource.'));
    }

    next();
  };
}
