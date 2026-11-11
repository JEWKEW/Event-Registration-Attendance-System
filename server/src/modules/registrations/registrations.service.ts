import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { RegistrationStatus } from '@prisma/client';

export class RegistrationsService {
  async getMyRegistrations(studentId: string) {
    return prisma.registration.findMany({
      where: {
        student_id: studentId
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
    const registration = await prisma.registration.findFirst({
      where: {
        id,
        student_id: studentId
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

  async register(studentId: string, eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new AppError(404, 'NOT_FOUND', 'Event not found.');
    }

    return prisma.registration.create({
      data: {
        event_id: eventId,
        student_id: studentId,
        status: RegistrationStatus.ACTIVE
      }
    });
  }
}

export const registrationsService = new RegistrationsService();
