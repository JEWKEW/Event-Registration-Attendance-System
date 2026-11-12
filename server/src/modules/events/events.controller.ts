import { Request, Response, NextFunction } from 'express';
import { createEventSchema } from './events.schemas.js';
import { eventsService } from './events.service.js';

export class EventsController {
  async getEvents(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await eventsService.getUpcomingEvents();
      res.status(200).json({ events });
    } catch (err) {
      next(err);
    }
  }

  async getEventById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await eventsService.getEventById(req.params.id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = createEventSchema.parse(req.body);
      const organizerId = req.user!.id;
      const event = await eventsService.createEvent(organizerId, input);
      res.status(201).json({ event });
    } catch (err) {
      next(err);
    }
  }

  async getOrganizerEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizerId = req.user!.id;
      const events = await eventsService.getOrganizerEvents(organizerId);
      res.status(200).json({ events });
    } catch (err) {
      next(err);
    }
  }

  async getEventRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params.id;
      const organizerId = req.user!.id;
      const roster = await eventsService.getEventRoster(eventId, organizerId);
      res.status(200).json(roster);
    } catch (err) {
      next(err);
    }
  }
}

export const eventsController = new EventsController();
