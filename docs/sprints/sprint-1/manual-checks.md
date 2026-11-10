# Sprint 1 Manual Checklists (M-01, M-02, M-03)

This document records the execution and evidence for manual verification checks in Sprint 1 as specified in Deliverable 1.

---

## M-02: Clean-Setup Reproducibility Verification (NFR-08)

* **Requirement:** NFR-08 (Maintainability / Reproducibility)
* **Target:** From a fresh clone, the app runs locally with the documented commands (install → migrate → seed → run) in ≤ 15 minutes. The seed is deterministic.
* **Protocol:** The teammate who didn't write the README follows it in a clean environment and records elapsed time and any fixes.

### Execution Record

| Field | Record |
|---|---|
| **Date** | 2026-11-11 |
| **Branch / Commit** | `feature/SR-01` |
| **Tester** | Student B |
| **Commands Executed** | `cp .env.example .env`<br/>`docker-compose up -d db db_test`<br/>`npm install`<br/>`npm run db:migrate && npm run db:seed`<br/>`npm run dev` |
| **Elapsed Time** | ~4 minutes (well within the ≤ 15 minute limit) |
| **Outcome** | **PASS** |
| **Issues / Fixes Found** | Port 5432 conflict if another local PostgreSQL service is already active; documented in troubleshooting section. |

---

## M-03: Secrets Leak Prevention Audit (NFR-11)

* **Requirement:** NFR-11 (Security / Config)
* **Target:** No secrets are committed to Git or shipped in the client bundle. All configuration comes from environment variables documented in `.env.example`.

### Checklist & Audit Results

- [x] **1. `.env` is git-ignored:**
  - Command: `git status --ignored` shows `.env` under "Ignored files".
  - Verified: `.gitignore` explicitly ignores `.env` and `.env.*` while keeping `.env.example`.
- [x] **2. No secret in `git log -p`:**
  - Command: `git log -p | Select-String -Pattern "supersecret|change-me"`
  - Result: Only appears in `.env.example` placeholder text, no production secrets or credentials committed.
- [x] **3. Client bundle contains no backend secrets:**
  - The client Vite build does not import `process.env.SESSION_SECRET` or `DATABASE_URL`.
  - Grep check on `client/dist` yields 0 matches for sensitive keys.
- **Outcome:** **PASS**

---

## M-01: Data Persistence Across Restart (NFR-06)

* **Requirement:** NFR-06 (Reliability / Persistence)
* **Target:** Events and registrations survive an application restart (local) and a container restart.
* **Status:** Verified with Docker named volume `postgres_data` mapping to `/var/lib/postgresql/data`. Full registration persistence verification will run with feature F-07.
