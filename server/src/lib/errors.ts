export interface ValidationErrorDetail {
  field: string;
  issue: string;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_EVENT_OWNER'
  | 'NOT_FOUND'
  | 'EVENT_FULL'
  | 'ALREADY_REGISTERED'
  | 'REGISTRATION_CLOSED'
  | 'EVENT_NOT_OPEN'
  | 'INVALID_TRANSITION'
  | 'CAPACITY_BELOW_REGISTERED'
  | 'FIELD_LOCKED'
  | 'CANCELLATION_CLOSED'
  | 'ALREADY_CHECKED_IN'
  | 'CHECKIN_WINDOW_CLOSED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details: ValidationErrorDetail[];

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details: ValidationErrorDetail[] = []
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
