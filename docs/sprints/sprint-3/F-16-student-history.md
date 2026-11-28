# Contract F-16 — Student Attendance History

| Field | Value |
|---|---|
| Feature | F-16 Student's own attendance history across past and cancelled events |
| Requirements | `FR-22`, `BR-08`, `BR-18` |
| Depends on | `F-11`, `F-13`, `F-14` (`deriveAttendanceStatus`) |
| Branch | `feature/F-16-student-history` (from `sprint-3`, post-Deliverable 2) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Deliverable 2 Status | **Specified** (remaining work; target **12 Dec 2026**) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |

## 1. Feature-level design

**Query & derivation rules (scoped strictly to `registrations.student_id = req.user.id`).**
Returns all of the authenticated student's historical registration records where **either**:
- The event has ended (`event.end_at < clock.now()`), **or**
- The registration status is `CANCELLED` or `CANCELLED_BY_EVENT` (including cancelled events).
*(Upcoming `ACTIVE` registrations for non-ended `PUBLISHED` events remain in `/me/registrations`, not past history.)*

Each item includes `attendanceOutcome` derived via `deriveAttendanceStatus(registration, event, now)`:
- **`ATTENDED`**: `status === 'ACTIVE'` and `checked_in_at !== null` (and event ended)
- **`ABSENT`**: `status === 'ACTIVE'` and `checked_in_at === null` and `now > event.end_at`
- **`CANCELLED`**: `status === 'CANCELLED'` (student self-cancelled)
- **`CANCELLED_BY_EVENT`**: `status === 'CANCELLED_BY_EVENT'` (organizer cancelled event; includes `cancelReason`)

Ordered by `event.start_at DESC` (most recent first), with summary counts `{ attended, absent, cancelled, total }`.
**Privacy (`BR-08`).** Never exposes any other student's records or event roster data.
**Permissions.** `STUDENT` only (`403 FORBIDDEN` for `ORGANIZER`, `401` for anonymous).

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/me/history` | Summary strip (`Attended`, `Absent`, `Cancelled`) + chronological table/cards showing Event Title, Date/Time (Bangkok), Location, Outcome badge (`Attended` green / `Absent` amber / `Cancelled` gray / `Cancelled by organizer` red + reason), and Check-in timestamp when attended. Distinct empty state: *"No past event history yet"* + link to `/events`. Loading skeleton & error + Retry. |
| Nav bar (`STUDENT`) | Adds **Attendance History** link pointing to `/me/history`. |

## 3. API specification

**`GET /api/me/history`** (`STUDENT`)
`200` →
```json
{
  "summary": { "attended": 1, "absent": 1, "cancelled": 1, "total": 3 },
  "history": [
    {
      "registrationId": "uuid",
      "registrationStatus": "ACTIVE",
      "attendanceOutcome": "ATTENDED",
      "registeredAt": "…",
      "checkedInAt": "…",
      "cancelledAt": null,
      "event": { "id": "uuid", "title": "Past Seminar", "category": "SEMINAR", "location": "…", "startAt": "…", "endAt": "…", "effectiveStatus": "COMPLETED", "cancelReason": null }
    }
  ]
}
```
Errors: `401 UNAUTHENTICATED` · `403 FORBIDDEN`.

## 4. Data specification

No schema migration needed. Read-only join of `registrations` and `events` filtered by `student_id = req.user.id`.

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-87** | **Given** `stu1` has 1 ended checked-in registration, 1 ended unchecked registration, 1 self-cancelled registration, 1 `CANCELLED_BY_EVENT` registration, and 1 upcoming `ACTIVE` registration, **when** `stu1` calls `GET /api/me/history`, **then** `200` returning the 4 historical records ordered `startAt DESC` with outcomes `ATTENDED`, `ABSENT`, `CANCELLED`, `CANCELLED_BY_EVENT` (omitting the upcoming active event) and accurate summary totals. |
| **AC-88** | **Given** `stu2` also holds past registrations, **when** `stu1` calls `GET /api/me/history`, **then** zero `stu2` registrations or PII appear in the response (`BR-08`). |
| **AC-89** | **Given** an `ORGANIZER` or anonymous caller, **when** calling `GET /api/me/history`, **then** `403 FORBIDDEN` / `401 UNAUTHENTICATED`. |
| **AC-90** | **UI:** `/me/history` displays outcome badges, cancel reasons, summary counts, and empty state for a student with no history. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-110` | `AC-87` | Unit | Pure `buildStudentHistory(rows, now)` with all 5 cases | Call helper | Exact outcomes, exclusion of upcoming active, `startAt DESC` order |
| `TEST-111` | `AC-87` | API+DB | `stu1` fixtures covering all 5 cases + fake clock | `stu1` `GET /api/me/history` | `200`, 4 items, exact outcomes & summary |
| `TEST-112` | `AC-88` | API+DB | `stu2` has past registrations on same & other events | `stu1` `GET /api/me/history` | Serialized body contains zero `stu2` IDs/emails/names |
| `TEST-113` | `AC-89` | API | `org1`, anonymous | `GET /api/me/history` | `403 FORBIDDEN`, `401 UNAUTHENTICATED` |
| `TEST-114` | `AC-90` | E2E | Running app | `stu1` opens `/me/history` | Badges & counts render; empty state verified on `stu4` |

## 7. Definition of Done (feature)

Sprint 3 DoD plus: `TEST-110`–`TEST-114` pass; `/api/me/history` added to route-audit `TEST-95`; reviewed by `@Decaa0`.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 3 contract for F-16 |
