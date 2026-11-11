import { z } from 'zod';
import { EventCategory } from '@prisma/client';

export const createEventSchema = z
  .object({
    title: z.string().min(3).max(120),
    description: z.string().max(2000).default(''),
    category: z.nativeEnum(EventCategory),
    location: z.string().min(1).max(200),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    registrationDeadline: z.string().datetime(),
    capacity: z.number().int().min(1).max(1000)
  })
  .strict();

export type CreateEventInput = z.infer<typeof createEventSchema>;
