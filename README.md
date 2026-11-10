# KMUTT Event Registration & Attendance System

Campus Event Registration & Attendance System for KMUTT student activity events (clubs / faculties).  
Baseline engineering platform and Sprint 1 deliverables for CPE 334.

---

## Quickstart Setup Guide (NFR-08)

Follow these steps to run the application locally from a fresh clone in ≤ 15 minutes:

### 1. Prerequisites
- **Node.js**: v20 or v22+
- **npm**: v10+
- **Docker & Docker Compose**: installed and running

### 2. Setup Environment
```bash
cp .env.example .env
```
Ensure `.env` contains valid configurations (defaults in `.env.example` are preconfigured for local Docker PostgreSQL).

### 3. Start Database Containers
Start the local PostgreSQL 16 databases for application and test runs:
```bash
docker-compose up -d db db_test
```
- App Database: `localhost:5432` (`events`)
- Test Database: `localhost:5433` (`events_test`)

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Database Migrations & Deterministic Seed
Apply Prisma migrations and populate initial seeded data (accounts and demo events):
```bash
npm run db:migrate
npm run db:seed
```

### 6. Run the Application
Start the API backend (`:3000`) and the frontend client (`:5173`):
```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.  
Health check endpoint: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## Seeded Demo Accounts (SDS C.2.3)

All seed accounts use the password defined in `SEED_DEMO_PASSWORD` in your `.env` (default: `local-demo-only`).

| Role | Email | Display Name | Student No | Notes |
|---|---|---|---|---|
| `ORGANIZER` | `org1@demo.kmutt.test` | Organizer One | — | Owns demo events E-01 to E-04 |
| `ORGANIZER` | `org2@demo.kmutt.test` | Organizer Two | — | Owns demo event E-05 |
| `STUDENT` | `stu1@demo.kmutt.test` | Student One | `65000001` | Primary student test account |
| `STUDENT` | `stu2@demo.kmutt.test` | Student Two | `65000002` | Pre-registered for E-05 |
| `STUDENT` | `stu3@demo.kmutt.test` | Student Three | `65000003` | Auxiliary student test account |
| `STUDENT` | `stu4@demo.kmutt.test` | Student Four | `65000004` | Auxiliary student test account |

---

## Automated Tests

Run automated test suites against the isolated test database:

```bash
# Run all unit and API integration tests
npm test

# Run unit tests only (e.g. clock abstraction)
npm run test:unit

# Run API & database integration tests
npm run test:api
```

---

## Project Structure

```
├── client/                 # React SPA (Vite, React Router, TanStack Query)
├── server/                 # Express modular monolith API
│   ├── prisma/             # Prisma schema, migrations, seed script
│   ├── src/
│   │   ├── app.ts          # Express app factory & health endpoint
│   │   ├── index.ts        # Server entry point
│   │   ├── lib/            # clock, config, errors, prisma
│   │   └── middleware/     # errorHandler, auth, roles
│   └── test/               # Vitest unit and API test suites
├── docs/                   # Architectural & sprint specifications
└── docker-compose.yml      # Local PostgreSQL services
```
