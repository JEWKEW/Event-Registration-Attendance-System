# Contract F-17 — Hardening, Load Verification & Final Release (`v1.0.0`)

| Field | Value |
|---|---|
| Feature | F-17 Production hardening: safe 5xx responses, complete UI states, full auth regression & Cloud Run load test |
| Requirements | `NFR-02`, `NFR-03`, `NFR-07`, `NFR-10`, `NFR-12` |
| Depends on | All features (`F-01`–`F-16`) |
| Branch | `feature/F-17-hardening` (from `sprint-3`, post-Deliverable 2) |
| Contract version | 1.0 · committed on `2026-11-28` (before implementation) |
| Deliverable 2 Status | **Specified** (remaining work; target **13 Dec 2026**) |
| Assignee / Reviewer | `@JEWKEW` / `@Decaa0` |

## 1. Feature-level design

1. **Safe 5xx error handling (`NFR-12`):** Central `errorHandler` catches any unhandled non-`AppError` exception, logs structured error + request ID server-side, and returns `500` with strictly `{ "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred.", "details": [] } }` — never exposing stack traces, Prisma/SQL error text, environment variables, or file paths.
2. **Complete UI states & 375 px responsiveness (`NFR-10`):** Audit every screen (`/login`, `/events`, `/events/:id`, `/me/registrations`, `/me/registrations/:id`, `/me/history`, `/organizer/events`, `/organizer/events/new`, `/organizer/events/:id`, `/organizer/events/:id/edit`, `/organizer/events/:id/summary`, `/organizer/dashboard`) to ensure distinct Loading, Empty, and Error (+ Retry) states, mapped business-error alerts, and zero horizontal overflow at 375 px mobile viewport.
3. **Full product authorization regression (`NFR-02`, `NFR-03`):** Extend `TEST-95`/`TEST-96` to cover 100% of Sprint 1 + Sprint 2 + Sprint 3 routes (including `/api/events/:id/summary`, `/api/organizer/dashboard`, `/api/me/history`).
4. **Performance / load verification (`NFR-07`):** Provide a reproducible `scripts/load-seed.ts` + `autocannon` script targeting `GET /api/events` and `POST /api/events/:id/registrations` with **200 events and 5 000 registrations** at **20 concurrent users** against the deployed Cloud Run instance (or staging DB), asserting `p95 < 500 ms` and zero 5xx responses.
5. **Final release readiness:** Re-run full unit + API/DB + E2E suite, UAT re-tests, merge `sprint-3 → main`, tag `v1.0.0`, verify Cloud Run deployment, and record final demo video.

## 2. UI specification

No new routes. Refines loading/empty/error states, retry actions, and 375 px responsive layout across all 12 screens listed in SDS C.3.1.

## 3. API specification

No new public endpoints. Enforces `NFR-12` error envelope across all `/api/*` routes:
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred.", "details": [] } }
```

## 4. Data specification

No schema migration needed. Adds an isolated synthetic load-test seed script (`scripts/load-seed.ts`, never run by default in `db:seed`) for `NFR-07`.

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-91 (`NFR-12`)** | **Given** a forced unexpected exception in a service/DB call, **when** a client requests that API endpoint, **then** the response is `500` with `{ error: { code: "INTERNAL_ERROR", message, details: [] } }` containing no stack trace, SQL, Prisma error code, or filesystem path. |
| **AC-92 (`NFR-02`, `NFR-03`)** | **Given** all Express `/api/*` routes across Sprints 1–3, **when** the automated route-audit and RBAC/ownership suite runs, **then** 100% of protected routes enforce `401`, forbidden-role `403`, ownership (`403`/`404`), and strict schema `400`. |
| **AC-93 (`NFR-10`)** | **Given** all 12 screens at 375 px viewport width, **when** loading, empty, and API-failure states are triggered, **then** each screen renders explicit loading/empty/error UI with no horizontal scroll overflow. |
| **AC-94 (`NFR-07`)** | **Given** synthetic dataset of 200 events and 5 000 registrations, **when** `autocannon` runs 20 concurrent users against `GET /api/events` and `POST /api/events/:id/registrations` on the deployed instance, **then** `p95 < 500 ms` and `5xx = 0`. |
| **AC-95** | **Given** `v1.0.0` tagged on `main` and deployed on Cloud Run, **then** 100% of automated tests pass (0 failed, 0 skipped), `GET /api/health` matches `v1.0.0` and commit SHA, and post-deploy persistence + UAT re-tests pass. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-115` | `AC-91` | API | Spy/mock forcing `new Error("SELECT * FROM users failed at /app/server")` inside service | Call protected endpoint | `500 INTERNAL_ERROR`; body regex check confirms no `SELECT`, `Error:`, `/app/`, or `stack` |
| `TEST-116` | `AC-92` | API | Full Express router stack (S1+S2+S3) | Route-audit sweep (`401`) + full RBAC/ownership matrix | 100% route coverage, 0 failures |
| `TEST-117` | `AC-93` | E2E (Playwright) | 375×812 mobile viewport | Visit key student & organizer screens; mock 500 error & empty list | Visible error + Retry & empty states; `scrollWidth <= clientWidth` |
| `TEST-118` | `AC-94` | Load (`autocannon`) | 200 events + 5 000 registrations seeded | Run load script (`-c 20`) against `GET /api/events` and register endpoint | `p95 < 500 ms`, `0` 5xx errors; raw report saved in `docs/sprints/sprint-3/evidence/` |
| `TEST-119` | `AC-95` | Full regression | Release `v1.0.0` commit | `npm run build && npm test && npm run test:e2e` | 0 failed, 0 skipped |
| `TEST-120` | `AC-95` | Post-deploy smoke | Live Cloud Run `v1.0.0` | `smoke_test.py` + critical journey + redeploy persistence check | `/api/health` matches `v1.0.0` SHA; data persists |
| `M-04` | `AC-93`, `AC-95` | Manual | Full 12-screen UI checklist + UAT re-test + demo video | Execute & record checklist | Signed off for final 13 Dec submission |

## 7. Definition of Done (feature)

Sprint 3 DoD plus: `TEST-115`–`TEST-120` and `M-04` completed and verified on `v1.0.0`; zero secrets in Git/PDF (`NFR-11`).

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-28 | Initial Sprint 3 contract for F-17 |
