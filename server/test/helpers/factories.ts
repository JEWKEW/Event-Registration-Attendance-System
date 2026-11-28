import { EventCategory, EventStatus, RegistrationStatus, type Event, type Registration } from '@prisma/client';
import { prisma } from '../../src/lib/prisma.js';
import { clock } from '../../src/lib/clock.js';
import { TEST_USERS } from './db.js';

export interface MakeEventInput {
  id?: string;
  organizerId?: string;
  title?: string;
  description?: string;
  category?: EventCategory;
  location?: string;
  capacity?: number;
  status?: EventStatus;
  startAt?: Date;
  endAt?: Date;
  registrationDeadline?: Date;
  publishedAt?: Date | null;
  cancelReason?: string | null;
  cancelledAt?: Date | null;
}

export async function makeEvent(overrides: MakeEventInput = {}): Promise<Event> {
  const now = clock.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;

  const status = overrides.status ?? EventStatus.PUBLISHED;
  const startAt = overrides.startAt ?? new Date(now.getTime() + 5 * dayMs);
  const endAt = overrides.endAt ?? new Date(startAt.getTime() + 2 * hourMs);
  const registrationDeadline =
    overrides.registrationDeadline ?? new Date(startAt.getTime() - dayMs);

  const publishedAt =
    overrides.publishedAt !== undefined
      ? overrides.publishedAt
      : status === EventStatus.DRAFT
        ? null
        : new Date(now.getTime() - hourMs);

  const cancelReason =
    overrides.cancelReason !== undefined
      ? overrides.cancelReason
      : status === EventStatus.CANCELLED
        ? 'Cancelled in test fixture'
        : null;

  const cancelledAt =
    overrides.cancelledAt !== undefined
      ? overrides.cancelledAt
      : status === EventStatus.CANCELLED
        ? now
        : null;

  return prisma.event.create({
    data: {
      ...(overrides.id ? { id: overrides.id } : {}),
      organizer_id: overrides.organizerId ?? TEST_USERS.org1.id,
      title: overrides.title ?? 'Factory Test Event',
      description: overrides.description ?? 'Synthetic event created by test factory.',
      category: overrides.category ?? EventCategory.WORKSHOP,
      location: overrides.location ?? 'CB2-301',
      capacity: overrides.capacity ?? 10,
      status,
      start_at: startAt,
      end_at: endAt,
      registration_deadline: registrationDeadline,
      published_at: publishedAt,
      cancel_reason: cancelReason,
      cancelled_at: cancelledAt
    }
  });
}

export interface MakeRegistrationInput {
  id?: string;
  eventId: string;
  studentId?: string;
  status?: RegistrationStatus;
  registeredAt?: Date;
  cancelledAt?: Date | null;
  checkedInAt?: Date | null;
  checkedInBy?: string | null;
}

export async function makeRegistration(overrides: MakeRegistrationInput): Promise<Registration> {
  const now = clock.now();
  const status = overrides.status ?? RegistrationStatus.ACTIVE;

  const cancelledAt =
    overrides.cancelledAt !== undefined
      ? overrides.cancelledAt
      : status === RegistrationStatus.ACTIVE
        ? null
        : now;

  return prisma.registration.create({
    data: {
      ...(overrides.id ? { id: overrides.id } : {}),
      event_id: overrides.eventId,
      student_id: overrides.studentId ?? TEST_USERS.stu1.id,
      status,
      registered_at: overrides.registeredAt ?? now,
      cancelled_at: cancelledAt,
      checked_in_at: overrides.checkedInAt ?? null,
      checked_in_by: overrides.checkedInBy ?? null
    }
  });
}
