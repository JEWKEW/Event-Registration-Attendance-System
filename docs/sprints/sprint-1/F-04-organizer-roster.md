# E.4 Contract F-04 — Organizer Events & Roster

| Field | Value |
|---|---|
| Feature | F-04 Organizer "My events" and registration roster |
| Requirements | FR-09, FR-10, BR-07 |
| Depends on | F-03 (events exist), F-06 (registrations appear in the roster) |
| Issue / branch | #5 · `feature/F-04-organizer-roster` |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` |

## 1. Feature-level design

- **My events:** returns events where `organizer_id = req.user.id`, ordered by `start_at` ascending, each with `activeCount` (count of ACTIVE registrations) and `remainingSeats`. Includes past events (marked `effectiveStatus = COMPLETED`).
- **Roster:** the service loads the event (404 if missing or malformed id) and checks `event.organizerId === req.user.id` (403 `NOT_EVENT_OWNER` otherwise). It returns ACTIVE registrations joined with the student, ordered by `registered_at` ascending.
- **Permissions:** ORGANIZER only. Roster is owner only. Cross-owner tests are in F-02 (AC-11).
- **Data exposure:** the roster shows student `displayName`, `studentNo`, `email`, `registeredAt`. This is allowed because the organizer must contact and check in registrants. It is never exposed to students.
- **Data:** no schema change. Uses index `registrations(event_id, status)`.

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/organizer/events` | Table: Title · Date/time · Status badge · Capacity · Registered · Seats left · "View". Empty state: "You have no events yet" + **Create event** button. Loading skeleton. Error alert + Retry |
| `/organizer/events/:id` | Event header (title, time, location, capacity, `activeCount/capacity`). Roster table: # · Name · Student no. · Email · Registered at. Empty state "No registrations yet". 403 → "You don't have access to this event" |

## 3. API specification

**`GET /api/organizer/events`** (ORGANIZER) → `200`
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "…",
      "startAt": "…",
      "endAt": "…",
      "status": "PUBLISHED",
      "effectiveStatus": "PUBLISHED",
      "capacity": 30,
      "activeCount": 3,
      "remainingSeats": 27
    }
  ]
}
```

**`GET /api/events/:id/registrations`** (ORGANIZER, owner) → `200`
```json
{
  "event": {
    "id": "uuid",
    "title": "…",
    "capacity": 30,
    "activeCount": 1
  },
  "registrations": [
    {
      "id": "uuid",
      "status": "ACTIVE",
      "registeredAt": "…",
      "student": {
        "id": "uuid",
        "displayName": "Student One",
        "studentNo": "66070501001",
        "email": "stu1@demo.kmutt.test"
      }
    }
  ]
}
```
Errors: `401` · `403 FORBIDDEN` (student) · `403 NOT_EVENT_OWNER` · `404 NOT_FOUND` (unknown or malformed id).

## 4. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-19 | **Given** org1 owns E-01…E-04 and org2 owns E-05, **when** org1 calls `GET /api/organizer/events`, **then** exactly E-01…E-04 are returned, each with correct `activeCount` and `remainingSeats`. |
| AC-20 | **Given** E-01 has ACTIVE registrations from stu1 then stu3, **when** org1 requests the roster, **then** both appear in registration order with name, student no., email and registeredAt, and `event.activeCount = 2`. |
| AC-21 | **When** org1 requests the roster of a non-existent UUID or a malformed id, **then** the response is 404 `NOT_FOUND`. |
| AC-22 | **UI:** My Events and the roster page show the data above, with the empty states "You have no events yet" / "No registrations yet". |

## 5. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-23 | AC-19 | API+DB | Fixtures: org1 has 2 events (one with 1 registration), org2 has 1 | org1 GET /organizer/events | Only org1's 2 ids. Counts 1/0 and remaining seats correct |
| TEST-24 | AC-20 | API+DB | Event with stu1 at t1, stu3 at t2 | org1 GET roster | Order [stu1, stu3]. Fields present. activeCount 2 |
| TEST-25 | AC-21 | API | org1 session | GET roster for random UUID and for `abc` | 404 both |
| TEST-40 | AC-22 | E2E | — | Main journey (roster shows the registered student) | — |

## 6. Definition of Done (feature)

Product DoD plus: roster query scoped by owner check (code review item). Cross-owner TEST-13 (F-02) passes.

## 7. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-12 | Initial contract for F-04 |
