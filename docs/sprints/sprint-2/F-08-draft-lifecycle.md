# Contract F-08 — Draft & Event Lifecycle

| Field | Value |
|---|---|
| Feature | F-08 Draft creation, publish transition, delete draft & derived `COMPLETED` state |
| Requirements | `FR-05`, `FR-23`, `BR-02`, `BR-09`, `BR-10` |
| Depends on | `F-03`, `SR-01` (S2 foundation) |
| Branch | `feature/F-08-draft-lifecycle` (from `sprint-2`) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |

## 1. Feature-level design

**Workflow & lifecycle rules.**
1. **Save as draft vs. direct publish (`POST /api/events`):** Add optional `publish?: boolean` (defaults to `true` for Sprint 1 backward compatibility).
   - When `publish: false`, create the event with `status = 'DRAFT'`, `published_at = null`. Ordering (`registrationDeadline ≤ startAt < endAt`) and `BR-01` capacity still apply; past `startAt` is permitted while `DRAFT` (Hazard #2).
   - When `publish: true` (or omitted), enforce `startAt > clock.now()` and create with `status = 'PUBLISHED'`, `published_at = clock.now()`.
2. **Publish draft (`POST /api/events/:id/publish`):** Owner-only. Validates `assertTransition(event, 'PUBLISHED', now)` (must be stored `DRAFT`, else `409 INVALID_TRANSITION`), re-validates `BR-01` and `BR-02` including `startAt > now` (else `400 VALIDATION_ERROR`), then sets `status = 'PUBLISHED'`, `published_at = now`.
3. **Delete draft (`DELETE /api/events/:id`):** Owner-only. Validates `status === 'DRAFT'` (else `409 INVALID_TRANSITION`), deletes the event row, returns `204`.
4. **Derived `COMPLETED` state (`FR-23`, `DEC-03`):** Pure helper `deriveEffectiveStatus(event, now)` returns `'COMPLETED'` when `event.status === 'PUBLISHED' && now > event.end_at`, otherwise `event.status`. All event responses include `effectiveStatus`. Completed events reject registration (`409 EVENT_NOT_OPEN`), editing (`409 INVALID_TRANSITION`), cancellation (`409 INVALID_TRANSITION`), and student self-cancellation (`409 CANCELLATION_CLOSED` / `INVALID_TRANSITION`).
5. **Transition guard:** Pure function `assertTransition(currentStoredStatus, effectiveStatus, targetAction)` allows only `DRAFT → PUBLISHED`, `DRAFT → DELETE`, and `PUBLISHED (not COMPLETED) → CANCELLED`. No transition leaves `CANCELLED` or `COMPLETED`.
6. **Draft visibility (`BR-09`, Hazard #1):**
   - `GET /api/events` only returns `status = 'PUBLISHED' AND end_at > now` (never drafts).
   - `GET /api/events/:id` returns a `DRAFT` (`200`) **only** to its owning `ORGANIZER`; students and other organizers receive `404 NOT_FOUND`.
   - `POST /api/events/:id/registrations` on a `DRAFT` returns `404 NOT_FOUND` to students (visibility checked before eligibility).

**Permissions.** Create/publish/delete: `ORGANIZER` only (`403 FORBIDDEN` for `STUDENT`). Publish/delete: owner only (`403 NOT_EVENT_OWNER` for another organizer). Strict Zod schemas reject `organizerId` / `status` (`400 VALIDATION_ERROR`).

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/organizer/events/new` | Two submit actions: **Save as Draft** (`publish: false`) and **Publish Event** (`publish: true`). Both disable while pending. |
| `/organizer/events` | Status badges distinguish `DRAFT`, `PUBLISHED`, `COMPLETED`, and `CANCELLED`. |
| `/organizer/events/:id` | For `DRAFT`: shows **Publish Event** button (shows inline 400 error if `startAt` is now in the past) and **Delete Draft** button with confirmation dialog (redirects to `/organizer/events`). For `COMPLETED`: shows read-only `Completed` badge and hides/disables mutating controls. |

## 3. API specification

- **`POST /api/events`** (`ORGANIZER`): Existing strict schema + optional `publish?: boolean` (default `true`). Returns `201 { event }` with `status`, `effectiveStatus`, `publishedAt`.
- **`POST /api/events/:id/publish`** (`ORGANIZER`, owner): Strict empty body `{}`.
  - `200 { event }` (`status: "PUBLISHED"`, `publishedAt` set)
  - Errors: `400 VALIDATION_ERROR` (e.g., `startAt <= now`), `401`, `403 FORBIDDEN`, `403 NOT_EVENT_OWNER`, `404 NOT_FOUND`, `409 INVALID_TRANSITION`.
- **`DELETE /api/events/:id`** (`ORGANIZER`, owner):
  - `204` (no body)
  - Errors: `401`, `403 FORBIDDEN`, `403 NOT_EVENT_OWNER`, `404 NOT_FOUND`, `409 INVALID_TRANSITION`.
- **`GET /api/events/:id`**: Draft returns `200` for owner, `404 NOT_FOUND` for students and non-owner organizers.

## 4. Data specification

No new schema columns needed (`events.status` enum already contains `DRAFT`, `PUBLISHED`, `CANCELLED` and `published_at` is nullable in `0001_init`). Depends on `SR-01` seed `E-06` (`DRAFT`) and `E-09` (ended).

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-36** | **Given** `org1`, **when** they POST `/api/events` with `publish: false`, **then** `201` with `status: "DRAFT"`, `publishedAt: null`. Ordering (`deadline <= startAt < endAt`) and `BR-01` still apply; a past `startAt` is accepted for a draft. |
| **AC-37** | **Given** `org1`'s future `DRAFT` event, **when** `org1` calls `POST /api/events/:id/publish`, **then** `200`, `status: "PUBLISHED"`, `publishedAt` set, and it appears in `GET /api/events`. |
| **AC-38** | **Given** `org1`'s `DRAFT` event `E-06`, **then** it is absent from `GET /api/events`, `GET /api/events/E-06` returns `200` for `org1` and `404 NOT_FOUND` for `stu1` and `org2`, and `stu1` calling `POST /api/events/E-06/registrations` receives `404 NOT_FOUND` with no registration created. |
| **AC-39** | **Given** `org1`'s `DRAFT`, **when** `org1` calls `DELETE /api/events/:id`, **then** `204` and the row is deleted. Deleting a `PUBLISHED`, `COMPLETED`, or `CANCELLED` event returns `409 INVALID_TRANSITION` and keeps the row. |
| **AC-40** | **When** `org1` publishes an already `PUBLISHED` or `CANCELLED` event, **then** `409 INVALID_TRANSITION`. **When** `org1` publishes a `DRAFT` with `startAt <= now`, **then** `400 VALIDATION_ERROR` (field `startAt`) and status remains `DRAFT`. |
| **AC-41** | **Unit:** `assertTransition` exhaustively allows only `DRAFT → PUBLISHED`, `DRAFT → DELETE`, and `PUBLISHED (active) → CANCELLED`; every other pair (including any transition out of `CANCELLED` or `COMPLETED`) is rejected. |
| **AC-42** | **Given** a `PUBLISHED` event with `endAt`, **when** `now = endAt` then `effectiveStatus = "PUBLISHED"`; at `now = endAt + 1 s` then `effectiveStatus = "COMPLETED"` and registration returns `409 EVENT_NOT_OPEN`. |
| **AC-43** | **Given** `org2` or `stu1` or anonymous, **when** calling publish or delete on `org1`'s event, **then** `403 NOT_EVENT_OWNER` / `403 FORBIDDEN` / `401 UNAUTHENTICATED`, and sending unknown keys like `organizerId` returns `400 VALIDATION_ERROR`. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-42` | `AC-41` | Unit | Full matrix of `(status, effectiveStatus, target)` | `assertTransition` | Exact allow/reject table |
| `TEST-43` | `AC-42` | Unit | Fixed clock at `endAt` and `endAt + 1 s` | `deriveEffectiveStatus` | `PUBLISHED` at `endAt`; `COMPLETED` at `endAt + 1 s` |
| `TEST-44` | `AC-36` | API+DB | `org1` session, `publish: false` (future + past start) | `POST /api/events` | `201`, DB `status=DRAFT`, `published_at=null`; invalid ordering still `400` |
| `TEST-45` | `AC-37` | API+DB | `org1` future draft | `POST /api/events/:id/publish`, then `GET /api/events` | `200`, `PUBLISHED`, visible in upcoming list |
| `TEST-46` | `AC-38` | API+DB | `E-06` draft owned by `org1` | `GET /api/events`, `GET /api/events/:id`, `POST register` as `org1`, `org2`, `stu1` | `org1` sees `200`; `stu1` & `org2` get `404`; register gets `404` & 0 rows |
| `TEST-47` | `AC-39` | API+DB | Own `DRAFT`, `PUBLISHED`, `CANCELLED` events | `DELETE /api/events/:id` | `204` + deleted for `DRAFT`; `409 INVALID_TRANSITION` + intact for others |
| `TEST-48` | `AC-40` | API+DB | Past-start `DRAFT`; already `PUBLISHED`; `CANCELLED` | `POST /api/events/:id/publish` | `400` (`startAt`) for past draft; `409 INVALID_TRANSITION` for others |
| `TEST-49` | `AC-42` | API+DB | Fake clock at `endAt` and `endAt + 1 s` | `GET /api/events/:id`, `POST register` | `COMPLETED` at `endAt + 1 s`; register → `409 EVENT_NOT_OPEN` |
| `TEST-50` | `AC-43` | API+DB | `org2`, `stu1`, anonymous, spoofed body | Publish & delete endpoints | `403 NOT_EVENT_OWNER`, `403 FORBIDDEN`, `401`, `400`; DB untouched |

## 7. Definition of Done (feature)

Sprint 2 DoD plus: `TEST-42`–`TEST-50` pass; Sprint 1 `POST /api/events` tests remain green without modification; draft-to-publish UI journey verified.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 2 contract for F-08 |
