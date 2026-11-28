# Contract F-10 — Cancel Event with Atomic Cascade (Featured TDD #1)

| Field | Value |
|---|---|
| Feature | F-10 Organizer cancels published event with reason & atomic `CANCELLED_BY_EVENT` cascade |
| Requirements | `FR-08`, `BR-07`, `BR-10`, `BR-13` |
| Depends on | `F-08` (transition guard), `SR-01` (migration `0002_sprint2_constraints`) |
| Branch | `feature/F-10-cancel-event` (from `sprint-2`) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |
| **TDD Requirement** | **Featured Sprint 2 TDD chain #1.** Commit failing tests (`TEST-80`, `TEST-81`, `TEST-83`, `TEST-84`, `TEST-85`) **before** implementation; preserve red output + commit SHA and green output + commit SHA for Deliverable 2 Part B & PDF excerpts. |

## 1. Feature-level design

**Workflow & atomic transaction.**
```
BEGIN
  SELECT * FROM events WHERE id = :eventId FOR UPDATE
  if not found -> 404 NOT_FOUND
  if event.organizer_id !== req.user.id -> 403 NOT_EVENT_OWNER
  effectiveStatus = deriveEffectiveStatus(event, now)
  assertTransition(event.status, effectiveStatus, 'CANCEL')  -- allows ONLY PUBLISHED (not COMPLETED); DRAFT/CANCELLED/COMPLETED -> 409 INVALID_TRANSITION
  UPDATE events
     SET status = 'CANCELLED', cancel_reason = :trimmedReason, cancelled_at = :now, updated_at = :now
   WHERE id = :eventId
  UPDATE registrations
     SET status = 'CANCELLED_BY_EVENT', cancelled_at = :now, checked_in_at = NULL, checked_in_by = NULL
   WHERE event_id = :eventId AND status = 'ACTIVE'
  -- Note: clearing checked_in_at satisfies chk_checkin_active_only if an in-progress event is cancelled
  -- Registrations already in status 'CANCELLED' (self-cancelled) remain untouched
COMMIT
```

**Validation (`BR-13`).** Strict Zod schema `{ reason: string }`, trimmed, `1 <= reason.length <= 500`. Missing, empty, whitespace-only, > 500 chars, or unknown keys → `400 VALIDATION_ERROR`.
**In-progress events.** A `PUBLISHED` event that has started (`startAt <= now <= endAt`) is not yet `COMPLETED` and may still be cancelled; any checked-in `ACTIVE` registrations transition to `CANCELLED_BY_EVENT` with `checked_in_at`/`checked_in_by` cleared so `chk_checkin_active_only` holds.
**Permissions.** `ORGANIZER` only (`403 FORBIDDEN` for `STUDENT`), owner only (`403 NOT_EVENT_OWNER`).

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/organizer/events/:id` | For active `PUBLISHED` events: **Cancel Event** button opens modal/panel with required Reason textarea (1–500 chars counter) + confirm button (disabled while pending). On `200`, shows `CANCELLED` badge, reason, and count of affected registrations. |
| `/events/:id` & `/me/registrations` | Students see `Cancelled by organizer` badge and the organizer's `cancelReason` on both event detail and their `CANCELLED_BY_EVENT` registration record. Cancelled events disappear from `/events` upcoming list. |

## 3. API specification

**`POST /api/events/:id/cancel`** (`ORGANIZER`, owner)
Request (strict): `{ "reason": "Venue closed due to heavy rain" }`
`200` →
```json
{
  "event": { "id": "uuid", "status": "CANCELLED", "effectiveStatus": "CANCELLED", "cancelReason": "Venue closed due to heavy rain", "cancelledAt": "2026-11-28T10:00:00.000Z", "activeCount": 0, "remainingSeats": 0, "registrationOpen": false },
  "affectedRegistrations": 2
}
```
Errors: `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN` · `403 NOT_EVENT_OWNER` · `404 NOT_FOUND` · `409 INVALID_TRANSITION`.

## 4. Data specification

Uses `events.cancel_reason`, `events.cancelled_at`, `registrations.cancelled_at` from `0001_init`, backed by `0002_sprint2_constraints`:
- `chk_cancel_reason_len`: `cancel_reason IS NULL OR char_length(btrim(cancel_reason)) BETWEEN 1 AND 500`
- `chk_cancelled_has_reason`: `status <> 'CANCELLED' OR (cancel_reason IS NOT NULL AND cancelled_at IS NOT NULL)`
- `chk_checkin_active_only`: `checked_in_at IS NULL OR status = 'ACTIVE'`

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-65** | **Given** `org1`'s `PUBLISHED` event with 2 `ACTIVE` registrations and 1 prior self-`CANCELLED` registration, **when** `org1` cancels with a valid reason, **then** `200`, `affectedRegistrations = 2`, event is `CANCELLED` with trimmed `cancelReason` & `cancelledAt`, both `ACTIVE` rows become `CANCELLED_BY_EVENT` with `cancelledAt`, and the prior self-`CANCELLED` row stays `CANCELLED`. |
| **AC-66** | **When** `reason` is missing, `""`, `"   "`, or 501 chars, **then** `400 VALIDATION_ERROR` (field `reason`) and DB is unchanged. A 500-char reason succeeds (`200`). |
| **AC-67** | **Atomicity:** **Given** a fault injected during the registration-cascade step inside the transaction, **when** `cancelEvent` runs, **then** the transaction rolls back completely: the event stays `PUBLISHED` (`cancel_reason = null`) and all `ACTIVE` registrations remain `ACTIVE`. |
| **AC-68** | **Given** a `DRAFT`, already `CANCELLED`, or `COMPLETED` (`now > endAt`) event, **when** `org1` calls cancel, **then** `409 INVALID_TRANSITION` and DB is unchanged. |
| **AC-69** | **Given** `org2`, `stu1`, anonymous, or unknown body keys, **when** calling cancel, **then** `403 NOT_EVENT_OWNER` / `403 FORBIDDEN` / `401` / `400` and DB is unchanged. |
| **AC-70** | **Given** a cancelled event, **then** it disappears from `GET /api/events`, affected students see `status: "CANCELLED_BY_EVENT"` and `event.cancelReason` in `GET /api/me/registrations` and `GET /api/events/:id`, and attempting `POST /api/events/:id/registrations` returns `409 EVENT_NOT_OPEN`. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-80` | `AC-66` | Unit | Reasons: missing, `""`, `"   "`, `"a".repeat(501)`, `"a".repeat(500)`, `"  valid  "` | `cancelEventSchema.safeParse` | Only 500-char and trimmed `"valid"` succeed |
| `TEST-81` | `AC-65` | API+DB | `org1` event with 2 `ACTIVE` + 1 `CANCELLED` reg | `POST /api/events/:id/cancel` | `200`, `affectedRegistrations = 2`, DB statuses verified |
| `TEST-82` | `AC-66` | API+DB | `org1` event | `POST` invalid reasons (`""`, `"   "`, 501 chars) & 500-char boundary | `400` on invalid (DB intact); `200` on 500 chars |
| `TEST-83` | `AC-67` | Integration (fault-injection) | Service called with injected failure on cascade update | `cancelEvent(...)` | Rejects; DB event still `PUBLISHED` and registrations still `ACTIVE` *(PDF domain-rule excerpt candidate)* |
| `TEST-84` | `AC-68` | API+DB | `DRAFT`, `CANCELLED`, and `COMPLETED` (fake clock) events | `POST /api/events/:id/cancel` | `409 INVALID_TRANSITION` all 3 |
| `TEST-85` | `AC-69` | API+DB | `org2`, `stu1`, no session, extra body key | `POST /api/events/:id/cancel` | `403 NOT_EVENT_OWNER`, `403 FORBIDDEN`, `401`, `400`; event still `PUBLISHED` |
| `TEST-86` | `AC-70` | API+DB | Cancelled event + affected `stu1` | `GET /api/events`, `GET /api/me/registrations`, `GET /api/events/:id`, `POST register` | Omitted from upcoming; reason visible; register → `409 EVENT_NOT_OPEN` |
| `TEST-87` | `AC-65`, `AC-70` | E2E | Running app | `org1` cancels with reason → `stu1` verifies Cancelled badge + reason | UI & persistence match |

## 7. Definition of Done (feature)

Sprint 2 DoD plus: TDD red commit SHA (`TEST-80`, `81`, `83`, `84`, `85` failing before implementation) and green commit SHA recorded; `TEST-83` rollback excerpt ready for Deliverable 2 PDF.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 2 contract for F-10 |
