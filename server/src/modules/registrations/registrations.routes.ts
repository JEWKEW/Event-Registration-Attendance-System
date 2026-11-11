import { Router } from 'express';
import { registrationsController } from './registrations.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { UserRole } from '@prisma/client';

const meRouter = Router();
const registrationsRouter = Router();
const eventRegistrationsRouter = Router();

// /api/me/registrations
meRouter.get('/registrations', requireAuth, requireRole(UserRole.STUDENT), (req, res, next) =>
  registrationsController.getMyRegistrations(req, res, next)
);

// /api/registrations/:id
registrationsRouter.get('/:id', requireAuth, requireRole(UserRole.STUDENT), (req, res, next) =>
  registrationsController.getRegistrationById(req, res, next)
);

// /api/events/:id/registrations
eventRegistrationsRouter.post('/:id/registrations', requireAuth, requireRole(UserRole.STUDENT), (req, res, next) =>
  registrationsController.register(req, res, next)
);

export { meRouter, registrationsRouter, eventRegistrationsRouter };
