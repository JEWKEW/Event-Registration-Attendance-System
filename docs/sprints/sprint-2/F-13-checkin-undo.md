# Contract F-13 — Organizer Check-In & Undo (Featured TDD #2)

| Field | Value |
|---|---|
| Feature | F-13 Organizer checks registered students in and undoes check-in from roster within window |
| Requirements | `FR-18`, `FR-19`, `BR-07`, `BR-16`, `BR-17` |
| Depends on | `F-04`, `F-06`, `SR-01` (clock, migration `0002_sprint2_constraints`, seed `E-07`) |
| Branch | `feature/F-13-checkin-undo` (from `sprint-2`) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |
| **TDD Requirement** | **Featured Sprint 2 TDD chain #2.** Commit failing tests (`TEST-59`, `TEST-61`, `TEST-62`, `TEST-64`, `TEST-66`) **before** implementation; preserve red/green outputs and SHAs. `TEST-66` (cross-owner check-in denial) serves as the required access-restriction automated test excerpt in Deliverable 2 PDF. |

## 1. Feature-level design

**Pure rule function:** `checkCheckInEligibility(event, registration, action: 'CHECK_IN' | 'UNDO', now)`
Checks in deterministic order (first failure wins):
1. `event.status !== 'PUBLISHED'` → `409 EVENT_NOT_OPEN` (Hazard #5 — blocks `DRAFT`/`CANCELLED`)
2. `registration.status !== 'ACTIVE'` → `409 INVALID_TRANSITION` (blocks `CANCELLED`/`CANCELLED_BY_EVENT`)
3. Window check: `windowStart = event.startAt - 60 minutes`, `windowEnd = event.endAt`. If `now < windowStart || now > windowEnd` → `409 CHECKIN_WINDOW_CLOSED` (inclusive boundaries: `now === windowStart` and `now === windowEnd` are allowed!).
4. If `action === 'CHECK_IN'` and `registration.checkedInAt !== null` → `409 ALREADY_CHECKED_IN` (`BR-16`).
5. If `action === 'UNDO'` and `registration.checkedInAt === null` → `409 INVALID_TRANSITION` (reuses SDS C.4 error code).

**Concurrency safety (double check-in):** `POST /api/registrations/:id/check-in` performs a conditional atomic update (`UPDATE registrations SET checked_in_at = :now, checked_in_by = :userId WHERE id = :id AND status = 'ACTIVE' AND checked_in_at IS NULL`). If `updatedCount === 0`, return `409 ALREADY_CHECKED_IN`. Two concurrent check-in requests therefore produce exactly one `200` and one `409`.

**Ownership & authorization (`BR-07`, `DEC-14`):**
- Load registration joined with its event (`404 NOT_FOUND` if registration ID does not exist or is malformed).
- Verify `event.organizer_id === req.user.id` (`403 NOT_EVENT_OWNER` otherwise, with zero DB change).
- `checked_in_by` is always taken from `req.user.id`; strict empty body `{}` rejects spoofed `checkedInBy`/`checkedInAt` (`400 VALIDATION_ERROR`, `DEC-15`).

**Backward-compatible roster extension (`F-04`):** `GET /api/events/:id/registrations` adds `checkedInAt` (`string | null`) to each registration item without removing any Sprint 1 fields (Hazard #7).

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/organizer/events/:id` (Roster) | Each roster row displays a **Status** (`Checked in at HH:mm` or `Not checked in`) and an action button: **Check in** (when not checked in) or **Undo** (when checked in). Buttons disable while pending and are disabled outside the check-in window with tooltip/hint (*"Check-in opens 60 min before start until event ends"*). Mapped inline errors for `409 CHECKIN_WINDOW_CLOSED` / `ALREADY_CHECKED_IN`. State persists across page reload. |

## 3. API specification

- **`POST /api/registrations/:id/check-in`** (`ORGANIZER`, event owner). Strict empty body `{}`.
  - `200` → `{ "registration": { "id": "uuid", "eventId": "uuid", "studentId": "uuid", "status": "ACTIVE", "checkedInAt": "2026-11-28T09:05:00.000Z", "checkedInBy": "uuid" } }`
  - Errors: `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN` · `403 NOT_EVENT_OWNER` · `404 NOT_FOUND` · `409 EVENT_NOT_OPEN | INVALID_TRANSITION | CHECKIN_WINDOW_CLOSED | ALREADY_CHECKED_IN`.
- **`DELETE /api/registrations/:id/check-in`** (`ORGANIZER`, event owner).
  - `200` → `{ "registration": { "id": "uuid", "eventId": "uuid", "studentId": "uuid", "status": "ACTIVE", "checkedInAt": null, "checkedInBy": null } }`
  - Errors: `401 UNAUTHENTICATED` · `403 FORBIDDEN` · `403 NOT_EVENT_OWNER` · `404 NOT_FOUND` · `409 EVENT_NOT_OPEN | INVALID_TRANSITION | CHECKIN_WINDOW_CLOSED`.
- **`GET /api/events/:id/registrations`** (`ORGANIZER`, event owner): Existing Sprint 1 shape + `checkedInAt: string | null` per registration.

## 4. Data specification

Uses `registrations.checked_in_at` and `registrations.checked_in_by` from `0001_init`, backed by `0002_sprint2_constraints` (`chk_checkin_active_only`). Uses seed `E-07` (inside window).

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-50** | **Given** an `ACTIVE` registration on `org1`'s `PUBLISHED` event during the window, **when** `org1` calls `POST /api/registrations/:id/check-in`, **then** `200`, `checked_in_at = now`, `checked_in_by = org1.id`, and roster reflects `checkedInAt`. |
| **AC-51** | **Window boundaries (fake clock):** `now = startAt - 60 min` → `200`; `now = startAt - 60 min - 1 s` → `409 CHECKIN_WINDOW_CLOSED`; `now = endAt` → `200`; `now = endAt + 1 s` → `409 CHECKIN_WINDOW_CLOSED`. |
| **AC-52** | **Given** an already checked-in registration, **when** `org1` checks in again, **then** `409 ALREADY_CHECKED_IN`. **Concurrency:** 2 simultaneous check-in requests yield exactly one `200` and one `409 ALREADY_CHECKED_IN`. |
| **AC-53** | **Given** a `CANCELLED` or `CANCELLED_BY_EVENT` registration, or a `CANCELLED`/`DRAFT` event, **when** `org1` calls check-in, **then** `409 INVALID_TRANSITION` / `409 EVENT_NOT_OPEN` and `checked_in_at` remains `null`. |
| **AC-54** | **Given** a checked-in registration inside the window, **when** `org1` calls `DELETE /api/registrations/:id/check-in`, **then** `200` and `checked_in_at` & `checked_in_by` become `null`. Calling undo at `now = endAt + 1 s` returns `409 CHECKIN_WINDOW_CLOSED`; calling undo when not checked in returns `409 INVALID_TRANSITION`. |
| **AC-55** | **Given** `org2` (non-owner) or `stu1` or anonymous, **when** calling check-in or undo on `org1`'s registration, **then** `403 NOT_EVENT_OWNER` / `403 FORBIDDEN` / `401 UNAUTHENTICATED`, and DB row is unchanged. Unknown registration ID → `404`. |
| **AC-56** | **When** `org1` sends spoofed `checkedInBy` or `checkedInAt` in `POST /api/registrations/:id/check-in`, **then** `400 VALIDATION_ERROR` (`DEC-15`). |
| **AC-57** | **UI:** On `/organizer/events/:id`, `org1` clicks **Check in** then reloads (checked-in time persists), then clicks **Undo** and reloads (reverts to unchecked). |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-59` | `AC-51`, `AC-53`, `AC-54` | Unit | Boundary matrix at `startAt - 60m - 1s`, `startAt - 60m`, `endAt`, `endAt + 1s`, non-active reg, non-published event, already checked-in, undo unchecked | `checkCheckInEligibility` | Exact expected result per row |
| `TEST-60` | `AC-50` | API+DB | `org1`, `E-07` in window, `stu1` `ACTIVE` | `POST check-in`, then `GET roster` | `200`, DB `checked_in_at` & `checked_in_by = org1`, roster shows `checkedInAt` |
| `TEST-61` | `AC-51` | API+DB | Fake clock at all 4 window boundaries | `POST check-in` | `200` at `-60m` and `endAt`; `409 CHECKIN_WINDOW_CLOSED` at `-60m - 1s` and `endAt + 1s` |
| `TEST-62` | `AC-52` | API+DB concurrency | Unchecked registration in window | Sequential retry + `Promise.all` of 2 concurrent `POST check-in` | Sequential → `409 ALREADY_CHECKED_IN`; concurrent → 1× `200` + 1× `409` |
| `TEST-63` | `AC-53` | API+DB | `CANCELLED` reg; `CANCELLED_BY_EVENT` reg; `CANCELLED` event; `DRAFT` event | `POST check-in` | `409 INVALID_TRANSITION` / `409 EVENT_NOT_OPEN`; `checked_in_at` still `null` |
| `TEST-64` | `AC-54` | API+DB | Checked-in reg in window; after `endAt + 1 s`; unchecked reg | `DELETE check-in` | `200` (fields cleared); `409 CHECKIN_WINDOW_CLOSED`; `409 INVALID_TRANSITION` |
| `TEST-65` | `AC-55` | API+DB | `stu1`, anonymous, unknown UUID | `POST` & `DELETE check-in` | `403 FORBIDDEN`, `401`, `404` |
| `TEST-66` | `AC-55` | API+DB | `org2` session targeting `org1`'s event registration | `POST` & `DELETE check-in` | `403 NOT_EVENT_OWNER` both; DB `checked_in_at` untouched *(PDF access-restriction excerpt candidate)* |
| `TEST-67` | `AC-56` | API+DB | `org1` sending `{ checkedInBy: org2.id }` or `{ checkedInAt: ... }` | `POST check-in` | `400 VALIDATION_ERROR`; DB untouched |
| `TEST-68` | `AC-50`, `AC-46` | API+DB cross-feature | `org1` checks in `stu1` before deadline | `stu1` attempts `POST /api/registrations/:id/cancel` | `409 ALREADY_CHECKED_IN` |
| `TEST-69` | `AC-57` | E2E | Running app, `E-07` | `org1` checks in `stu1` → reload → undo → reload | State persists across reloads |

## 7. Definition of Done (feature)

Sprint 2 DoD plus: TDD red commit SHA (`TEST-59`, `61`, `62`, `64`, `66` failing before implementation) and green commit SHA recorded; `TEST-66` excerpt ready for Deliverable 2 PDF.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 2 contract for F-13 |
