import { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

/**
 * Ensures request has an authenticated session.
 * Rejects unauthenticated requests with 401 UNAUTHENTICATED.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));
  }
  next();
};
