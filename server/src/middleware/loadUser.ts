import { RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * Loads current user and authoritative role from PostgreSQL database using session.userId.
 * Identity and role never come from client-provided headers or bodies.
 */
export const loadUser: RequestHandler = async (req, _res, next) => {
  try {
    const userId = req.session?.userId;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          studentNo: user.student_no
        };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
