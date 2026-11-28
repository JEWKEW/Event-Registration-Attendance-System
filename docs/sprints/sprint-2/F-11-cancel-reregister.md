# Contract F-11 — Student Self-Cancel & Re-Register

| Field | Value |
|---|---|
| Feature | F-11 Student cancels own active registration before deadline & can re-register |
| Requirements | `FR-16`, `FR-17`, `BR-08`, `BR-14`, `BR-15` |
| Depends on | `F-06`, `F-07`, `SR-01` |
| Branch | `feature/F-11-cancel-reregister` (from `sprint-2`) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |

## 1. Feature-level design

**Workflow & deterministic check order (single transaction locking the event row).**
```
BEGIN
  SELECT r.*, e.* FROM registrations r JOIN events e ON e.id = r.event_id
   WHERE r.id = :regId AND r.student_id = :userId
  if not found -> 404 NOT_FOUND                              -- BR-08 / DEC-14 (hides other students' IDs)
  SELECT id FROM events WHERE id = r.event_id FOR UPDATE     -- serialises seat release vs concurrent register
  decision = checkCancellationEligibility(registration, event, clock.now())
  -- Check order (first failure wins):
  --   1. registration.status !== 'ACTIVE'        -> 409 INVALID_TRANSITION (Hazard #4)
  --   2. registration.checked_in_at !== null     -> 409 ALREADY_CHECKED_IN (BR-14)
  --   3. now > event.registration_deadline       -> 409 CANCELLATION_CLOSED (BR-14, inclusive at deadline)
  UPDATE registrations SET status = 'CANCELLED', cancelled_at = :now WHERE id = :regId
COMMIT
```

**Re-registration (`FR-17`, `BR-15`).** Uses existing `POST /api/events/:id/registrations`. Because `uq_active_registration` is a partial unique index `WHERE status = 'ACTIVE'`, after self-cancel a student can insert a **new** `ACTIVE` row while the prior `CANCELLED` row remains intact as history, subject to `BR-03`/`BR-04`/`BR-05`.
**Permissions.** `STUDENT` only (`403 FORBIDDEN` for `ORGANIZER`). Cross-student access returns `404 NOT_FOUND`. Strict empty body `{}` rejects unknown keys (`400`).

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/events/:id` & `/me/registrations/:id` | For `ACTIVE` registrations not checked in and before deadline: **Cancel Registration** button with confirmation dialog (disabled while pending). After `200`, status updates to `CANCELLED`, seats-left increments by 1, and `/events/:id` restores the **Register** button (if event is still open and has seats). |
| Error mapping | `CANCELLATION_CLOSED` → *"Cancellation deadline has passed."* · `ALREADY_CHECKED_IN` → *"You have already been checked in and cannot cancel."* |

## 3. API specification

**`POST /api/registrations/:id/cancel`** (`STUDENT`, own). Strict empty body `{}`.
`200` →
```json
{
  "registration": { "id": "uuid", "eventId": "uuid", "status": "CANCELLED", "registeredAt": "…", "cancelledAt": "…" },
  "event": { "id": "uuid", "capacity": 30, "activeCount": 2, "remainingSeats": 28 }
}
```
Errors: `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN` · `404 NOT_FOUND` · `409 INVALID_TRANSITION | ALREADY_CHECKED_IN | CANCELLATION_CLOSED`.

## 4. Data specification

No new migration columns (`registrations.cancelled_at` and partial unique index `uq_active_registration` already exist in `0001_init`). Backed by `0002_sprint2_constraints` (`chk_checkin_active_only`).

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-44** | **Given** `stu1` holds an `ACTIVE`, non-checked-in registration before `registrationDeadline`, **when** `stu1` calls `POST /api/registrations/:id/cancel`, **then** `200`, status becomes `CANCELLED`, `cancelledAt` is set, and event `remainingSeats` increases by 1. |
| **AC-45** | **Given** deadline `D` (fake clock), **when** `stu1` cancels at `now = D`, **then** `200`; at `now = D + 1 s`, **then** `409 CANCELLATION_CLOSED` and row stays `ACTIVE`. |
| **AC-46** | **When** `stu1` cancels an already `CANCELLED` or `CANCELLED_BY_EVENT` registration, **then** `409 INVALID_TRANSITION`. **When** `stu1` tries to cancel a checked-in registration, **then** `409 ALREADY_CHECKED_IN` and row stays `ACTIVE`. |
| **AC-47** | **Given** `stu2`'s registration `R`, **when** `stu1` calls cancel on `R`, **then** `404 NOT_FOUND` and `R` stays `ACTIVE`. `ORGANIZER` → `403 FORBIDDEN`. Anonymous → `401`. Extra body keys → `400`. |
| **AC-48** | **Given** `stu1` self-cancelled on event `E`, **when** `stu1` calls `POST /api/events/E/registrations` while open with seats, **then** `201` with a **new** registration UUID, and DB contains 2 rows for `(E, stu1)` (1 `CANCELLED` + 1 `ACTIVE`). Re-registering when full → `409 EVENT_FULL`; after deadline → `409 REGISTRATION_CLOSED`. |
| **AC-49** | **Concurrency:** **Given** a full event (cap 1, `stu1` active), **when** `stu1` cancels concurrently while 5 other students send `POST /api/events/E/registrations`, **then** at most 1 student succeeds (`201`), all others receive `409 EVENT_FULL`, and DB `activeCount <= capacity`. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-51` | `AC-45`, `AC-46` | Unit | Table of `(status, checkedInAt, now vs deadline)` | `checkCancellationEligibility` | Deterministic error precedence per §1 |
| `TEST-52` | `AC-44` | API+DB | `stu1` `ACTIVE` on event (cap 2, 1 active) | `POST /api/registrations/:id/cancel` | `200`, `CANCELLED`, `cancelledAt` set, `remainingSeats = 2` |
| `TEST-53` | `AC-45` | API+DB | Fake clock at `D` and `D + 1 s` | Cancel at `D` (`stu1`), cancel at `D + 1 s` (`stu2`) | `200`, then `409 CANCELLATION_CLOSED` |
| `TEST-54` | `AC-46` | API+DB | `CANCELLED`, `CANCELLED_BY_EVENT`, and checked-in fixture rows | `POST /api/registrations/:id/cancel` | `409 INVALID_TRANSITION`, `409 INVALID_TRANSITION`, `409 ALREADY_CHECKED_IN` |
| `TEST-55` | `AC-47` | API+DB | `stu2` reg `R`; callers `stu1`, `org1`, anon, spoofed body | `POST /api/registrations/R/cancel` | `404`, `403`, `401`, `400`; `R` unchanged |
| `TEST-56` | `AC-48` | API+DB | `stu1` cancels on `E` | Re-register on open `E`, full `E`, closed `E` | `201` (2 rows in DB with distinct IDs); `409 EVENT_FULL`; `409 REGISTRATION_CLOSED` |
| `TEST-57` | `AC-49` | API+DB concurrency | Cap 1 filled by `stu1`; 1 cancel + 5 student registers | `Promise.all` (verified 20×) | DB `activeCount <= 1`; zero overbooking |
| `TEST-58` | `AC-44`, `AC-48` | E2E | Running app | `stu1` registers → cancels → sees Register button → re-registers | Full UI cycle persists across reload |

## 7. Definition of Done (feature)

Sprint 2 DoD plus: `TEST-51`–`TEST-58` pass; Sprint 1 `TEST-36`/`TEST-37` remain green; DB history query proves 2 rows for re-registered `(event, student)`.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 2 contract for F-11 |
