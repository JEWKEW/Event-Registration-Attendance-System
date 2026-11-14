# E.7 Contract F-07 — My Registrations

| Field | Value |
|---|---|
| Feature | F-07 Student's own registrations (list + detail) |
| Requirements | FR-15, BR-08, NFR-06 |
| Depends on | F-06 |
| Issue / branch | #8 · `feature/F-07-my-registrations` |
| Contract version | 1.0 · recorded in commit `<sha>` on 2026-11-14 |

## 1. Feature-level design

- **List:** `WHERE student_id = req.user.id`, all statuses (S1 only produces ACTIVE), joined with event summary fields, ordered by event `start_at` ascending.
- **Detail:** `WHERE id = :id AND student_id = req.user.id`. Not found (or not owned) → 404 (DEC-14, AC-12).
- **Persistence:** read straight from PostgreSQL, no in-memory cache, so results survive an app restart (NFR-06).
- **Permissions:** STUDENT only (AC-10).
- **Data:** no schema change.

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/me/registrations` | List: event title (link) · date/time · location · status badge (Active) · registered at. Empty: "You haven't registered for any events yet" + link to `/events` |
| `/me/registrations/:id` | Registration id (short), status, registered at, event details. 404 page if not found |

## 3. API specification

**`GET /api/me/registrations`** (STUDENT) → `200`
```json
{
  "registrations": [
    {
      "id": "uuid",
      "status": "ACTIVE",
      "registeredAt": "2026-11-10T03:15:00.000Z",
      "event": {
        "id": "uuid",
        "title": "Title",
        "startAt": "2026-11-20T10:00:00.000Z",
        "endAt": "2026-11-20T12:00:00.000Z",
        "location": "CB2301",
        "effectiveStatus": "PUBLISHED"
      }
    }
  ]
}
```
**`GET /api/registrations/:id`** (STUDENT, own) → `200 { "registration": { ...same item shape... } }` · `404 NOT_FOUND`.

## 4. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-33 | **Given** stu1 has registrations on E-01 and E-02 and stu2 has one on E-05, **when** stu1 calls `GET /api/me/registrations`, **then** exactly stu1's two registrations are returned with event title/time/location, ordered by event start. |
| AC-34 | **Given** stu1's registration R, **when** stu1 calls `GET /api/registrations/R`, **then** 200 with the details. The same request still returns R after the API process restarts (new app instance on the same DB). |
| AC-35 | **UI:** My Registrations shows the student's registrations, or the empty state, and each item links to its detail. |

## 5. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-38 | AC-33 | API+DB | Fixtures as in AC-33 | stu1 GET /me/registrations | 2 items, both student_id stu1, order by start |
| TEST-39 | AC-34 | API+DB | stu1 registers via app instance #1 | Build a **new** `createApp()` instance (fresh Prisma client). GET /registrations/R with a new login | 200, same id and registeredAt |
| M-01 | AC-34 | Manual | Local app running, stu1 registered on E-01 | Stop the server and the Postgres container, start both again, log in, open My Registrations | Registration still listed. Screenshot in Part F |
| TEST-40 | AC-35 | E2E | Seeded DB | **Main journey:** org1 logs in → creates and publishes event X (cap 2) → logs out → stu1 logs in → finds X in `/events` → opens it → Register → "You're registered" → My Registrations lists X → logs out → org1 logs in → roster of X shows Student One | Every step visible as described |

## 6. Definition of Done (feature)

Product DoD plus: M-01 executed and screenshot captured for Part F.

## 7. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-14 | Initial contract for F-07 |
