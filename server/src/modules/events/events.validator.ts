import { ValidationErrorDetail } from '../../lib/errors.js';

export interface ScheduleInput {
  startAt: string | Date;
  endAt: string | Date;
  registrationDeadline: string | Date;
}

/**
 * Pure function validating event schedule ordering and future-start rules (BR-02).
 * Boundary rules:
 * - registrationDeadline <= startAt (deadline = start is valid, deadline > start is invalid)
 * - startAt < endAt (end = start or end < start is invalid)
 * - startAt > now (start = now is invalid, start = now + 1s is valid)
 */
export function validateSchedule(
  schedule: ScheduleInput,
  now: Date
): ValidationErrorDetail[] {
  const issues: ValidationErrorDetail[] = [];

  const start = new Date(schedule.startAt);
  const end = new Date(schedule.endAt);
  const deadline = new Date(schedule.registrationDeadline);
  const nowTime = now.getTime();

  // BR-02: startAt must be in the future
  if (start.getTime() <= nowTime) {
    issues.push({
      field: 'startAt',
      issue: 'startAt must be in the future'
    });
  }

  // BR-02: startAt < endAt
  if (end.getTime() <= start.getTime()) {
    issues.push({
      field: 'endAt',
      issue: 'endAt must be after startAt'
    });
  }

  // BR-02: registrationDeadline <= startAt
  if (deadline.getTime() > start.getTime()) {
    issues.push({
      field: 'registrationDeadline',
      issue: 'registrationDeadline must be before or equal to startAt'
    });
  }

  return issues;
}
