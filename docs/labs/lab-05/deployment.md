# Lab 5 Deployment Guide — KMUTT Event Registration & Attendance System

## 1. Architecture & Stack Overview

| Component | Technology | Role in Cloud Deployment |
|---|---|---|
| **Frontend UI** | React 18, TypeScript, Vite, React Router | Built in Stage 1 of the multi-stage `Dockerfile` and served statically by Express in production |
| **Backend API** | Node.js 22, Express 4, TypeScript, Zod | Listens on `0.0.0.0:$PORT`, serves `/api/*` endpoints and static React SPA assets |
| **Database & ORM** | PostgreSQL 16 (Cloud SQL), Prisma 5 | Persistent relational storage outside the container (`users`, `events`, `registrations`, `session`) |
| **Session Store** | `express-session` + `connect-pg-simple` | Stores user sessions in PostgreSQL (`session` table) so sessions survive container restarts and scaling |
| **Containerization** | Multi-stage `Dockerfile` + `docker-compose.yml` | Builds a reproducible image from a clean clone (`node:22-alpine`) |
| **Cloud Hosting** | Google Cloud Run + Artifact Registry + Secret Manager | Serverless HTTPS hosting (`min-instances=0`, `max-instances=3`) with secrets injected from Secret Manager |
| **CI/CD Pipeline** | GitHub Actions (`ci-docker.yml`, `deploy.yml`) + WIF | Automated PR quality gate (`test-and-docker`) and keyless release pipeline to GCP |

### Differences from the TokTickIT Reference App
1. **NPM Workspaces**: Dependencies are managed at the repository root (`package.json` workspaces `server` and `client`).
2. **Cookie-Based Database Sessions**: Authentication uses HTTP-only cookies (`sid`) backed by PostgreSQL (`connect-pg-simple`) rather than Bearer tokens. `app.set('trust proxy', 1)` is enabled for Cloud Run's HTTPS load balancer, and Prisma-specific URL parameters (`schema`, `connection_limit`) are stripped before passing `DATABASE_URL` to `connect-pg-simple`.
3. **Production-Safe Seeding**: `server/prisma/seed.ts` checks `prisma.user.count()` when `NODE_ENV=production` and skips destructive truncation if data already exists.

---

## 2. Environment Variables

All settings are read from environment variables (`server/src/lib/config.ts`) and documented with placeholder values in `.env.example` and `server/.env.example`. **No real secrets are committed to the repository.**

| Variable | Purpose | Secret? | Where Value Comes From (Local vs. Cloud Run) |
|---|---|---|---|
| `NODE_ENV` | Runtime mode (`development`, `production`, `test`) | No | `.env` locally; set to `production` in `Dockerfile` / `app.env` / Cloud Run |
| `PORT` | HTTP port the Express server binds to on `0.0.0.0` | No | `3000` locally; injected automatically by Cloud Run (`3000`) |
| `DATABASE_URL` | PostgreSQL connection URL | **Yes** | `.env` locally; Secret Manager (`sd74cc9ff-database-url:latest`) on Cloud Run |
| `DATABASE_URL_TEST` | Isolated PostgreSQL connection URL for Vitest | No | `.env` locally; GitHub Actions PostgreSQL service container in CI |
| `SESSION_SECRET` | Secret key (32+ chars) used to sign session cookies | **Yes** | `.env` locally; Secret Manager (`sd74cc9ff-app-secret-1:latest`) on Cloud Run |
| `SESSION_IDLE_MINUTES` | Session expiration timeout in minutes (default `120`) | No | `.env` locally; `app.env` / Cloud Run env vars |
| `BCRYPT_ROUNDS` | Bcrypt cost factor for password hashing (default `12`) | No | `.env` locally; `app.env` / Cloud Run env vars |
| `CORS_ORIGIN` | Allowed CORS origin(s), comma-separated | No | `.env` locally; same-origin on Cloud Run |
| `SEED_DEMO_PASSWORD` / `DEMO_USER_PASSWORD` | Initial password for seeded demo accounts | **Yes** | `.env` locally; Secret Manager (`sd74cc9ff-demo-password:latest`) in Cloud Run migration job |
| `APP_TIMEZONE` | Display and domain timezone (`Asia/Bangkok`) | No | `.env` locally; `app.env` / Cloud Run env vars |
| `GIT_COMMIT` | Optional commit SHA returned by `/api/health` | No | Optional runtime env var |

---

## 3. GCP Project, Region & Resource Names

| Resource | Name / Identifier |
|---|---|
| **GCP Project ID** | `cpe-se-course-2026` (or team project `cpe334-yh`) |
| **GCP Region** | `asia-southeast1` |
| **Team Prefix** | `sd74cc9ff` |
| **Cloud Run Service** | `sd74cc9ff` |
| **Cloud Run Migration Job** | `sd74cc9ff-migrate` |
| **Cloud SQL Instance** | `sd74cc9ff-pg` (`cpe-se-course-2026:asia-southeast1:sd74cc9ff-pg`) |
| **Artifact Registry Repository** | `sd74cc9ff` (`asia-southeast1-docker.pkg.dev/cpe-se-course-2026/sd74cc9ff/sd74cc9ff`) |
| **Runtime Service Account** | `sd74cc9ff-runner@cpe-se-course-2026.iam.gserviceaccount.com` |
| **Secret Manager Secrets** | `sd74cc9ff-database-url`, `sd74cc9ff-admin-password`, `sd74cc9ff-demo-password`, `sd74cc9ff-app-secret-1..5` |

---

## 4. Build, Test, Run, Migrate & Seed Commands

### Local Development & Automated Tests
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start PostgreSQL databases (app DB on :5432, test DB on :5433)
docker compose up -d db db_test

# 3. Install workspace dependencies
npm ci

# 4. Generate Prisma client, run migrations, and seed demo data
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Run automated unit and API integration tests
npm test

# 6. Build backend and frontend
npm run build
```

### Local Full-Stack Container Run (Docker Compose)
```bash
# Build and start db, migrate, server (:3000), and client (:5173)
docker compose up --build -d

# Verify health and database readiness
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready
```

---

## 5. Release Procedure & Identifying the Running Commit

### Option A: Automated GitHub Actions Release Pipeline (`deploy.yml`)
1. Create a feature/fix branch from `staging` (e.g., `feature/deploy-proof`).
2. Commit changes, push, and open a Pull Request into `staging`.
3. Verify the required check **`CI & Docker Build / test-and-docker`** passes and a teammate approves the PR, then merge into `staging`.
4. Open a Release Pull Request from `staging` into `main`.
5. Once `test-and-docker` passes and is approved, merge into `main`.
6. Merging to `main` automatically triggers the **`Deploy demo`** workflow (`.github/workflows/deploy.yml`), which:
   - Re-runs the CI test suite (`test-and-docker`).
   - Authenticates to GCP via Workload Identity Federation (keyless).
   - Builds the root `Dockerfile` and pushes it to Artifact Registry tagged with the full 40-character commit SHA (`$GITHUB_SHA`).
   - Resolves the immutable `@sha256` image digest and executes `deploy/release.sh` (updates and runs `sd74cc9ff-migrate`, then updates the Cloud Run service `sd74cc9ff`).
   - Runs `python3 deploy/smoke_test.py "$SERVICE_URL"` against `/api/health`, `/api/ready`, and `/`.

### Option B: Course Portal Project Kit (`./project-kit/kit.sh`)
```bash
# 1. Verify environment and GCP permissions
./project-kit/kit.sh doctor

# 2. Build linux/amd64 image (tagged with git commit SHA) and push to Artifact Registry
./project-kit/kit.sh build

# 3. Run database migration job and deploy to Cloud Run
./project-kit/kit.sh deploy

# 4. Check live service URL, active revision, and running image digest/commit tag
./project-kit/kit.sh status
```

### How to Find Which Commit is Currently Running
1. **Via `kit.sh status`**: Run `./project-kit/kit.sh status` to see the active Cloud Run revision and image tag/digest.
2. **Via GitHub Actions Run Summary**: Open **Actions → Deploy demo → latest run → Summary**, which records the exact 40-character **Commit image tag**, **Digest (`@sha256:...`)**, and **Service URL**.
3. **Via GCP Console / CLI**: Check **Cloud Run → `sd74cc9ff` → Revisions** (or run `gcloud run services describe sd74cc9ff --region asia-southeast1 --format='value(status.latestReadyRevisionName,spec.template.spec.containers[0].image)'`) and match the `@sha256` digest in **Artifact Registry → `sd74cc9ff`** to its commit SHA tag.
4. **Rollback**: To roll back to an earlier release, either run `./project-kit/kit.sh rollback` or trigger **Actions → Deploy demo → Run workflow** with `image_tag` set to the previous 40-character commit SHA.
