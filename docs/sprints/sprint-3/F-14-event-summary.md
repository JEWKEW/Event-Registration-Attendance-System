# Contract F-14 — Event Attendance Summary (Deliverable 2 Slice · Featured TDD #3)

| Field | Value |
|---|---|
| Feature | F-14 Per-event attendance summary & derived `ATTENDED`/`ABSENT` calculation |
| Requirements | `FR-20`, `BR-07`, `BR-18` |
| Depends on | `F-13` (check-in), `SR-01` (seed `E-09` ended event with mixed attendance) |
| Branch | `feature/F-14-attendance-summary` (from `sprint-3`, after `v0.2.0`) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |
| **TDD Requirement** | **Featured Sprint 3 TDD chain #3 (implemented for Deliverable 2 `v0.3.0-rc.1`).** Commit failing tests (`TEST-98`, `TEST-99`, `TEST-100`, `TEST-101`, `TEST-102`) **before** implementation and preserve red/green commit SHAs and outputs. |

## 1. Feature-level design

**Pure domain functions (`BR-18`).**
1. `deriveAttendanceStatus(registration, event, now)`:
   - If `registration.status === 'CANCELLED'` → `'CANCELLED'`
   - If `registration.status === 'CANCELLED_BY_EVENT'` → `'CANCELLED_BY_EVENT'`
   - If `registration.status === 'ACTIVE'`:
     - If `registration.checkedInAt !== null` → `'ATTENDED'`
     - Else if `now > event.endAt` → `'ABSENT'`
     - Else → `'REGISTERED'` (event not yet ended; not counted as absent yet)
2. `calculateAttendanceSummary(event, registrations, now)`:
   - `isFinalized = event.status === 'PUBLISHED' && now > event.endAt`
   - `activeCount`: count of rows with `status === 'ACTIVE'`
   - `selfCancelledCount`: count with `status === 'CANCELLED'`
   - `cancelledByEventCount`: count with `status === 'CANCELLED_BY_EVENT'`
   - `cancelledTotal = selfCancelledCount + cancelledByEventCount`
   - `checkedInCount` (`attendedCount`): count of `ACTIVE` rows with `checkedInAt !== null`
   - `absentCount`: if `isFinalized`, count of `ACTIVE` rows with `checkedInAt === null`; otherwise `0`
   - `denominator = checkedInCount + absentCount` (only when `isFinalized`; cancelled registrations are **always excluded** per `BR-18`)
   - `attendanceRate`: if `isFinalized && denominator > 0`, numeric ratio `Number(((checkedInCount / denominator) * 100).toFixed(1))` (percentage `0.0`–`100.0`); otherwise `null`
   - `attendanceRateDisplay`: if `attendanceRate !== null`, `"<rate>%"` (e.g., `"50.0%"`); otherwise `"N/A"`

**Readability timing (settled Q9.3):** Owner may view `GET /api/events/:id/summary` at any time (before or after `endAt`):
- After `endAt` (`isFinalized: true`): returns finalized `attendedCount`, `absentCount`, `attendanceRate`, `attendanceRateDisplay`.
- Before `endAt` (`isFinalized: false`): returns live `checkedInCount`, `absentCount: 0`, `attendanceRate: null`, `attendanceRateDisplay: "N/A"` so the UI clearly distinguishes live check-in progress from finalized attendance.

**Permissions (`BR-07`).** `ORGANIZER` only (`403 FORBIDDEN` for `STUDENT`), event owner only (`403 NOT_EVENT_OWNER` for non-owning organizer). Unknown/malformed event ID → `404 NOT_FOUND`.

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/organizer/events/:id/summary` | Summary cards: Capacity, Active Registrations, Cancellations (self + by-event), Checked In / Attended, Absent, Attendance Rate (or `"N/A"`), and status badge (`Finalized` vs `In Progress / Not Ended`). Loading skeleton, error + Retry, link back to Roster. |
| `/organizer/events/:id` | Adds **Attendance Summary** navigation tab/button linking to `/organizer/events/:id/summary`. |

## 3. API specification

**`GET /api/events/:id/summary`** (`ORGANIZER`, owner)
`200` →
```json
{
  "event": { "id": "uuid", "title": "Past Seminar", "effectiveStatus": "COMPLETED", "startAt": "…", "endAt": "…", "capacity": 30 },
  "summary": {
    "capacity": 30,
    "activeRegistrations": 2,
    "cancellations": { "self": 1, "byEvent": 0, "total": 1 },
    "checkedIn": 1,
    "attended": 1,
    "absent": 1,
    "isFinalized": true,
    "attendanceRate": 50.0,
    "attendanceRateDisplay": "50.0%"
  }
}
```
Errors: `401 UNAUTHENTICATED` · `403 FORBIDDEN` · `403 NOT_EVENT_OWNER` · `404 NOT_FOUND`.

## 4. Data specification

No schema migration needed. Read-only aggregation over `events` and `registrations`. Verified against deterministic seed `E-09` (ended event with 1 attended, 1 absent, 1 self-cancelled → `attendanceRate: 50.0`, `"50.0%"`).

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-77** | **Unit (`BR-18`):** `deriveAttendanceStatus` and `calculateAttendanceSummary` classify checked-in `ACTIVE` as `ATTENDED`, unchecked `ACTIVE` after `endAt` as `ABSENT` (and `REGISTERED` at/before `endAt`), exclude all `CANCELLED`/`CANCELLED_BY_EVENT` rows from the denominator, and return `attendanceRate: null` / `"N/A"` when the denominator is `0`. |
| **AC-78** | **Given** ended event `E-09` owned by `org1` with 1 checked-in `ACTIVE`, 1 unchecked `ACTIVE`, and 1 `CANCELLED` registration, **when** `org1` calls `GET /api/events/E-09/summary`, **then** `200` with `isFinalized: true`, `activeRegistrations: 2`, `cancellations.total: 1`, `attended: 1`, `absent: 1`, `attendanceRate: 50.0`, `attendanceRateDisplay: "50.0%"`. |
| **AC-79** | **Given** an ended event with 0 `ACTIVE` registrations (e.g., 0 total or only `CANCELLED` rows), **when** `org1` calls summary, **then** `200` with `attended: 0`, `absent: 0`, `attendanceRate: null`, `attendanceRateDisplay: "N/A"`. |
| **AC-80** | **Given** an active `PUBLISHED` event before `endAt` (`now <= endAt`) with 1 checked-in and 1 unchecked `ACTIVE` registrant, **when** `org1` calls summary, **then** `200` with `isFinalized: false`, `checkedIn: 1`, `absent: 0`, `attendanceRate: null`, `attendanceRateDisplay: "N/A"`. |
| **AC-81** | **Given** `org2` (non-owner), `stu1`, anonymous, or unknown event ID, **when** calling `GET /api/events/:id/summary`, **then** `403 NOT_EVENT_OWNER` / `403 FORBIDDEN` / `401 UNAUTHENTICATED` / `404 NOT_FOUND` with zero summary data leaked. |
| **AC-82** | **UI:** `/organizer/events/:id/summary` renders all summary metrics cleanly (including `"N/A"` when denominator is 0) and shows the `"You don't have access"` state on `403`. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-98` | `AC-77` | Unit | Table covering before/at/after `endAt`, mixed attended/absent/cancelled, 0 denominator, 100%, 0%, 1/3 rounding (`33.3%`) | `deriveAttendanceStatus` & `calculateAttendanceSummary` | Exact counts, `attendanceRate`, and `"N/A"` per row |
| `TEST-99` | `AC-78` | API+DB | Seeded `E-09` (ended, 1 attended, 1 absent, 1 self-cancelled) | `org1` `GET /api/events/E-09/summary` | `200`, `50.0%`, cancelled excluded from denominator |
| `TEST-100` | `AC-79` | API+DB | Ended event with only cancelled registrations | `org1` `GET summary` | `200`, `attendanceRate: null`, `"N/A"` |
| `TEST-101` | `AC-80` | API+DB | Fake clock at `now = endAt` vs `now = endAt + 1 s` on event with 1 checked-in + 1 unchecked | `org1` `GET summary` | At `endAt`: `isFinalized: false, absent: 0, "N/A"`; at `endAt + 1 s`: `isFinalized: true, absent: 1, "50.0%"` |
| `TEST-102` | `AC-81` | API+DB | `org2`, `stu1`, anonymous, unknown UUID | `GET /api/events/:id/summary` | `403 NOT_EVENT_OWNER`, `403 FORBIDDEN`, `401`, `404` |
| `TEST-103` | `AC-81` | API | Added to `TEST-10` / `TEST-95` route-audit table | Unauthenticated route sweep | Covered with `401 UNAUTHENTICATED` |
| `TEST-104` | `AC-82` | E2E | Running app, `E-09` | `org1` opens `/organizer/events/E-09/summary` | Displays `50.0%`, `1 Attended`, `1 Absent`, `1 Cancelled` |

## 7. Definition of Done (feature)

Sprint 3 DoD plus: TDD red commit SHA (`TEST-98`–`102`) and green commit SHA recorded; deployed and verified in `v0.3.0-rc.1`; status marked `Implemented & Tested` in Deliverable 2 (upgraded to `Accepted` in `v1.0.0`).

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 3 contract for F-14 |
