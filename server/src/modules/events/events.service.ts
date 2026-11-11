import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { CreateEventInput } from './events.schemas.js';
import { EventStatus, RegistrationStatus } from '@prisma/client';

export class EventsService {
  async getUpcomingEvents() {
    return prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED
      },
      orderBy: { start_at: 'asc' }
    });
  }

  async getEventById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id }
    });
    if (!event) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found.');
    }
    return event;
  }

  async createEvent(organizerId: string, data: CreateEventInput) {
    return prisma.event.create({
      data: {
        organizer_id: organizerId,
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location,
        start_at: new Date(data.startAt),
        end_at: new Date(data.endAt),
        registration_deadline: new Date(data.registrationDeadline),
        capacity: data.capacity,
        status: EventStatus.PUBLISHED,
        published_at: new Date()
      }
    });
  }

  async getOrganizerEvents(organizerId: string) {
    return prisma.event.findMany({
      where: { organizer_id: organizerId },
      orderBy: { start_at: 'desc' }
    });
  }

  async getEventRoster(eventId: string, organizerId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found.');
    }

    // Ownership check (BR-07)
    if (event.organizer_id !== organizerId) {
      throw new AppError(403, 'NOT_EVENT_OWNER', 'You do not own this event.');
    }

    const registrations = await prisma.registration.findMany({
      where: {
        event_id: eventId,
        status: RegistrationStatus.ACTIVE
      },
      include: {
        student: {
          select: {
            id: true,
            display_name: true,
            student_no: true
          }
        }
      },
      orderBy: { registered_at: 'asc' }
    });

    return {
      eventId: event.id,
      title: event.title,
      capacity: event.capacity,
      registrations: registrations.map((r) => ({
        id: r.id,
        registeredAt: r.registered_at.toISOString(),
        student: {
          id: r.student.id,
          displayName: r.student.display_name,
          studentNo: r.student.student_no
        }
      }))
    };
  }
}

export const eventsService = new EventsService();
