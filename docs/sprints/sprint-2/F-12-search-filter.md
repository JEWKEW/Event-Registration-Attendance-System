# Contract F-12 — Search & Filter Events

| Field | Value |
|---|---|
| Feature | F-12 Keyword search, category filter, and date-range filter on upcoming events |
| Requirements | `FR-13`, `BR-08` |
| Depends on | `F-05` |
| Branch | `feature/F-12-search-filter` (from `sprint-2`) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |

## 1. Feature-level design

**Workflow & query semantics (`GET /api/events`).**
Extends `GET /api/events` with optional strict query parameters (`q`, `category`, `from`, `to`):
- Always preserves the baseline filter: `status = 'PUBLISHED' AND end_at > clock.now()`, sorted by `start_at ASC`, returning aggregate counts only (`BR-08`, never drafts, cancelled, ended, or registrant PII).
- `q` (optional string, trimmed, `1..100` chars): case-insensitive substring match against `title` **or** `description`. Escapes SQL LIKE metacharacters (`%`, `_`, `\`) and uses Prisma/parameterized queries only (never raw string interpolation). Empty `q=` treated as omitted.
- `category` (optional enum): one of `WORKSHOP | SEMINAR | CAMP | SPORTS | VOLUNTEER | OTHER`.
- `from` / `to` (optional ISO date `YYYY-MM-DD` or ISO-8601 datetime):
  - Plain `YYYY-MM-DD` dates are interpreted in `Asia/Bangkok (+07:00)`: `from` = `00:00:00.000+07:00` (inclusive), `to` = `23:59:59.999+07:00` (inclusive), matched against `event.start_at`.
  - If both `from` and `to` are supplied and `from > to`, reject with `400 VALIDATION_ERROR`.
- Strict query schema rejects unknown query parameters (`400 VALIDATION_ERROR`).

**Permissions.** Any authenticated user (`401 UNAUTHENTICATED` without session).

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/events` | Search input (`q`), Category dropdown (`All` + 6 categories), From/To date pickers, and **Clear filters** button. Filter values sync with URL query params (`/events?q=...&category=...&from=...&to=...`) so reload/share preserves state. Distinct empty state: *"No events match your filters"* with **Clear filters** CTA (distinct from *"No upcoming events"* when unfiltered). |

## 3. API specification

**`GET /api/events?q=git&category=WORKSHOP&from=2026-12-01&to=2026-12-31`** (any authenticated)
`200` → Same response shape as Sprint 1 `F-05`: `{ "events": [ ... ] }`.
Errors: `400 VALIDATION_ERROR` (unknown query key, unknown category, malformed date, `from > to`, `q.length > 100`) · `401 UNAUTHENTICATED`.

## 4. Data specification

No schema migration needed. Uses existing index `idx_events_status_start_at`.

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-71** | **Given** published upcoming events, **when** calling `GET /api/events?q=...`, **then** matches `title` or `description` case-insensitively, treats `%` and `_` literally (never matching unrelated events), and never returns `DRAFT`, `CANCELLED`, or ended events. |
| **AC-72** | **When** filtering by `category`, `from`, `to`, or all combined (`q + category + from + to`), **then** only matching upcoming `PUBLISHED` events are returned in `startAt ASC` order with inclusive Bangkok-time date boundaries. |
| **AC-73** | **When** sending an unknown category, malformed date, `from > to`, `q` of 101 chars, or an unknown query key (`foo=bar`), **then** `400 VALIDATION_ERROR` with `details[].field`. |
| **AC-74** | **UI:** `/events` search/filter controls update URL query params, show *"No events match your filters"* when empty, and **Clear filters** restores the full list. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-88` | `AC-73` | Unit | Query param table (valid, `from > to`, `q` 101 chars, bad enum, bad date, unknown key) | `listEventsQuerySchema.safeParse` | Exact pass/fail per case |
| `TEST-89` | `AC-71` | API+DB | Events with title/desc `"100% Git_Lab"`, `"Python Camp"`, plus `DRAFT`/`CANCELLED`/ended | `GET /api/events?q=git`, `?q=100%25`, `?q=git_lab` | Case-insensitive match; `%` & `_` literal; drafts/cancelled/ended excluded |
| `TEST-90` | `AC-72` | API+DB | Events across categories & Bangkok date boundaries | Filter by `category`, `from`, `to`, and combined | Exact expected IDs in `startAt ASC` order |
| `TEST-91` | `AC-73` | API | Authenticated student | Invalid query params (`category=FAKE`, `from=2026-12-10&to=2026-12-01`, `q=101`, `foo=1`) | `400 VALIDATION_ERROR` each |
| `TEST-92` | `AC-71` | API+DB | Event with registered `stu2` | `stu1` searches matching event | Response JSON contains no `stu2` PII (`BR-08`) |
| `TEST-93` | `AC-73` | API | No cookie | `GET /api/events?q=git` | `401 UNAUTHENTICATED` |
| `TEST-94` | `AC-74` | E2E | Running app | Enter keyword & category, reload page, test empty state, click Clear filters | URL preserves params; empty state & reset work |

## 7. Definition of Done (feature)

Sprint 2 DoD plus: `TEST-88`–`TEST-94` pass; Sprint 1 `GET /api/events` (no query params) tests remain green.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 2 contract for F-12 |
