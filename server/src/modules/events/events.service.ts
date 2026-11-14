import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { clock } from '../../lib/clock.js';
import { CreateEventInput } from './events.schemas.js';
import { validateSchedule } from './events.validator.js';
import { EventStatus, RegistrationStatus, UserRole } from '@prisma/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

export class EventsService {
  async getUpcomingEvents() {
    const now = clock.now();

    const events = await prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        end_at: {
          gt: now
        }
      },
      include: {
        organizer: {
          select: { display_name: true }
        },
        registrations: {
          where: {
            status: RegistrationStatus.ACTIVE
          },
          select: { id: true }
        }
      },
      orderBy: { start_at: 'asc' }
    });

    return events.map((event) => {
      const activeCount = event.registrations.length;
      const remainingSeats = Math.max(0, event.capacity - activeCount);
      const registrationOpen =
        event.status === EventStatus.PUBLISHED &&
        now.getTime() <= event.registration_deadline.getTime() &&
        remainingSeats > 0;

      return {
        id: event.id,
        title: event.title,
        category: event.category,
        location: event.location,
        startAt: event.start_at.toISOString(),
        endAt: event.end_at.toISOString(),
        registrationDeadline: event.registration_deadline.toISOString(),
        capacity: event.capacity,
        activeCount,
        remainingSeats,
        registrationOpen,
        organizerName: event.organizer.display_name
      };
    });
  }

  async getEventById(id: string, user?: { id: string; role: string }) {
    if (!isValidUuid(id)) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found.');
    }

    const now = clock.now();

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { display_name: true }
        },
        registrations: {
          where: {
            status: RegistrationStatus.ACTIVE
          },
          select: { id: true, student_id: true, status: true, registered_at: true }
        }
      }
    });

    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found.');
    }

    const activeCount = event.registrations.length;
    const remainingSeats = Math.max(0, event.capacity - activeCount);
    const registrationOpen =
      event.status === EventStatus.PUBLISHED &&
      now.getTime() <= event.registration_deadline.getTime() &&
      remainingSeats > 0;

    let myRegistration = null;
    if (user && user.role === UserRole.STUDENT) {
      const studentReg = event.registrations.find((r) => r.student_id === user.id);
      if (studentReg) {
        myRegistration = {
          id: studentReg.id,
          status: studentReg.status,
          registeredAt: studentReg.registered_at.toISOString()
        };
      }
    }

    return {
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category,
        location: event.location,
        startAt: event.start_at.toISOString(),
        endAt: event.end_at.toISOString(),
        registrationDeadline: event.registration_deadline.toISOString(),
        capacity: event.capacity,
        status: event.status,
        effectiveStatus: event.status,
        activeCount,
        remainingSeats,
        registrationOpen,
        organizerName: event.organizer.display_name
      },
      myRegistration
    };
  }

  async createEvent(organizerId: string, data: CreateEventInput) {
    const now = clock.now();

    // BR-02 Schedule validation
    const scheduleIssues = validateSchedule(
      {
        startAt: data.startAt,
        endAt: data.endAt,
        registrationDeadline: data.registrationDeadline
      },
      now
    );

    if (scheduleIssues.length > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Schedule validation failed', scheduleIssues);
    }

    const created = await prisma.event.create({
      data: {
        organizer_id: organizerId,
        title: data.title,
        description: data.description || '',
        category: data.category,
        location: data.location,
        start_at: new Date(data.startAt),
        end_at: new Date(data.endAt),
        registration_deadline: new Date(data.registrationDeadline),
        capacity: data.capacity,
        status: EventStatus.PUBLISHED,
        published_at: now
      }
    });

    return {
      id: created.id,
      organizerId: created.organizer_id,
      title: created.title,
      description: created.description,
      category: created.category,
      location: created.location,
      startAt: created.start_at.toISOString(),
      endAt: created.end_at.toISOString(),
      registrationDeadline: created.registration_deadline.toISOString(),
      capacity: created.capacity,
      status: created.status,
      effectiveStatus: created.status,
      publishedAt: created.published_at?.toISOString() || null,
      activeCount: 0,
      remainingSeats: created.capacity,
      registrationOpen: true
    };
  }

  async getOrganizerEvents(organizerId: string) {
    const now = clock.now();

    const events = await prisma.event.findMany({
      where: { organizer_id: organizerId },
      include: {
        registrations: {
          where: { status: RegistrationStatus.ACTIVE },
          select: { id: true }
        }
      },
      orderBy: { start_at: 'asc' }
    });

    return events.map((event) => {
      const activeCount = event.registrations.length;
      const remainingSeats = Math.max(0, event.capacity - activeCount);
      const effectiveStatus =
        event.status === EventStatus.PUBLISHED && now.getTime() > event.end_at.getTime()
          ? 'COMPLETED'
          : event.status;

      return {
        id: event.id,
        organizerId: event.organizer_id,
        title: event.title,
        description: event.description,
        category: event.category,
        location: event.location,
        startAt: event.start_at.toISOString(),
        endAt: event.end_at.toISOString(),
        registrationDeadline: event.registration_deadline.toISOString(),
        capacity: event.capacity,
        status: event.status,
        effectiveStatus,
        publishedAt: event.published_at?.toISOString() || null,
        activeCount,
        remainingSeats
      };
    });
  }

  async getEventRoster(eventId: string, organizerId: string) {
    if (!isValidUuid(eventId)) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found.');
    }

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
            student_no: true,
            email: true
          }
        }
      },
      orderBy: { registered_at: 'asc' }
    });

    return {
      event: {
        id: event.id,
        title: event.title,
        capacity: event.capacity,
        activeCount: registrations.length
      },
      registrations: registrations.map((r) => ({
        id: r.id,
        status: r.status,
        registeredAt: r.registered_at.toISOString(),
        student: {
          id: r.student.id,
          displayName: r.student.display_name,
          studentNo: r.student.student_no,
          email: r.student.email
        }
      }))
    };
  }
}

export const eventsService = new EventsService();
