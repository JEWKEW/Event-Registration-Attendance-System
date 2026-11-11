import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const details = err.errors.flatMap((e) => {
      if (e.code === 'unrecognized_keys') {
        return (e as any).keys.map((k: string) => ({
          field: k,
          issue: 'Unrecognized key'
        }));
      }
      return [
        {
          field: e.path.join('.'),
          issue: e.message
        }
      ];
    });

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details
      }
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  // Fallback for unhandled / internal errors (NFR-12)
  console.error('Unhandled internal error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred.',
      details: []
    }
  });
};
