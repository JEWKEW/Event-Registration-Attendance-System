# E.6 Contract F-06 — Register for Event

| Field | Value |
|---|---|
| Feature | F-06 Register for event (core domain transaction) |
| Requirements | FR-14, BR-03, BR-04, BR-05, BR-06, NFR-05, NFR-09 |
| Depends on | F-05, SR-01 (partial unique index, clock) |
| Issue / branch | #7 · `feature/F-06-register-event` (pair work A+B) |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` |
| TDD | Required. Commit the failing tests TEST-30, 32, 33, 34, 36 before the implementation commit and keep the red run output |

## 1. Feature-level design

**Workflow.** A student on `/events/:id` clicks **Register** and gets `POST /api/events/:id/registrations` with an empty body `{}`. On 201 the UI shows "You're registered ✓". On 409 it shows the mapped message.

**Algorithm (service, single transaction)**
```
BEGIN
  SELECT * FROM events WHERE id = :eventId FOR UPDATE      -- serialises competitors (DEC-06)
  if not found                       -> 404 NOT_FOUND
  SELECT count(*) AS active FROM registrations WHERE event_id = :eventId AND status='ACTIVE'
  SELECT 1 FROM registrations WHERE event_id=:eventId AND student_id=:userId AND status='ACTIVE'
  decision = checkRegistrationEligibility(event, activeCount, alreadyRegistered, clock.now())
  if decision is error               -> ROLLBACK, return mapped 409
  INSERT INTO registrations(event_id, student_id, status, registered_at) VALUES (…,'ACTIVE', now)
COMMIT
-- a unique violation on uq_active_registration (race on the same student) -> 409 ALREADY_REGISTERED
```

**Pure rule function** `checkRegistrationEligibility(event, activeCount, alreadyRegistered, now)`. It checks in this order (the first failure wins, so error codes are deterministic):

| # | Condition | Result |
|---|---|---|
| 1 | `event.status ≠ PUBLISHED` or `now > endAt` | `EVENT_NOT_OPEN` (BR-03) |
| 2 | `now > registrationDeadline` | `REGISTRATION_CLOSED` (BR-03, inclusive deadline) |
| 3 | `alreadyRegistered` | `ALREADY_REGISTERED` (BR-05) |
| 4 | `activeCount ≥ capacity` | `EVENT_FULL` (BR-04) |
| — | otherwise | `OK` |

Duplicate is checked before full, so a registered student retrying on a now-full event gets the more useful message.

**Permissions.** STUDENT only (403 for ORGANIZER, AC-10). `student_id` always = session user (AC-13).

## 2. UI specification

| State | UI |
|---|---|
| Can register | Primary **Register** button. While pending it is disabled with "Registering…" (no double submit) |
| 201 | Button replaced by "You're registered ✓ · View registration". Seats-left count refreshes |
| 409 EVENT_FULL | Alert "Sorry, this event just filled up." Button disabled "Full" |
| 409 ALREADY_REGISTERED | Alert "You're already registered for this event." Shows registered state |
| 409 REGISTRATION_CLOSED / EVENT_NOT_OPEN | Alert "Registration is closed for this event." |

## 3. API specification

**`POST /api/events/:id/registrations`** (STUDENT). Body `{}` (strict).
`201` →
```json
{ "registration": { "id": "uuid", "eventId": "uuid", "status": "ACTIVE", "registeredAt": "2026-11-10T03:15:00.000Z" },
  "event": { "id": "uuid", "capacity": 30, "activeCount": 4, "remainingSeats": 26 } }
```
Errors: `400 VALIDATION_ERROR` (unknown keys) · `401` · `403 FORBIDDEN` · `404 NOT_FOUND` · `409 EVENT_NOT_OPEN | REGISTRATION_CLOSED | ALREADY_REGISTERED | EVENT_FULL`.

## 4. Data specification

Table `registrations` (`0001_init`): `id uuid PK`, `event_id uuid NOT NULL FK events`, `student_id uuid NOT NULL FK users`, `status registration_status NOT NULL DEFAULT 'ACTIVE'` (enum ACTIVE, CANCELLED, CANCELLED_BY_EVENT), `registered_at timestamptz NOT NULL DEFAULT now()`.
Raw SQL:
```sql
CREATE UNIQUE INDEX uq_active_registration ON registrations(event_id, student_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_reg_event_status ON registrations(event_id, status);
```

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-26 | **Given** E-01 is PUBLISHED, before its deadline, with free seats, **when** stu1 registers, **then** the response is 201, an ACTIVE row exists for (E-01, stu1), and `remainingSeats` decreases by exactly 1. |
| AC-27 | **Given** stu1 already has an ACTIVE registration on E-01, **when** stu1 registers again, **then** the response is 409 `ALREADY_REGISTERED` and there is still exactly one ACTIVE row for (E-01, stu1). |
| AC-28 | **Given** E-02 has capacity 1 and 1 ACTIVE registration, **when** another student registers, **then** the response is 409 `EVENT_FULL` and no row is added. |
| AC-29 | **Given** the deadline D, **when** a student registers at `now = D`, **then** it succeeds. At `now = D + 1 s` the response is 409 `REGISTRATION_CLOSED` and no row is added. |
| AC-30 | **Given** an event with status CANCELLED, or one whose `endAt` has passed, **when** a student registers, **then** the response is 409 `EVENT_NOT_OPEN`. |
| AC-31 | **Concurrency:** **given** an event with exactly 1 seat left, **when** 10 different students register concurrently, **then** exactly one gets 201, nine get 409 `EVENT_FULL`, and the ACTIVE count equals capacity. **When** one student sends 5 concurrent requests to an event with seats, **then** exactly one ACTIVE row exists and the others get 409 `ALREADY_REGISTERED`. |
| AC-32 | **UI:** Register shows the registered state on success. On a full event the button is disabled ("Full") and a race-lost 409 shows "Sorry, this event just filled up." |

## 6. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-30 | AC-27, AC-28, AC-29, AC-30 | Unit | Table of (status, now vs deadline/end, alreadyRegistered, activeCount/capacity) incl. boundary `now = deadline`, `activeCount = capacity − 1`, `= capacity` | `checkRegistrationEligibility` | Expected code per row, with precedence as in §1 |
| TEST-31 | AC-26 | API+DB | E capacity 30, 3 active. stu1 session | POST register. Query DB | 201. Row ACTIVE (E, stu1). `remainingSeats` 26 |
| TEST-32 | AC-27 | API+DB | stu1 already ACTIVE on E | POST register | 409 ALREADY_REGISTERED. Active rows for (E, stu1) = 1 |
| TEST-33 | AC-28 | API+DB | E capacity 1 with stu2 ACTIVE | stu1 POST register | 409 EVENT_FULL. Active count = 1 |
| TEST-34 | AC-29 | API+DB | Fake clock. Deadline D | Set now = D → register stu1 (expect 201). Set now = D + 1 s → register stu3 | 201 then 409 REGISTRATION_CLOSED |
| TEST-35 | AC-30 | API+DB | Fixture CANCELLED event. Fixture ended event | Register | 409 EVENT_NOT_OPEN both. No rows |
| TEST-36 | AC-31 | API+DB concurrency | E capacity 5 with 4 active. 10 student sessions logged in first | `Promise.all` 10 POSTs | Exactly one 201, nine 409 EVENT_FULL. DB active count = 5. Repeated 20× in CI-local loop without failure before merge |
| TEST-37 | AC-31 | API+DB concurrency | E capacity 30, stu1 session | `Promise.all` 5 POSTs by stu1 | Exactly one 201, four 409 ALREADY_REGISTERED. Active rows (E, stu1) = 1 |
| TEST-40 | AC-32 | E2E | — | Main journey (register success) | — |
| TEST-41 | AC-32 | E2E | E-02 full (capacity 1, filled in setup) | stu3 opens E-02 | Full badge, disabled button. Forced POST through the UI path shows the full message |

## 7. Definition of Done (feature)

Product DoD plus: TDD evidence (red run of TEST-30/32/33/34/36 at commit `<sha-red>`, green at `<sha-green>`). TEST-36 stable over 20 consecutive runs. Partial unique index present in the migration.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-13 | Initial contract for F-06 |
| 1.1 | 2026-11-28 | Sprint 2 interaction alignment (Hazard #1 / F-08 BR-09): `POST /api/events/:id/registrations` checks event visibility first so a student attempting to register on a `DRAFT` event receives `404 NOT_FOUND` without disclosing its existence. Pure function `checkRegistrationEligibility` retains `EVENT_NOT_OPEN` for `CANCELLED` / `COMPLETED` events. |
