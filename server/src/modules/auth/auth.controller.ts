import { Request, Response, NextFunction } from 'express';
import { loginSchema } from './auth.schemas.js';
import { authService } from './auth.service.js';
import { AppError } from '../../lib/errors.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const user = await authService.login(input.email, input.password);

      // Session regeneration prevents session fixation attacks (SDS C.6)
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      req.session.userId = user.id;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.session) {
        await new Promise<void>((resolve, reject) => {
          req.session.destroy((err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }

      res.clearCookie('sid', { path: '/' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');
      }

      const user = await authService.getMe(userId);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
