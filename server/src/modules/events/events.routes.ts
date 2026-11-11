import { Router } from 'express';
import { eventsController } from './events.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { UserRole } from '@prisma/client';

const eventsRouter = Router();
const organizerRouter = Router();

// Event routes
eventsRouter.get('/', requireAuth, (req, res, next) => eventsController.getEvents(req, res, next));
eventsRouter.get('/:id', requireAuth, (req, res, next) => eventsController.getEventById(req, res, next));
eventsRouter.post('/', requireAuth, requireRole(UserRole.ORGANIZER), (req, res, next) => eventsController.createEvent(req, res, next));
eventsRouter.get('/:id/registrations', requireAuth, requireRole(UserRole.ORGANIZER), (req, res, next) => eventsController.getEventRoster(req, res, next));

// Organizer routes
organizerRouter.get('/events', requireAuth, requireRole(UserRole.ORGANIZER), (req, res, next) => eventsController.getOrganizerEvents(req, res, next));

export { eventsRouter, organizerRouter };
