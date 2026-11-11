# E.2 Contract F-02 — Authorization (cross-cutting)

| Field | Value |
|---|---|
| Feature | F-02 Role- and ownership-based authorization |
| Requirements | BR-06, BR-07, BR-08, NFR-02, NFR-03 |
| Depends on | F-01 |
| Issue / branch | #3 · `feature/F-02-authorization` |
| Contract version | 1.0 |

## 1. Feature-level design

| Mechanism | Where | Behavior |
|---|---|---|
| `loadUser` | middleware (all `/api`) | If the session has a `userId`, load the user from the DB and set `req.user`. Role always comes from the DB, never from the client |
| `requireAuth` | route | No `req.user` → 401 `UNAUTHENTICATED` |
| `requireRole(...roles)` | route | `req.user.role` not in roles → 403 `FORBIDDEN` |
| Ownership — events | service | `event.organizerId !== user.id` → 403 `NOT_EVENT_OWNER` |
| Ownership — registrations | service | Query is scoped `WHERE id = :id AND student_id = :userId`. Not found → 404 `NOT_FOUND` (DEC-14) |
| Strict schemas | controller | Unknown body keys (e.g. `organizerId`, `studentId`, `role`) → 400 `VALIDATION_ERROR` (DEC-15) |
| Data minimisation | service DTOs | Student-facing event DTOs contain only aggregate counts. Roster DTO only for the owner |

**Sprint 1 protected endpoint inventory** (input to TEST-10):

| Endpoint | Allowed |
|---|---|
| `GET /api/auth/me`, `GET /api/events`, `GET /api/events/:id` | any authenticated |
| `POST /api/events`, `GET /api/organizer/events`, `GET /api/events/:id/registrations` | ORGANIZER (roster: owner only) |
| `POST /api/events/:id/registrations`, `GET /api/me/registrations`, `GET /api/registrations/:id` | STUDENT (own) |

**UI.** Route guards hide links and redirect (UX only). There is no separate screen beyond the 403/404 pages defined in SDS C.3.2.
**Data.** No change. Uses `events.organizer_id` and `registrations.student_id`.

## 2. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-08 | **Given** no session, **when** any endpoint in the S1 protected inventory is called, **then** the response is 401 `UNAUTHENTICATED` and the body contains only the error object (no event/registration/user fields). |
| AC-09 | **Given** a logged-in STUDENT, **when** they call `POST /api/events`, `GET /api/organizer/events` or `GET /api/events/:id/registrations`, **then** the response is 403 `FORBIDDEN` and no event row is created. |
| AC-10 | **Given** a logged-in ORGANIZER, **when** they call `POST /api/events/:id/registrations` or `GET /api/me/registrations`, **then** the response is 403 `FORBIDDEN` and no registration row is created. |
| AC-11 | **Given** org2 logged in and event E-01 owned by org1, **when** org2 requests `GET /api/events/E-01/registrations`, **then** the response is 403 `NOT_EVENT_OWNER` with no roster data. |
| AC-12 | **Given** stu2 holds registration R on E-05, **when** stu1 requests `GET /api/registrations/R`, **then** the response is 404 `NOT_FOUND`. `GET /api/me/registrations` for stu1 never contains R. |
| AC-13 | **When** a client sends identity fields it must not control (`organizerId` on create event, `studentId` on register, `role` on login), **then** the response is 400 `VALIDATION_ERROR` and no row is created with the spoofed identity. |

## 3. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-10 | AC-08 | API (table-driven) | No cookie. All 9 S1 protected endpoints | Call each | Each 401. `Object.keys(body)` = `["error"]` |
| TEST-11 | AC-09 | API+DB | stu1 session | Call the 3 organizer operations | 403 FORBIDDEN each. Event count unchanged |
| TEST-12 | AC-10 | API+DB | org1 session, E-01 | Call the 2 student operations | 403 each. Registration count unchanged |
| TEST-13 | AC-11 | API+DB | org2 session, E-01 owned by org1 with 1 registration | GET roster | 403 NOT_EVENT_OWNER. Body has no `registrations` |
| TEST-14 | AC-12 | API+DB | stu2 registration R on E-05. stu1 session | GET /registrations/R. GET /me/registrations | 404. List ids don't include R |
| TEST-15 | AC-13 | API+DB | org1 session. stu1 session | POST /events with `organizerId: org2`. POST register with `studentId: stu2` | 400 each. No rows created |
| TEST-16 | AC-09, AC-10 | Unit | Mock req with role STUDENT / ORGANIZER / none | `requireRole('ORGANIZER')` | Calls next() only for ORGANIZER. Passes AppError(403) or (401) otherwise |

## 4. Definition of Done (feature)

Product DoD plus: every S1 row of the SDS role matrix (C.5) is covered by TEST-10…16. Any new protected endpoint in later sprints must be added to the TEST-10 table in the same PR.
