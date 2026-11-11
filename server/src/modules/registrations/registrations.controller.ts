import { Request, Response, NextFunction } from 'express';
import { registerSchema } from './registrations.schemas.js';
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
      // Validate schema (rejects any spoofed studentId with 400)
      registerSchema.parse(req.body);
      const studentId = req.user!.id;
      const eventId = req.params.id;
      const registration = await registrationsService.register(studentId, eventId);
      res.status(201).json({ registration });
    } catch (err) {
      next(err);
    }
  }
}

export const registrationsController = new RegistrationsController();
