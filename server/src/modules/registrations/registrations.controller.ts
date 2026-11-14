import { Request, Response, NextFunction } from 'express';
import { registerEventSchema } from './registrations.schemas.js';
import { registrationsService } from './registrations.service.js';

export class RegistrationsController {
  async getMyRegistrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;
      const registrations = await registrationsService.getMyRegistrations(studentId);
      res.status(200).json({ registrations });
    } catch (err) {
      next(err);
    }
  }

  async getRegistrationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;
      const registration = await registrationsService.getRegistrationById(req.params.id, studentId);
      res.status(200).json({ registration });
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      registerEventSchema.parse(req.body ?? {});
      const eventId = req.params.id;
      const studentId = req.user!.id;
      const result = await registrationsService.registerForEvent(eventId, studentId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const registrationsController = new RegistrationsController();
