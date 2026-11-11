# E.1 Contract F-01 — Authentication & Session

| Field | Value |
|---|---|
| Feature | F-01 Authentication & session |
| Requirements | FR-01, FR-02, FR-03, NFR-01, NFR-04 |
| Depends on | SR-01 (schema, seed, session table) |
| Issue / branch | #2 · `feature/F-01-auth` |
| Contract version | 1.0 |

## 1. Feature-level design

**Behavior / workflow.**
1. User opens `/login` and submits email + password.
2. The server lower-cases the email, finds the user, and runs `bcrypt.compare`. For an unknown email it compares against a dummy hash, so timing is similar.
3. On success: `req.session.regenerate()`, then store `userId` and respond with the public user. Cookie `sid` is HttpOnly, SameSite=Lax, Secure when `NODE_ENV=production`, rolling maxAge 120 min.
4. The UI stores the user in the query cache and redirects by role.
5. `GET /api/auth/me` returns the public user from the session, or 401.
6. Logout: `req.session.destroy()`, clear the cookie, 204. The UI clears the cache and goes to `/login`.

**Validation.** `email`: valid email ≤ 254 chars. `password`: string 1–128. Schema is strict (unknown keys → 400).
**Failure cases.** Wrong password / unknown email → 401 `INVALID_CREDENTIALS` with an identical body. Missing/invalid fields → 400. Expired or destroyed session → 401 `UNAUTHENTICATED`.
**Permissions.** Login is public. `me`/`logout` need a session (logout without a session returns 204 anyway, idempotent).
**Security.** Never return `passwordHash`. Never log the request body for `/auth/login`.

## 2. UI specification

| Element | Behavior |
|---|---|
| `/login` form | Email, Password, "Log in" button (disabled + "Logging in…" while pending) |
| Client validation | Required fields and email format, shown under each field |
| 401 response | Alert "Email or password is incorrect" above the form. Password field is cleared |
| Success | STUDENT → `/events`. ORGANIZER → `/organizer/events` |
| Nav bar | Shows `displayName · Student/Organizer` and a **Logout** button |
| `?expired=1` | Banner "Your session has expired. Please log in again." |

## 3. API specification

**`POST /api/auth/login`**
Request: `{ "email": "stu1@demo.kmutt.test", "password": "••••" }`
`200` → `{ "user": { "id": "uuid", "email": "stu1@demo.kmutt.test", "displayName": "Student One", "role": "STUDENT", "studentNo": "65000001" } }` + `Set-Cookie: sid=…; HttpOnly; SameSite=Lax; Path=/`
`400 VALIDATION_ERROR` · `401 INVALID_CREDENTIALS`

**`POST /api/auth/logout`** → `204` (clears cookie, destroys session row)

**`GET /api/auth/me`** → `200 { "user": {…same shape…} }` · `401 UNAUTHENTICATED`

## 4. Data specification

Uses `users` (id, email UNIQUE lower-case, password_hash, display_name, role, student_no) and `session` (sid, sess, expire) from migration `0001_init`. No new migration. Seed creates 2 organizers and 4 students, with passwords hashed from `SEED_DEMO_PASSWORD`.

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-01 | **Given** seeded student stu1, **when** they POST valid credentials, **then** the response is 200 with `{id, email, displayName, role:"STUDENT"}` and an HttpOnly session cookie, and `GET /api/auth/me` with that cookie returns the same user. Organizer login returns `role:"ORGANIZER"`. |
| AC-02 | **When** the password is wrong **or** the email doesn't exist, **then** the response is 401 `INVALID_CREDENTIALS` with byte-identical bodies, and no authenticated session is created (`/me` with any returned cookie → 401). |
| AC-03 | **When** the body is missing email, has an invalid email, has an empty password or has an unknown key, **then** the response is 400 `VALIDATION_ERROR` with `details[].field`. |
| AC-04 | **Given** no session cookie, **when** calling `GET /api/auth/me`, **then** the response is 401 `UNAUTHENTICATED`. |
| AC-05 | **Given** a logged-in user, **when** they POST `/api/auth/logout`, **then** the response is 204, the session row is deleted, and replaying the **old** cookie on `/me` returns 401. The login cookie has `HttpOnly` and `SameSite=Lax`. |
| AC-06 | **Given** the seeded DB, **then** every `users.password_hash` is a bcrypt hash (`$2a/$2b$`, cost ≥ 10), never equals the plaintext seed password, and no API response contains `passwordHash`. |
| AC-07 | **UI:** a user can log in from `/login`, lands on the role's home page, sees their name in the nav, and after Logout is back on `/login`. A wrong password shows the error message. |

## 6. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01 | AC-01 | API+DB | Seeded stu1 | POST login valid, then GET /me with cookie | 200, role STUDENT, cookie present. /me returns same id |
| TEST-02 | AC-01 | API+DB | Seeded org1 | POST login valid | 200, role ORGANIZER |
| TEST-03 | AC-02 | API+DB | stu1, wrong password | POST login | 401 INVALID_CREDENTIALS. /me → 401 |
| TEST-04 | AC-02 | API+DB | `nobody@demo.kmutt.test` | POST login | 401, body deep-equals TEST-03 body |
| TEST-05 | AC-03 | API | 4 bad bodies (table-driven) | POST login | 400 VALIDATION_ERROR with field |
| TEST-06 | AC-04 | API | No cookie | GET /me | 401 UNAUTHENTICATED |
| TEST-07 | AC-05 | API+DB | Logged-in agent | Check Set-Cookie attributes. POST logout. Replay the old cookie on /me. Query session table | Cookie HttpOnly + SameSite=Lax. 204. 401. Session row count for sid = 0 |
| TEST-08 | AC-06 | DB integration | Seeded DB | Read all password_hash values. bcrypt.getRounds. Compare with seed password. Scan /me + login bodies | Matches `^\$2[ab]\$`, rounds ≥ 10, hash ≠ plaintext, no `passwordHash` key |
| TEST-09 | AC-07 | E2E (Playwright) | Seeded DB, app running | Log in as stu1 → assert `/events` + name. Logout → `/login`. Wrong password → error text | As described |

## 7. Definition of Done (feature)

Product DoD (see `README.md`) plus: TEST-01…09 pass on the release commit. Login body not logged (code review check). Cookie attributes verified.
