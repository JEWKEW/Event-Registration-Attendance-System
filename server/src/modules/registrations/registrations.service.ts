import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { clock } from '../../lib/clock.js';
import { isValidUuid } from '../events/events.service.js';
import { RegistrationStatus, Prisma } from '@prisma/client';
import { checkRegistrationEligibility } from './registrations.validator.js';

export class RegistrationsService {
  async getMyRegistrations(studentId: string) {
    return prisma.registration.findMany({
      where: {
        student_id: studentId,
        status: RegistrationStatus.ACTIVE
      },
      include: {
        event: true
      },
      orderBy: {
        registered_at: 'desc'
      }
    });
  }

  /**
   * Scoped registration query (DEC-14):
   * Accessing another student's registration returns 404 NOT_FOUND to prevent data discovery.
   */
  async getRegistrationById(id: string, studentId: string) {
    if (!isValidUuid(id)) {
      throw new AppError(404, 'NOT_FOUND', 'Registration not found.');
    }

    const registration = await prisma.registration.findFirst({
      where: {
        id,
        student_id: studentId,
        status: RegistrationStatus.ACTIVE
      },
      include: {
        event: true
      }
    });

    if (!registration) {
      throw new AppError(404, 'NOT_FOUND', 'Registration not found.');
    }

    return registration;
  }

  /**
   * Registers a student for an event using a single serializable transaction (DEC-06).
   * Enforces rules BR-03, BR-04, BR-05, and last-seat / same-student race safety.
   */
  async registerForEvent(eventId: string, studentId: string) {
    if (!isValidUuid(eventId)) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found.');
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Serialise competitors on the same event row using SELECT ... FOR UPDATE (DEC-06)
        const events = await tx.$queryRaw<
          Array<{
            id: string;
            status: string;
            start_at: Date;
            end_at: Date;
            registration_deadline: Date;
            capacity: number;
          }>
        >`SELECT id, status, start_at, end_at, registration_deadline, capacity FROM events WHERE id = ${eventId}::uuid FOR UPDATE`;

        if (events.length === 0) {
          throw new AppError(404, 'NOT_FOUND', 'Event not found.');
        }

        const event = events[0];

        // Active registrations count in transaction
        const activeCount = await tx.registration.count({
          where: {
            event_id: eventId,
            status: RegistrationStatus.ACTIVE
          }
        });

        // Check if caller already has active registration
        const existing = await tx.registration.findFirst({
          where: {
            event_id: eventId,
            student_id: studentId,
            status: RegistrationStatus.ACTIVE
          }
        });

        const decision = checkRegistrationEligibility(
          {
            status: event.status,
            startAt: event.start_at,
            endAt: event.end_at,
            registrationDeadline: event.registration_deadline,
            capacity: event.capacity
          },
          activeCount,
          Boolean(existing),
          clock.now()
        );

        if (!decision.ok) {
          throw new AppError(409, decision.code, decision.message);
        }

        const now = clock.now();
        const created = await tx.registration.create({
          data: {
            event_id: eventId,
            student_id: studentId,
            status: RegistrationStatus.ACTIVE,
            registered_at: now
          }
        });

        const newActiveCount = activeCount + 1;
        const remainingSeats = Math.max(0, event.capacity - newActiveCount);

        return {
          registration: {
            id: created.id,
            eventId: created.event_id,
            status: created.status,
            registeredAt: created.registered_at.toISOString()
          },
          event: {
            id: event.id,
            capacity: event.capacity,
            activeCount: newActiveCount,
            remainingSeats
          }
        };
      });
    } catch (err: any) {
      if (
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
        err?.code === 'P2002'
      ) {
        // Unique violation on uq_active_registration partial index (same student race) -> 409
        throw new AppError(409, 'ALREADY_REGISTERED', 'You are already registered for this event.');
      }
      throw err;
    }
  }
}

export const registrationsService = new RegistrationsService();
