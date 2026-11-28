# Sprint 2 & Sprint 3 Execution Plan — KMUTT Event Registration & Attendance System

| Field | Value |
|---|---|
| **Team / Group** | `EN-050_P3` (Team YH, Section 31) |
| **Developer (Assignee)** | Yotsapoom Liupolvanish (`67070503493`, `@JEWKEW`) |
| **Peer Reviewer** | Yoswat Amornvitkijvecha (`67070503494`, `@Decaa0`) |
| **Repository** | https://github.com/JEWKEW/Event-Registration-Attendance-System |
| **GitHub Project** | https://github.com/users/JEWKEW/projects/12 |
| **Accepted Sprint 1 Baseline** | Tag `v0.1.0` (`b38e806`, PR #19) · Deployed Lab 5/6 accepted release `main @ 5543218` (`sd74cc9ff-00006-dd7`, Lab 6 UAT 23/23 PASS, 0 Sprint 1 functional defects) |
| **Deliverable 2 Deadline** | **Sunday 29 November 2026 at 23:59 (Asia/Bangkok)** |
| **Final Delivery Deadline** | **Sunday 13 December 2026** (working around finals **1–11 December**) |

---

## 1. Release & Branching Flow

1. **Sprint 1 Baseline:** Tag `v0.1.0` on `b38e8068368a48e379218bc0126352d7a0ef4e10` (PR #19). Lab 5/6 cloud-deployed baseline is `main @ 5543218` (`sd74cc9ff-00006-dd7`).
2. **Sprint 2 (`sprint-2` → `main` tag `v0.2.0`):**
   - Branched from `main @ 5543218`.
   - Versioned Sprint 2 (`F-08`–`F-13`) and Sprint 3 (`F-14`–`F-17`) contracts are committed as `docs:` commits **before** any implementation code.
   - All Sprint 2 features (`SR-01`, `F-08`, `F-09`, `F-10`, `F-11`, `F-12`, `F-13`, `F-02` extension) merge via teammate-reviewed PRs (`@Decaa0`) into `sprint-2`.
   - Release PR `sprint-2 → main` merges and is tagged **`v0.2.0`** so the pure Sprint 2 release remains permanently identifiable on `main`.
3. **Sprint 3 Progress & Deliverable 2 Candidate (`sprint-3` → `main` tag `v0.3.0-rc.1`):**
   - Branched from `v0.2.0`.
   - Implements and verifies **`F-14` (Event Attendance Summary & `BR-18`)**.
   - Release PR `sprint-3 → main` merges and is tagged **`v0.3.0-rc.1`**, automatically deploying to Cloud Run (`sd74cc9ff`) via Lab 5 `deploy.yml` with `prisma migrate deploy` (`0002_sprint2_constraints`) and `/api/health` reporting the exact release version and commit SHA (resolving Lab 6 `OBS-01`).
4. **Final Completion (`sprint-3` → `main` tag `v1.0.0`, due 13 Dec):**
   - Completes remaining planned Sprint 3 features (`F-15`, `F-16`, `F-17`), load check (`NFR-07`), UAT re-tests, and final demo video.

---

## 2. Featured TDD Red → Green & PDF Evidence Chains

| Chain | Sprint | Feature | Why Selected |
|---|---|---|---|
| **1** | Sprint 2 | **F-10** Cancel event with atomic cascade | Multi-row DB transaction (`PUBLISHED → CANCELLED` + `CANCELLED_BY_EVENT` cascade), fault-injection rollback (`AC-67`), `BR-07` ownership, DB `CHECK` constraint |
| **2** | Sprint 2 | **F-13** Check-in & undo window | Injectable clock boundaries (`startAt - 60 min ≤ now ≤ endAt` ±1 s), concurrent conditional check-in (`AC-52`), `BR-07` cross-owner access restriction excerpt |
| **3** | Sprint 3 | **F-14** Event attendance summary | Core Sprint 3 domain rule **`BR-18`** (`deriveAttendance`, `"N/A"` denominator-0 rate, cancelled exclusion) + `BR-07` ownership |

All other Sprint 2 features (`F-08`, `F-09`, `F-11`, `F-12`) also follow contract-before-implementation with full unit + API/DB test coverage and `@Decaa0`-reviewed PRs.

---

## 3. Master Issue Sequence (15 Issues on Project #12)

All implementation issues are assigned to **`@JEWKEW`** and reviewed by **`@Decaa0`** (substantive review comment + approval; no self-approval).

| Issue | Milestone | Feature / Scope | Branch | Reserved AC / TEST | Deliverable 2 Target |
|---|---|---|---|---|---|
| `#38` | `Sprint 2` | `[SR-01]` Migration `0002` constraints, `OBS-01` health metadata, seed `E-06..E-09` & test factories | `feature/SR-01-s2-foundation` | Supports all + Lab 6 `OBS-01` | In `v0.2.0` |
| `#39` | `Sprint 2` | `[F-08]` Draft & event lifecycle | `feature/F-08-draft-lifecycle` | `AC-36..43` · `TEST-42..50` | In `v0.2.0` |
| `#40` | `Sprint 2` | `[F-11]` Student self-cancel & re-register | `feature/F-11-cancel-reregister` | `AC-44..49` · `TEST-51..58` | In `v0.2.0` |
| `#41` | `Sprint 2` | `[F-13]` Organizer check-in & undo *(TDD featured)* | `feature/F-13-checkin-undo` | `AC-50..57` · `TEST-59..69` | In `v0.2.0` |
| `#42` | `Sprint 2` | `[F-09]` Edit event & capacity change | `feature/F-09-edit-capacity` | `AC-58..64` · `TEST-70..79` | In `v0.2.0` |
| `#43` | `Sprint 2` | `[F-10]` Cancel event with atomic cascade *(TDD featured)* | `feature/F-10-cancel-event` | `AC-65..70` · `TEST-80..87` | In `v0.2.0` |
| `#44` | `Sprint 2` | `[F-12]` Search & filter events | `feature/F-12-search-filter` | `AC-71..74` · `TEST-88..94` | In `v0.2.0` |
| `#45` | `Sprint 2` | `[F-02]` Sprint 2 authorization matrix & Sprint 1 regression extension | `feature/F-02-s2-authorization` | `AC-75..76` · `TEST-95..97` | In `v0.2.0` |
| `#46` | `Sprint 2` | `[Release v0.2.0]` Sprint 2 integration, E2E journeys & `main` release | `sprint-2` → `main` | Full S1+S2 suite + E2E | Tag `v0.2.0` |
| `#47` | `Sprint 3` | `[Docs]` Sprint 3 engineering contracts (`F-14`–`F-17`) | `sprint-2` / `sprint-3` | `AC-77..95` · `TEST-98..120` | Committed (`d93fdbc`) |
| `#48` | `Sprint 3` | `[F-14]` Event attendance summary & `deriveAttendance` *(TDD featured)* | `feature/F-14-attendance-summary` | `AC-77..82` · `TEST-98..104` | In `v0.3.0-rc.1` |
| `#49` | `Sprint 3` | `[Release v0.3.0-rc.1]` Deliverable 2 integrated candidate, GCP deploy, traceability & PDF | `sprint-3` → `main` | Parts A–E | Due **29 Nov 23:59** |
| `#50` | `Sprint 3` | `[F-15]` Organizer dashboard | `feature/F-15-organizer-dashboard` | `AC-83..86` · `TEST-105..109` | Post-D2 (target 30 Nov / before 13 Dec) |
| `#51` | `Sprint 3` | `[F-16]` Student attendance history | `feature/F-16-student-history` | `AC-87..90` · `TEST-110..114` | Post-D2 (target 12 Dec) |
| `#52` | `Sprint 3` | `[F-17]` Hardening, load test, final regression & `v1.0.0` release | `feature/F-17-hardening` → `main` | `AC-91..95` · `TEST-115..120`, `M-04` | Due **13 Dec** |

---

## 4. Part A Baseline Change & Lab 5–6 Findings Register (Seed)

| ID | Source | Affected Req / Feature | Accepted Decision | Status | Fix / Change Release | Re-test Outcome |
|---|---|---|---|---|---|---|
| `CHG-L5-01` | Lab 5 | `SR-01`, `NFR-04`, `NFR-06` | Enable `trust proxy`, strip Prisma query params for `connect-pg-simple`, add `/api/ready`, Node 22 multi-stage Docker, production-safe idempotent seeding, and Cloud Run WIF deploy pipeline | Resolved | `main @ 5543218` (PR #29–#37) | Verified via `smoke_test.py` + persistence across redeploy/rollback (Lab 5 Ep. 8) |
| `OBS-01` (`F-OUT-0`) | Lab 6 UAT | `SR-01` (`/api/health`) | Partner UAT noted `/api/health` returned hardcoded `0.1.0` / `v0.1.0-dev`. Accepted as non-blocking metadata limitation for Sprint 1; scheduled for fix in Sprint 2 `[SR-01]` by injecting `APP_VERSION` & `GIT_COMMIT` via `deploy.yml` | Planned → Fix in `SR-01` | `v0.2.0` / `v0.3.0-rc.1` | Pending post-deploy verification |
| `COV-01` | Lab 6 UAT | `F-02`, `F-06` | Run 1 lacked seeded IDs `E-05`/`R-01` and `stu2..stu4`; supplied handoff package `PART_A_UAT_HANDOFF.md` for Run 2 | Resolved | `main @ 5543218` (no code change) | Run 2 PASS (`UAT-B20`, `B22`, `B23`; 23/23 PASS, 0 defects) |

---

## 5. Status Vocabulary (Honest Reporting Rule)

Every feature in Deliverable 2 must use one of these exact statuses — never mark an unexecuted test or unmerged feature as `Accepted`:
- **`Planned`** — allocated to sprint; contract not yet committed.
- **`Specified`** — versioned contract, AC, and STS committed before code.
- **`In progress`** — implementation or tests underway on feature branch.
- **`Implemented`** — code merged, verification not yet run on release commit.
- **`Tested`** — automated tests executed and passing on identified commit.
- **`Accepted`** — reviewed, integrated, and verified in a tagged `main` release (`v0.1.0`, `v0.2.0`, `v1.0.0`).
