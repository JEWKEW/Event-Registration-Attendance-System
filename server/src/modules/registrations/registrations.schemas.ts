import { z } from 'zod';

export const registerSchema = z.object({}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
