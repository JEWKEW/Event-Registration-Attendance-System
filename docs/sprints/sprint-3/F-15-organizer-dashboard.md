# Contract F-15 — Organizer Dashboard

| Field | Value |
|---|---|
| Feature | F-15 Organizer aggregate dashboard across all own events |
| Requirements | `FR-21`, `BR-07`, `BR-18` |
| Depends on | `F-14` (`deriveAttendanceStatus` / `calculateAttendanceSummary`) |
| Branch | `feature/F-15-organizer-dashboard` (from `sprint-3`, post-Deliverable 2) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Deliverable 2 Status | **Specified** (remaining work; target **30 Nov 2026**, buffer 12 Dec) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |

## 1. Feature-level design

**Aggregation rules (scoped strictly to `events.organizer_id = req.user.id`).**
1. **Event counts by effective status:** `{ draft, published, completed, cancelled, total }` where `published` counts active upcoming/in-progress `PUBLISHED` events (`now <= endAt`) and `completed` counts `PUBLISHED` events with `now > endAt`.
2. **Registration totals across own events:** `totalActiveRegistrations`, `totalCancellations` (`CANCELLED` + `CANCELLED_BY_EVENT`).
3. **Overall attendance rate (`BR-18`):** Sum `attended` and `absent` across all **completed** (`isFinalized`) own events:
   - `overallAttendanceRate = (totalAttended + totalAbsent) > 0 ? Number(((totalAttended / (totalAttended + totalAbsent)) * 100).toFixed(1)) : null`
   - `overallAttendanceRateDisplay`: `"<rate>%"` or `"N/A"` when denominator is `0`.
   - Never weighted-average of per-event percentages; uses pooled `SUM(attended) / SUM(attended + absent)` so large and small events weight accurately.
4. **Isolation (`BR-07`):** Events owned by other organizers are never included in counts or rates.

**Permissions.** `ORGANIZER` only (`403 FORBIDDEN` for `STUDENT`, `401` for anonymous).

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/organizer/dashboard` | KPI cards: Total Events + breakdown (`Draft`, `Published`, `Completed`, `Cancelled`), Total Active Registrations, Overall Attendance Rate (`"N/A"` when no completed registrations), plus table of recent/completed own events linking to `/organizer/events/:id/summary`. Distinct empty state for a new organizer with 0 events (*"Create your first event to see analytics"*). Loading skeleton & error + Retry. |
| Nav bar (`ORGANIZER`) | Adds **Dashboard** link pointing to `/organizer/dashboard`. |

## 3. API specification

**`GET /api/organizer/dashboard`** (`ORGANIZER`)
`200` →
```json
{
  "eventsByStatus": { "draft": 1, "published": 3, "completed": 2, "cancelled": 1, "total": 7 },
  "registrations": { "active": 18, "cancelled": 4 },
  "attendance": {
    "completedEventsCount": 2,
    "attended": 9,
    "absent": 3,
    "overallAttendanceRate": 75.0,
    "overallAttendanceRateDisplay": "75.0%"
  },
  "recentEvents": [
    { "id": "uuid", "title": "…", "effectiveStatus": "COMPLETED", "startAt": "…", "activeCount": 2, "attendanceRateDisplay": "50.0%" }
  ]
}
```
Errors: `401 UNAUTHENTICATED` · `403 FORBIDDEN`.

## 4. Data specification

No schema migration needed. Read-only queries over `events` and `registrations` filtered by `organizer_id = req.user.id`.

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-83** | **Given** `org1` owns draft, published, completed, and cancelled events and `org2` owns separate events, **when** `org1` calls `GET /api/organizer/dashboard`, **then** `200` with exact status counts, active/cancelled registration totals, and pooled `overallAttendanceRate` calculated strictly from `org1`'s own events (zero `org2` data). |
| **AC-84** | **Given** an organizer with 0 completed events (or 0 active registrations on completed events), **when** calling dashboard, **then** `200` with `overallAttendanceRate: null`, `overallAttendanceRateDisplay: "N/A"`, and zero-initialized counts. |
| **AC-85** | **Given** a `STUDENT` or anonymous caller, **when** calling `GET /api/organizer/dashboard`, **then** `403 FORBIDDEN` / `401 UNAUTHENTICATED`. |
| **AC-86** | **UI:** `/organizer/dashboard` renders KPI cards, `"N/A"` state, empty state, and links to per-event summaries. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-105` | `AC-83`, `AC-84` | Unit | Pure `buildOrganizerDashboard(eventsWithRegs, now)` table (mixed statuses, pooled rate across 2 events, 0 denominator) | Call helper | Exact counts & pooled rate / `"N/A"` |
| `TEST-106` | `AC-83` | API+DB | `org1` owns 4 statuses; `org2` owns events with registrations | `org1` `GET /api/organizer/dashboard` | Counts & pooled rate reflect `org1` only; zero `org2` IDs/counts |
| `TEST-107` | `AC-84` | API+DB | Organizer with 0 events / only drafts | `GET /api/organizer/dashboard` | `200`, zeros, `"N/A"` |
| `TEST-108` | `AC-85` | API | `stu1`, anonymous | `GET /api/organizer/dashboard` | `403 FORBIDDEN`, `401 UNAUTHENTICATED` |
| `TEST-109` | `AC-86` | E2E | Running app | `org1` opens `/organizer/dashboard` → clicks event summary | KPIs match; navigation works |

## 7. Definition of Done (feature)

Sprint 3 DoD plus: `TEST-105`–`TEST-109` pass; `/api/organizer/dashboard` added to route-audit `TEST-95`; reviewed by `@Decaa0`.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 3 contract for F-15 |
