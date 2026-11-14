import { z } from 'zod';
import { EventCategory } from '@prisma/client';

export const createEventSchema = z
  .object({
    title: z
      .string({ required_error: 'title is required' })
      .trim()
      .min(3, 'title must be at least 3 characters')
      .max(120, 'title must be at most 120 characters'),
    description: z
      .string()
      .max(2000, 'description must be at most 2000 characters')
      .default(''),
    category: z.nativeEnum(EventCategory, {
      errorMap: () => ({ message: 'Invalid event category' })
    }),
    location: z
      .string({ required_error: 'location is required' })
      .trim()
      .min(1, 'location is required')
      .max(200, 'location must be at most 200 characters'),
    startAt: z.string({ required_error: 'startAt is required' }).datetime({ offset: true }),
    endAt: z.string({ required_error: 'endAt is required' }).datetime({ offset: true }),
    registrationDeadline: z
      .string({ required_error: 'registrationDeadline is required' })
      .datetime({ offset: true }),
    capacity: z
      .number({ required_error: 'capacity is required' })
      .int('capacity must be an integer')
      .min(1, 'capacity must be between 1 and 1000')
      .max(1000, 'capacity must be between 1 and 1000')
  })
  .strict();

export type CreateEventInput = z.infer<typeof createEventSchema>;
