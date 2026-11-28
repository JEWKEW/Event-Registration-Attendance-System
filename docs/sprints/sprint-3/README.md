# Sprint 3 Engineering Contracts — Index, Progress Plan & Remaining Work

**Sprint goal:** Reporting, analytics, and production hardening — deliver per-event attendance summaries (`F-14`), organizer cross-event dashboard (`F-15`), student attendance history (`F-16`), and full production hardening + load verification (`F-17`).
**Staging branch:** `sprint-3` (branched from tagged `v0.2.0` on `main`).
**Deliverable 2 Candidate (due 29 Nov 2026):** Release **`v0.3.0-rc.1`** on `main`, deployed to Cloud Run, containing all Sprint 3 contracts (`F-14`–`F-17`) and **genuine implemented & tested `F-14`** (`deriveAttendance` + `GET /api/events/:id/summary` + summary UI).
**Final Delivery (due 13 Dec 2026):** Release **`v1.0.0`** on `main` after completing `F-15`, `F-16`, `F-17` around the **1–11 December** exam period.
**Developer:** Yotsapoom Liupolvanish (`@JEWKEW`) · **Reviewer:** Yoswat Amornvitkijvecha (`@Decaa0`).

---

## 1. Contract Index & Status at Deliverable 2 Checkpoint

| Contract | Feature | Requirements | AC | Tests | Target for D2 (`v0.3.0-rc.1`) | Final Target (`v1.0.0`) |
|---|---|---|---|---|---|---|
| [F-14](F-14-event-summary.md) | Event attendance summary *(Featured TDD #3)* | `FR-20`, `BR-07`, `BR-18` | `AC-77`–`AC-82` | `TEST-98`–`TEST-104` | **Implemented & Tested** (API + rule + UI) | Accepted in `v1.0.0` |
| [F-15](F-15-organizer-dashboard.md) | Organizer dashboard | `FR-21`, `BR-07`, `BR-18` | `AC-83`–`AC-86` | `TEST-105`–`TEST-109` | **Specified** (contract committed) | 30 Nov / before 13 Dec |
| [F-16](F-16-student-history.md) | Student attendance history | `FR-22`, `BR-08`, `BR-18` | `AC-87`–`AC-90` | `TEST-110`–`TEST-114` | **Specified** (contract committed) | 12 Dec |
| [F-17](F-17-hardening.md) | Hardening, load test & final verification | `NFR-02`, `NFR-03`, `NFR-07`, `NFR-10`, `NFR-12` | `AC-91`–`AC-95` | `TEST-115`–`TEST-120`, `M-04` | **Specified** (contract committed) | 13 Dec |

---

## 2. Explicit Remaining-Work Plan (Deliverable 2 Part C & Part E, Due 13 Dec)

Planned around the **1–11 December** final examination period: core product workflows (`F-01`–`F-14`) are complete by 29 Nov; remaining bounded reporting and hardening work finishes on 30 Nov and 12–13 Dec.

| Feature / Item | Current Status (at D2) | Remaining Action | Dependencies | Owner & Target Date |
|---|---|---|---|---|
| `F-14` | Implemented & Tested (`v0.3.0-rc.1`) | Final regression & acceptance sign-off in `v1.0.0` | `F-13` (done in `v0.2.0`) | Yotsapoom (`@JEWKEW`), reviewed by `@Decaa0` · 13 Dec 2026 |
| `F-15` | Specified (`AC-83`–`AC-86`) | Implement `GET /api/organizer/dashboard`, `/organizer/dashboard` page, `TEST-105`–`109`, `@Decaa0` review | `F-14` (done in `v0.3.0-rc.1`) | Yotsapoom (`@JEWKEW`), reviewed by `@Decaa0` · 30 Nov 2026 (buffer: 12 Dec) |
| `F-16` | Specified (`AC-87`–`AC-90`) | Implement `GET /api/me/history`, `/me/history` page, `TEST-110`–`114`, `@Decaa0` review | `F-11`, `F-13` (done in `v0.2.0`) | Yotsapoom (`@JEWKEW`), reviewed by `@Decaa0` · 12 Dec 2026 |
| `F-17` | Specified (`AC-91`–`AC-95`) | Implement safe 5xx error test (`NFR-12`), UI 375px + state audit (`NFR-10`), full auth route audit (`NFR-02/03`), `autocannon` load test against Cloud Run (`NFR-07`: 200 events, 5 000 regs, 20 users, p95 < 500 ms), UAT re-tests, `v1.0.0` release & final demo video | `F-14`, `F-15`, `F-16` | Yotsapoom (`@JEWKEW`), reviewed by `@Decaa0` · 13 Dec 2026 |

---

## 3. Sprint 3 Definition of Done

1. All 4 contracts (`F-14`–`F-17`) committed before any Sprint 3 code (`docs:` commit preserved in git history).
2. `F-14` carries formal TDD red→green commit evidence and passes all tests on `v0.3.0-rc.1`.
3. Every new Sprint 3 endpoint (`/api/events/:id/summary`, `/api/organizer/dashboard`, `/api/me/history`) is added to the automated `TEST-10` / `TEST-95` route-audit and RBAC/ownership matrix.
4. No unexecuted test is ever marked "Done" or "Accepted"; `F-15`–`F-17` stay explicitly `Specified` in Deliverable 2 until implemented and verified for `v1.0.0`.
