# E.5 Contract F-05 — Browse & View Events

| Field | Value |
|---|---|
| Feature | F-05 Browse upcoming events and view details |
| Requirements | FR-11, FR-12, BR-08 |
| Depends on | F-03 |
| Issue / branch | #6 · `feature/F-05-browse-events` |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` |

## 1. Feature-level design

- **List:** `status = PUBLISHED AND end_at > now`, ordered by `start_at` ascending. Each item has `activeCount`, `remainingSeats`, `registrationOpen` (PUBLISHED and `now ≤ registrationDeadline` and `remainingSeats > 0`) and `organizerName`. No pagination in S1 (≤ 100 events expected. Pagination is part of the S2 search work if needed).
- **Detail:** any event by id that is PUBLISHED (S1 has no drafts). Unknown id → 404. For a STUDENT caller, `myRegistration` = their ACTIVE registration `{id, status, registeredAt}` or `null`. For an ORGANIZER caller it is always `null`.
- **Privacy (BR-08):** list and detail responses contain **no** registrant identities, only counts.
- **Permissions:** any authenticated user. Organizers may browse too.
- **Data:** no schema change.

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/events` | Card list: title, category chip, date/time (Bangkok), location, "X seats left". Badge **Full** if remainingSeats = 0. **Closed** if the deadline has passed. **Registered** if the student holds a registration (fetched via `/me/registrations`). Empty: "No upcoming events". Loading skeleton cards. Error + Retry |
| `/events/:id` | Full details, organizer name, deadline, seats left. Action area: **Register** (F-06), or "You're registered ✓" + link to the registration, or a disabled button with reason "Full" / "Registration closed". 404 page for unknown id |

## 3. API specification

**`GET /api/events`** → `200`
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "…",
      "category": "WORKSHOP",
      "location": "…",
      "startAt": "…",
      "endAt": "…",
      "registrationDeadline": "…",
      "capacity": 30,
      "activeCount": 3,
      "remainingSeats": 27,
      "registrationOpen": true,
      "organizerName": "Computer Club"
    }
  ]
}
```

**`GET /api/events/:id`** → `200`
```json
{
  "event": {
    "id": "uuid",
    "title": "…",
    "description": "…",
    "category": "WORKSHOP",
    "location": "…",
    "startAt": "…",
    "endAt": "…",
    "registrationDeadline": "…",
    "capacity": 30,
    "status": "PUBLISHED",
    "effectiveStatus": "PUBLISHED",
    "activeCount": 3,
    "remainingSeats": 27,
    "registrationOpen": true,
    "organizerName": "Computer Club"
  },
  "myRegistration": null
}
```
Errors: `401` · `404 NOT_FOUND` (unknown or malformed id, or non-published event).

## 4. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-23 | **Given** published future events, one ended event and one CANCELLED event (fixture), **when** a student calls `GET /api/events`, **then** only the published, not-ended events are returned, sorted by `startAt`, with correct `remainingSeats`/`registrationOpen`, and no item contains registrant ids, names or emails. |
| AC-24 | **Given** stu1 is registered for E-01, **when** stu1 GETs `/api/events/E-01`, **then** `myRegistration` holds that registration. For stu3 it is `null`. Unknown/malformed id → 404. |
| AC-25 | **UI:** the list shows seats left and Full/Closed badges plus an empty state. The detail page shows the correct action state (Register / Registered / Full / Closed). |

## 5. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-26 | AC-23 | API+DB | Fixtures: 2 future (start +2 d, +1 d), 1 ended, 1 CANCELLED. Fake clock | stu1 GET /events | Exactly the 2 future events, order [+1 d, +2 d]. Counts correct. Full event has `registrationOpen=false` |
| TEST-27 | AC-23 | API | Event with 1 registration by stu2 | stu1 GET /events and /events/:id | Serialized JSON contains no stu2 id/email/name |
| TEST-28 | AC-24 | API+DB | stu1 registered on E | stu1 and stu3 GET /events/E | stu1: `myRegistration.id` matches. stu3: null |
| TEST-29 | AC-24 | API | — | GET /events/{random uuid}, /events/abc | 404 both |
| TEST-40 | AC-25 | E2E | — | Main journey | — |
| TEST-41 | AC-25 | E2E | — | Full-event journey (shows Full badge / disabled button) | — |

## 6. Definition of Done (feature)

Product DoD plus: DTO for student-facing events reviewed for privacy (no nested registrations).

## 7. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-12 | Initial contract for F-05 |
