import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'email is required' })
      .email('Invalid email address')
      .max(254, 'Email must not exceed 254 characters'),
    password: z
      .string({ required_error: 'password is required' })
      .min(1, 'Password is required')
      .max(128, 'Password must not exceed 128 characters')
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
