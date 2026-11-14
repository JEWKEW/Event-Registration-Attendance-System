export type RegistrationDecision =
  | { ok: true }
  | {
      ok: false;
      code: 'EVENT_NOT_OPEN' | 'REGISTRATION_CLOSED' | 'ALREADY_REGISTERED' | 'EVENT_FULL';
      message: string;
    };

export interface EventForEligibility {
  status: string;
  startAt: Date;
  endAt: Date;
  registrationDeadline: Date;
  capacity: number;
}

/**
 * Pure rule function for registration eligibility (BR-03, BR-04, BR-05).
 * Order of evaluation:
 * 1. event.status != PUBLISHED or now > endAt -> EVENT_NOT_OPEN
 * 2. now > registrationDeadline -> REGISTRATION_CLOSED (inclusive deadline)
 * 3. alreadyRegistered -> ALREADY_REGISTERED (checked before EVENT_FULL)
 * 4. activeCount >= capacity -> EVENT_FULL
 * otherwise -> OK
 */
export function checkRegistrationEligibility(
  event: EventForEligibility,
  activeCount: number,
  alreadyRegistered: boolean,
  now: Date
): RegistrationDecision {
  // 1. Status != PUBLISHED or now > endAt
  if (event.status !== 'PUBLISHED' || now.getTime() > event.endAt.getTime()) {
    return {
      ok: false,
      code: 'EVENT_NOT_OPEN',
      message: 'Event is not open for registration.'
    };
  }

  // 2. now > registrationDeadline (inclusive deadline: now <= deadline is accepted)
  if (now.getTime() > event.registrationDeadline.getTime()) {
    return {
      ok: false,
      code: 'REGISTRATION_CLOSED',
      message: 'Registration is closed for this event.'
    };
  }

  // 3. alreadyRegistered (BR-05) - checked before full
  if (alreadyRegistered) {
    return {
      ok: false,
      code: 'ALREADY_REGISTERED',
      message: 'You are already registered for this event.'
    };
  }

  // 4. activeCount >= capacity (BR-04)
  if (activeCount >= event.capacity) {
    return {
      ok: false,
      code: 'EVENT_FULL',
      message: 'This event is full.'
    };
  }

  return { ok: true };
}
