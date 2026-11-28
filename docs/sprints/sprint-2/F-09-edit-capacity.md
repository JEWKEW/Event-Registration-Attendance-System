# Contract F-09 — Edit Event & Capacity Change

| Field | Value |
|---|---|
| Feature | F-09 Edit own event with locked-field rules & transactional capacity-decrease guard |
| Requirements | `FR-06`, `FR-07`, `BR-01`, `BR-02`, `BR-07`, `BR-11`, `BR-12` |
| Depends on | `F-08` (lifecycle & `effectiveStatus`), `SR-01` |
| Branch | `feature/F-09-edit-capacity` (from `sprint-2`) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |

## 1. Feature-level design

**Workflow & algorithm (single transaction with `FOR UPDATE`).**
```
BEGIN
  SELECT * FROM events WHERE id = :eventId FOR UPDATE     -- serialises against concurrent register (Hazard #6)
  if not found -> 404 NOT_FOUND
  if event.organizer_id !== req.user.id -> 403 NOT_EVENT_OWNER
  effectiveStatus = deriveEffectiveStatus(event, now)
  if effectiveStatus in ('CANCELLED', 'COMPLETED') -> 409 INVALID_TRANSITION
  SELECT count(*) AS activeCount FROM registrations WHERE event_id = :eventId AND status = 'ACTIVE'
  if activeCount >= 1 and (patch changes startAt or patch changes endAt) -> 409 FIELD_LOCKED  (Hazard #3: same timestamp allowed)
  merged = merge(event, patch)
  validate merged capacity (BR-01: 1..1000) and schedule ordering (BR-02: deadline <= startAt < endAt; if PUBLISHED and startAt changed, startAt > now) -> 400 VALIDATION_ERROR
  if merged.capacity < activeCount -> 409 CAPACITY_BELOW_REGISTERED  (BR-11)
  UPDATE events SET ... , updated_at = now WHERE id = :eventId
COMMIT
```

**Validation.** Strict partial Zod schema accepting only `title`, `description`, `category`, `location`, `startAt`, `endAt`, `registrationDeadline`, `capacity` (at least one key present). Unknown keys (`organizerId`, `status`, `publishedAt`, `cancelReason`) → `400 VALIDATION_ERROR` (`DEC-15`).
**Permissions.** `ORGANIZER` only (`403 FORBIDDEN` for `STUDENT`), owner only (`403 NOT_EVENT_OWNER` for other organizers).

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/organizer/events/:id/edit` | Pre-filled form with all editable fields. When `activeCount >= 1`, `startAt` and `endAt` inputs show a lock hint (*"Locked because students are already registered"*) and are disabled/read-only (server still enforces `409 FIELD_LOCKED`). Capacity helper shows `"Minimum allowed: <activeCount>"`. Maps `409 CAPACITY_BELOW_REGISTERED`, `409 FIELD_LOCKED`, `409 INVALID_TRANSITION`, and `400 VALIDATION_ERROR` inline without clearing form values. |
| `/organizer/events/:id` | Adds **Edit Event** button for `DRAFT` and active `PUBLISHED` events (hidden for `CANCELLED`/`COMPLETED`). |

## 3. API specification

**`PATCH /api/events/:id`** (`ORGANIZER`, owner)
Request (strict partial, ≥ 1 field):
```json
{ "title": "Updated Git Workshop", "capacity": 40, "location": "CB2305" }
```
`200` → `{ "event": { ...full event DTO with updated activeCount, remainingSeats, effectiveStatus, updatedAt... } }`
Errors: `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN` · `403 NOT_EVENT_OWNER` · `404 NOT_FOUND` · `409 INVALID_TRANSITION | FIELD_LOCKED | CAPACITY_BELOW_REGISTERED`.

## 4. Data specification

No new schema migration required. Uses `events` table, `chk_capacity`, `chk_schedule`, and row lock `SELECT ... FOR UPDATE`.

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-58** | **Given** `org1`'s editable `DRAFT` or `PUBLISHED` event, **when** `org1` patches title/description/category/location/deadline, **then** `200`, DB row persists changes, and `updatedAt` advances. |
| **AC-59** | **Given** an event with `activeCount = 3`, **when** `org1` increases capacity to `10` or decreases to `3`, **then** `200`; decreasing to `2` returns `409 CAPACITY_BELOW_REGISTERED`; `0` or `1001` returns `400 VALIDATION_ERROR`. |
| **AC-60** | **Given** an event with `activeCount >= 1`, **when** `org1` changes `startAt` or `endAt`, **then** `409 FIELD_LOCKED`. Sending the *unchanged* `startAt`/`endAt` alongside a title change returns `200`. When `activeCount = 0` (including when all prior registrations were cancelled), changing `startAt`/`endAt` succeeds (`200`). |
| **AC-61** | **When** the merged event violates `registrationDeadline <= startAt < endAt` (e.g., patching deadline past existing `startAt`), **then** `400 VALIDATION_ERROR` and DB is unchanged. |
| **AC-62** | **Given** a `CANCELLED` or `COMPLETED` (`now > endAt`) event, **when** `org1` sends `PATCH`, **then** `409 INVALID_TRANSITION` and DB is unchanged. |
| **AC-63** | **Given** `org2`, `stu1`, anonymous, or a payload with `organizerId`/`status`, **when** calling `PATCH /api/events/:id`, **then** `403 NOT_EVENT_OWNER` / `403 FORBIDDEN` / `401` / `400` and DB is unchanged. |
| **AC-64** | **Concurrency:** **Given** an event with capacity `6` and `1` active registration, **when** `org1` concurrently patches capacity down to `3` while `5` students register via `Promise.all`, **then** every interleaving terminates with `activeCount <= capacity` in the database (zero overbooking). |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-70` | `AC-59`, `AC-60`, `AC-61`, `AC-62` | Unit | Pure `validateEventPatch(event, patch, activeCount, now)` table | Run all rule combinations | Exact allow/error codes (`FIELD_LOCKED`, `CAPACITY_BELOW_REGISTERED`, `INVALID_TRANSITION`, `VALIDATION_ERROR`) |
| `TEST-71` | `AC-58` | API+DB | `org1` `PUBLISHED` event | `PATCH` title/location/deadline; re-query DB | `200`, updated fields & `updatedAt` persisted |
| `TEST-72` | `AC-59` | API+DB | Event with 3 `ACTIVE` registrations | `PATCH` capacity `10`, `3`, `2`, `0`, `1001` | `200`, `200`, `409 CAPACITY_BELOW_REGISTERED`, `400`, `400` |
| `TEST-73` | `AC-60` | API+DB | Event with 1 `ACTIVE` registration | `PATCH` new `startAt`; `PATCH` new `endAt`; `PATCH` same `startAt` + new title | `409 FIELD_LOCKED`, `409 FIELD_LOCKED`, `200` |
| `TEST-74` | `AC-60` | API+DB | Event with 1 `CANCELLED` registration (0 `ACTIVE`) | `PATCH` new future `startAt` & `endAt` | `200`, timestamps updated |
| `TEST-75` | `AC-61` | API+DB | Existing event | `PATCH` `registrationDeadline > startAt` | `400 VALIDATION_ERROR`, row unchanged |
| `TEST-76` | `AC-62` | API+DB | `CANCELLED` event; `COMPLETED` event (fake clock `> endAt`) | `PATCH` title | `409 INVALID_TRANSITION` both |
| `TEST-77` | `AC-63` | API+DB | `org2`, `stu1`, no cookie, spoofed `status`/`organizerId` | `PATCH /api/events/:id` | `403 NOT_EVENT_OWNER`, `403 FORBIDDEN`, `401`, `400` |
| `TEST-78` | `AC-64` | API+DB concurrency | Cap 6, 1 active; 1 `PATCH cap=3` + 5 student `POST register` | `Promise.all` (verified 20×) | Final DB satisfies `activeCount <= capacity` every run |
| `TEST-79` | `AC-58`, `AC-60` | E2E | Running app, event with 1 registrant | Edit title via `/organizer/events/:id/edit`; verify locked schedule indicator | Title updates cleanly and persists after reload |

## 7. Definition of Done (feature)

Sprint 2 DoD plus: `TEST-70`–`TEST-79` pass; `TEST-78` stable over 20 consecutive runs; `PATCH` route uses `SELECT ... FOR UPDATE`.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 2 contract for F-09 |
