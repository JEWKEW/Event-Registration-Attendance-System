# E.3 Contract F-03 — Create & Publish Event

| Field | Value |
|---|---|
| Feature | F-03 Create & publish event |
| Requirements | FR-04, BR-01, BR-02, (BR-06 via F-02) |
| Depends on | F-01, F-02 |
| Issue / branch | #4 · `feature/F-03-create-event` |
| Contract version | 1.0 |

## 1. Feature-level design

**Workflow.** The organizer opens `/organizer/events/new`, fills in the form and clicks **Publish**. The API validates, the service checks the schedule against `clock.now()`, and inserts the event with `status = PUBLISHED`, `publishedAt = now`, `organizerId = req.user.id`. The UI redirects to `/organizer/events/:id`.

**Sprint 1 simplification.** Every event is published on creation. Sprint 2 (F-08) adds `publish: false` → DRAFT. This is recorded as planned evolution, not a change in scope.

**Validation and business rules**

| Field | Rule | Source |
|---|---|---|
| `title` | string, trimmed, 3–120 chars | — |
| `description` | string, 0–2000 chars (default "") | — |
| `category` | one of `WORKSHOP, SEMINAR, CAMP, SPORTS, VOLUNTEER, OTHER` | — |
| `location` | string, trimmed, 1–200 chars | — |
| `capacity` | integer, 1 ≤ c ≤ 1000 | BR-01 |
| `startAt`, `endAt`, `registrationDeadline` | ISO-8601 datetime with offset | — |
| schedule | `registrationDeadline ≤ startAt`, `startAt < endAt`, `startAt > now` | BR-02 |
| unknown keys | rejected | DEC-15 |

Pure function `validateSchedule({startAt, endAt, registrationDeadline}, now)` returns a list of field issues. It is used by the service and unit-tested. DB CHECK constraints back up BR-01/BR-02.

**Permissions.** ORGANIZER only (403 otherwise, AC-09). Owner = session user.

## 2. UI specification

Form fields as above. Category is a select. Date/time inputs are in Bangkok time and converted to ISO with offset `+07:00`. Capacity is a number input (min 1, max 1000). Field errors appear under the inputs, from client Zod and from server `details`. The **Publish** button is disabled while pending. Success → toast "Event published" and redirect to the roster page.

## 3. API specification

**`POST /api/events`** (ORGANIZER)

```json
{
  "title": "Intro to Git Workshop",
  "description": "Hands-on Git for first-years",
  "category": "WORKSHOP",
  "location": "CB2301, KMUTT",
  "startAt": "2026-11-20T09:00:00+07:00",
  "endAt": "2026-11-20T12:00:00+07:00",
  "registrationDeadline": "2026-11-18T23:59:00+07:00",
  "capacity": 30
}
```

`201` →
```json
{ "event": { "id": "uuid", "organizerId": "uuid", "title": "…", "description": "…", "category": "WORKSHOP",
  "location": "…", "startAt": "2026-11-20T02:00:00.000Z", "endAt": "…", "registrationDeadline": "…",
  "capacity": 30, "status": "PUBLISHED", "effectiveStatus": "PUBLISHED", "publishedAt": "…",
  "activeCount": 0, "remainingSeats": 30, "registrationOpen": true } }
```

Errors: `400 VALIDATION_ERROR` (details per field) · `401` · `403 FORBIDDEN`.

## 4. Data specification

Table `events` from `0001_init`:
`id uuid PK default gen_random_uuid()`, `organizer_id uuid NOT NULL FK users`, `title varchar(120) NOT NULL`, `description text NOT NULL DEFAULT ''`, `category event_category NOT NULL`, `location varchar(200) NOT NULL`, `start_at/end_at/registration_deadline timestamptz NOT NULL`, `capacity int NOT NULL`, `status event_status NOT NULL DEFAULT 'DRAFT'`, `published_at timestamptz NULL`, `created_at/updated_at timestamptz NOT NULL DEFAULT now()`.
Raw SQL in the migration:
```sql
ALTER TABLE events ADD CONSTRAINT chk_capacity CHECK (capacity BETWEEN 1 AND 1000);
ALTER TABLE events ADD CONSTRAINT chk_schedule CHECK (registration_deadline <= start_at AND start_at < end_at);
CREATE INDEX idx_events_status_start ON events(status, start_at);
```

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-14 | **Given** org1 is logged in, **when** they POST a valid event, **then** the response is 201, a row exists with `status=PUBLISHED`, `organizer_id=org1`, `published_at` set, and the event appears in `GET /api/events` with `remainingSeats = capacity`. |
| AC-15 | **When** capacity is 0, −1, 1.5, 1001 or "abc", **then** the response is 400 `VALIDATION_ERROR` with field `capacity` and no row is stored. Capacity 1 and 1000 are accepted. |
| AC-16 | **When** `endAt ≤ startAt`, `registrationDeadline > startAt` or `startAt ≤ now`, **then** the response is 400 with the offending field(s) and no row is stored. `registrationDeadline = startAt` is accepted. |
| AC-17 | **When** title is < 3 or > 120 chars, location is empty, description > 2000 chars or category is not in the enum, **then** the response is 400 with that field. |
| AC-18 | **UI:** the organizer can fill in the form and publish, sees field errors for invalid input without losing the entered values, and is redirected to the new event's roster page on success. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-17 | AC-16 | Unit | Fixed `now = 2026-11-10T00:00Z`. Cases: valid; end = start; end < start; deadline = start; deadline = start + 1 s; start = now; start = now + 1 s | `validateSchedule` | Issues exactly as expected per case (deadline = start valid, start = now invalid, start = now + 1 s valid) |
| TEST-18 | AC-15 | Unit | Capacity values 0, 1, 1000, 1001, −1, 1.5, "abc" | `createEventSchema.safeParse` | Only 1 and 1000 succeed |
| TEST-19 | AC-14 | API+DB | org1 session | POST valid event. Read DB. GET /api/events | 201. Row fields as expected. Listed with remainingSeats 30 |
| TEST-20 | AC-15 | API+DB | org1 session | POST with capacity 0 and with 1001 | 400 field capacity. Event count unchanged |
| TEST-21 | AC-16 | API+DB | org1 session, fake clock | POST with deadline after start. POST with start in the past | 400 with fields `registrationDeadline` / `startAt`. No rows |
| TEST-22 | AC-17 | API | org1 session | Table-driven invalid text/category bodies | 400 with matching field |
| TEST-40 | AC-18 | E2E | — | Part of the main journey (see F-07 contract) | — |

## 7. Definition of Done (feature)

Product DoD plus: CHECK constraints present in the migration (verified by inspecting `\d events` or a DB test). Boundary values covered.
