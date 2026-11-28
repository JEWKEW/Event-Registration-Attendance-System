# Sprint 2 Engineering Contracts — Index, Foundation (`SR-01`), Auth Extension (`F-02`) & DoD

**Sprint goal:** Core expansion — complete the full event lifecycle (`DRAFT` → `PUBLISHED` → `CANCELLED` / derived `COMPLETED`), event editing & capacity guard, student self-cancel & re-registration, event search & filter, and organizer check-in/undo, while preserving 100% of Sprint 1 behavior, authentication, RBAC, and record ownership.
**Staging branch:** `sprint-2` (branched from `main @ 5543218`) · **Target pure Sprint 2 release:** `v0.2.0` on `main`.
**Developer:** Yotsapoom Liupolvanish (`@JEWKEW`) · **Reviewer:** Yoswat Amornvitkijvecha (`@Decaa0`).

---

## 1. Contract Index

| Contract | Feature | Requirements | AC | Tests | TDD Evidence |
|---|---|---|---|---|---|
| `SR-01` (§2 below) | Sprint 2 DB constraints (`0002`), `OBS-01` health metadata, seed `E-06..E-09` & factories | `NFR-06`, `NFR-08`, `NFR-09`, Lab 6 `OBS-01` | — | Supports all + migration/health checks | Standard |
| [F-08](F-08-draft-lifecycle.md) | Draft & event lifecycle | `FR-05`, `FR-23`, `BR-02`, `BR-09`, `BR-10` | `AC-36`–`AC-43` | `TEST-42`–`TEST-50` | Standard |
| [F-11](F-11-cancel-reregister.md) | Student self-cancel & re-register | `FR-16`, `FR-17`, `BR-08`, `BR-14`, `BR-15` | `AC-44`–`AC-49` | `TEST-51`–`TEST-58` | Standard |
| [F-13](F-13-checkin-undo.md) | Organizer check-in & undo | `FR-18`, `FR-19`, `BR-07`, `BR-16`, `BR-17` | `AC-50`–`AC-57` | `TEST-59`–`TEST-69` | **Featured TDD #2** |
| [F-09](F-09-edit-capacity.md) | Edit event & capacity change | `FR-06`, `FR-07`, `BR-01`, `BR-02`, `BR-07`, `BR-11`, `BR-12` | `AC-58`–`AC-64` | `TEST-70`–`TEST-79` | Standard |
| [F-10](F-10-cancel-event.md) | Cancel event with atomic cascade | `FR-08`, `BR-07`, `BR-10`, `BR-13` | `AC-65`–`AC-70` | `TEST-80`–`TEST-87` | **Featured TDD #1** |
| [F-12](F-12-search-filter.md) | Search & filter events | `FR-13`, `BR-08` | `AC-71`–`AC-74` | `TEST-88`–`TEST-94` | Standard |
| `F-02` ext (§3 below) | Sprint 2 authorization matrix & Sprint 1 regression extension | `BR-06`–`BR-09`, `NFR-02`, `NFR-03` | `AC-75`–`AC-76` | `TEST-95`–`TEST-97` | Standard |

---

## 2. `SR-01` Sprint 2 Foundation Contract (Migration `0002`, `OBS-01`, Seed `E-06..E-09`)

| Item | Specification |
|---|---|
| **Existing schema note** | `0001_init` (`server/prisma/schema.prisma`) **already includes** `events.cancel_reason`, `events.cancelled_at`, `registrations.cancelled_at`, `registrations.checked_in_at`, and `registrations.checked_in_by`. Do not re-add existing columns or edit `0001_init`. |
| **Migration `0002_sprint2_constraints`** | Raw SQL migration adding DB-level backstop constraints (v1.1 — backward-compatible with `0001_init` data and unmodified Sprint 1 tests `TEST-26`/`TEST-35`):<br>1. `ALTER TABLE events ADD CONSTRAINT chk_cancel_reason_len CHECK (cancel_reason IS NULL OR char_length(btrim(cancel_reason)) BETWEEN 1 AND 500);`<br>2. `ALTER TABLE registrations ADD CONSTRAINT chk_checkin_active_only CHECK (checked_in_at IS NULL OR status = 'ACTIVE');`<br>*(Revision note v1.1: `chk_cancelled_has_reason` was moved to `F-10` service/Zod validation so Sprint 1 fixtures `TEST-26` & `TEST-35` that insert bare `CANCELLED` rows remain untouched and 100% green.)* |
| **Lab 6 `OBS-01` fix (`/api/health`)** | Update `server/src/app.ts`, `Dockerfile`, and `.github/workflows/deploy.yml` so `APP_VERSION` (from build/env, e.g. `v0.2.0` / `v0.3.0-rc.1`) and `GIT_COMMIT` (`$GITHUB_SHA`) are passed into Cloud Run and returned accurately by `GET /api/health` (`{ status: "ok", version, commit }`). |
| **Deterministic seed additions (`server/prisma/seed.ts`)** | Preserve `E-01`–`E-05` and `R-01` unchanged. Add fixed-UUID synthetic records:<br>- `E-06` (`...0006`): `DRAFT` owned by `org1` (future start)<br>- `E-07` (`...0007`): `PUBLISHED` owned by `org1`, starts in +30 min / ends in +3 h (inside check-in window), with `stu1` and `stu2` `ACTIVE`<br>- `E-08` (`...0008`): `CANCELLED` owned by `org1` with `cancel_reason` + `cancelled_at` and `stu3` `CANCELLED_BY_EVENT`<br>- `E-09` (`...0009`): `PUBLISHED` owned by `org1`, already ended (`endAt < now`), with `stu1` checked-in (`ATTENDED`), `stu2` not checked-in (`ABSENT`), and `stu3` self-cancelled (`CANCELLED`) — ready for `F-14`. |
| **Test factories (`server/test/helpers/`)** | Add `makeEvent(overrides)` and `makeRegistration(overrides)` helpers to keep Sprint 2/3 API+DB tests deterministic and concise. |
| **UI layer** | No change required. |

---

## 3. `F-02` Sprint 2 Authorization & Regression Extension Contract

**Requirements:** `BR-06`, `BR-07`, `BR-08`, `BR-09`, `NFR-02`, `NFR-03` · **Depends on:** `F-08`–`F-13` · **AC:** `AC-75`–`AC-76` · **Tests:** `TEST-95`–`TEST-97`.

### Sprint 2 Protected Endpoint Additions (Added to `TEST-10` Inventory)

| Method & Path | Allowed Role | Ownership / Scope |
|---|---|---|
| `POST /api/events/:id/publish` | `ORGANIZER` | Own event only (`403 NOT_EVENT_OWNER`) |
| `DELETE /api/events/:id` | `ORGANIZER` | Own draft event only (`403 NOT_EVENT_OWNER`) |
| `PATCH /api/events/:id` | `ORGANIZER` | Own event only (`403 NOT_EVENT_OWNER`) |
| `POST /api/events/:id/cancel` | `ORGANIZER` | Own event only (`403 NOT_EVENT_OWNER`) |
| `POST /api/registrations/:id/cancel` | `STUDENT` | Own registration only (`404 NOT_FOUND` for others) |
| `POST /api/registrations/:id/check-in` | `ORGANIZER` | Owner of the registration's event (`403 NOT_EVENT_OWNER`) |
| `DELETE /api/registrations/:id/check-in` | `ORGANIZER` | Owner of the registration's event (`403 NOT_EVENT_OWNER`) |
| `GET /api/events?q=&category=&from=&to=` | Any authenticated | `PUBLISHED` not-ended only; aggregate counts only (`BR-08`) |

### Acceptance Criteria & STS

| AC | Given / When / Then |
|---|---|
| **AC-75** | **Given** all Express routes mounted under `/api` (excluding `/api/health`, `/api/ready`, `/api/auth/login`, `/api/auth/logout`), **when** the route-audit and auth-matrix suite runs, **then** 100% of protected Sprint 1 + Sprint 2 endpoints are present in the unauthenticated `401` table and enforce role, ownership, and strict-schema rejection (`NFR-02`, `NFR-03`, `DEC-15`). |
| **AC-76** | **Given** the complete Sprint 2 candidate on `sprint-2`, **when** the full Sprint 1 unit, API+DB (`TEST-01`–`TEST-39`), and E2E (`TEST-09`, `TEST-40`, `TEST-41`) suites execute without modifying assertions, **then** 100% pass with 0 failed and 0 skipped. |

| Test | AC | Level | Precondition / Input | Action | Expected Result |
|---|---|---|---|---|---|
| `TEST-95` | `AC-75` | API | Express app router stack + `PROTECTED_ENDPOINTS` table | Inspect mounted `/api/*` routes; call every route without session cookie | Zero uncovered protected routes; every route returns `401 UNAUTHENTICATED` with only `["error"]` key |
| `TEST-96` | `AC-75` | API+DB | `stu1`, `stu2`, `org1`, `org2` sessions across all new S2 routes | Forbidden-role, cross-owner, cross-student, and spoofed-key (`organizerId`, `studentId`, `status`, `checkedInBy`) matrix | `403 FORBIDDEN` / `403 NOT_EVENT_OWNER` / `404 NOT_FOUND` / `400 VALIDATION_ERROR`; DB unchanged |
| `TEST-97` | `AC-76` | API+DB + E2E | Full Sprint 2 codebase | Run full Sprint 1 regression suite + cross-feature E2E (`cancel → re-register`, `draft → publish`, `check-in → block cancel`, `cancel event → block register`) | 0 failures, 0 skips |

---

## 4. Settled Cross-Feature Interaction Hazards

All Sprint 2 contracts obey these seven resolved decisions:

| # | Hazard | Settled Rule |
|---|---|---|
| 1 | Student registers on a `DRAFT` (`F-06` vs `F-08` `BR-09`) | Service checks visibility first → **`404 NOT_FOUND`** (never leaks draft existence). Pure `checkRegistrationEligibility` keeps `EVENT_NOT_OPEN` for `CANCELLED`/`COMPLETED`. Recorded in `F-06` changelog v1.1. |
| 2 | Saving a `DRAFT` with past `startAt` (`F-08` `BR-02`) | Allowed while `DRAFT` (as long as `registrationDeadline ≤ startAt < endAt`); future check `startAt > now` is enforced at **publish** (`POST /api/events/:id/publish`) and direct publish (`POST /api/events` with `publish !== false`). |
| 3 | `F-09` `PATCH` sending unchanged `startAt`/`endAt` | Sending the **same** timestamp value as currently stored is accepted so edit forms can resubmit full payloads; changing either timestamp when `activeCount ≥ 1` returns `409 FIELD_LOCKED`. |
| 4 | Student self-cancels a `CANCELLED_BY_EVENT` or already `CANCELLED` row (`F-11`) | Returns `409 INVALID_TRANSITION` (reuses SDS C.4 error code). |
| 5 | Organizer checks in on a `CANCELLED` event or non-`ACTIVE` registration (`F-13`) | Rejected (`409 EVENT_NOT_OPEN` if event is not `PUBLISHED`, `409 INVALID_TRANSITION` if registration is not `ACTIVE`); DB unchanged. |
| 6 | Capacity decrease racing with concurrent student registration (`F-09` vs `F-06`) | Both transactions acquire `SELECT ... FOR UPDATE` on the event row (`DEC-06`), guaranteeing `activeCount ≤ capacity` in every interleaving. |
| 7 | Backward compatibility of Sprint 1 API payloads | New fields (`effectiveStatus`, `checkedInAt`, `cancelReason`, `cancelledAt`) are strictly additive; `POST /api/events` defaults `publish = true` when omitted so all Sprint 1 tests remain green. |

---

## 5. Sprint 2 Definition of Done & Completion Table

Every Sprint 2 feature satisfies Product DoD (`E.0d`) plus:
1. Contract + STS committed to `sprint-2` (`docs:` commit) **before** implementation commits.
2. Every AC maps to named automated tests (`TEST-42`–`TEST-97`) passing with 0 skipped and no weakened assertions.
3. Featured TDD red→green commit evidence preserved for **`F-10`** and **`F-13`**.
4. Every new endpoint covered by `TEST-95`/`TEST-96` (401, forbidden role, cross-owner/cross-student, spoofed keys).
5. PR into `sprint-2` approved by `@Decaa0` with a substantive review comment.
6. Full `npm test` (Sprint 1 + Sprint 2) passes on `sprint-2` and release PR `sprint-2 → main` tagged `v0.2.0`.

| Feature | Issue | AC | Contract SHA | Red SHA | Green SHA | PR → `sprint-2` | Reviewer | Tests (Pass/Fail/Skip) | Status | Release |
|---|---|---|---|---|---|---|---|---|---|---|
| `SR-01` (S2) | `#38` | `OBS-01`, `0002` | `a22fdd1` | — | | | `@Decaa0` | | Specified | |
| `F-08` | `#39` | `AC-36`–`AC-43` | `a22fdd1` | | | | `@Decaa0` | | Specified | |
| `F-11` | `#40` | `AC-44`–`AC-49` | `a22fdd1` | | | | `@Decaa0` | | Specified | |
| `F-13` | `#41` | `AC-50`–`AC-57` | `a22fdd1` | *(required)* | | | `@Decaa0` | | Specified | |
| `F-09` | `#42` | `AC-58`–`AC-64` | `a22fdd1` | | | | `@Decaa0` | | Specified | |
| `F-10` | `#43` | `AC-65`–`AC-70` | `a22fdd1` | *(required)* | | | `@Decaa0` | | Specified | |
| `F-12` | `#44` | `AC-71`–`AC-74` | `a22fdd1` | | | | `@Decaa0` | | Specified | |
| `F-02` ext | `#45` | `AC-75`–`AC-76` | `a22fdd1` | | | | `@Decaa0` | | Specified | |
