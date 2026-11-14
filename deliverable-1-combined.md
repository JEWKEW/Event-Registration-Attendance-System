# CPE 334 Project Deliverable 1: Engineering Baseline + Working Sprint 1

| | |
|---|---|
| **Team** | `<Student A name>` (`<ID>`) · `<Student B name>` (`<ID>`) |
| **Theme / context** | 3. Event Registration and Attendance System: KMUTT student activity events (clubs / faculties) |
| **Product** | `<Product Name>` |
| **Repository** | `<GitHub URL>` |
| **Submitted release** | tag `v0.1.0` · commit `<full sha>` on `main` |

## Navigation

> Fill in page numbers after exporting to PDF.

| Part | Pages | Contents / key IDs |
|---|---|---|
| A. SRS and product scope | `<p–p>` | Actors, scope EX-01–10, FR-01–23, BR-01–18, NFR-01–12, AS-01–06, DEC-01–16 |
| B. Feature inventory and traceability | `<p–p>` | F-01–F-17, SR-01. FR/BR/NFR → feature → sprint → AC/TEST |
| C. System-Level SDS | `<p–p>` | Architecture, ERD, UI/API conventions, role matrix C.5, auth C.6, config C.7, deployment C.8 |
| D. Three-sprint plan | `<p–p>` | Sprint goals, dependencies, Sprint 1 Issue plan |
| E. Sprint 1 engineering contracts | `<p–p>` | F-01–F-07: AC-01–35, TEST-01–41, M-01–03, Product DoD (E.0d) |
| F. Working Sprint 1 and verification | `<p–p>` | Demos D-1–D-6, test results, excerpts TEST-36 / TEST-13, Issues/PRs, contributions |

---

# Part A — Software Requirements Specification (SRS)

**Product:** `<Product Name>`: Campus Event Registration & Attendance System
**Theme:** 3. Event Registration and Attendance System
**Document version:** 1.0 (Deliverable 1 baseline) · **Status:** Baseline for Sprint 1
**Team:** `<Student A — ID>`, `<Student B — ID>` · **Repository:** `<repo URL>`

| Version | Date | Author(s) | Change |
|---|---|---|---|
| 0.1 | `<date>` | A + B | First draft from the stakeholder brief |
| 1.0 | `<date>` | A + B | Baseline: decisions DEC-01…DEC-16 resolved, IDs frozen for Sprint 1 |

---

## A.1 Stakeholder problem and chosen context

KMUTT student clubs and faculty units run many extra-curricular activities: workshops, seminars, camps, volunteer days and sports events. Most of them have a limited number of places. Today registration is usually done with shared Google Forms and spreadsheets. That causes:

- **Over-booking:** forms can't enforce capacity, so more students sign up than there are seats.
- **Duplicate sign-ups:** the same student submits the form several times and the organizer cleans up by hand.
- **No reliable deadline:** forms stay open after the planned cut-off.
- **Attendance on paper:** organizers tick names on a printout, then retype them. Students can't see their own attendance history.
- **Privacy leaks:** shared spreadsheets expose every registrant's details to anyone with the link.

The product gives organizers a controlled way to **publish activities with limited places, manage registrations, check students in and report attendance**. Students get one place to **discover activities, register, cancel and see their own registrations and attendance**.

## A.2 Actors and responsibilities

| Actor | System role | Responsibilities |
|---|---|---|
| **Student** (participant) | `STUDENT` | Logs in, browses and searches published upcoming events, registers, views and cancels **own** registrations, views **own** attendance history. Can't create or manage events. Can't see other students' registrations. |
| **Organizer** (club/faculty staff) | `ORGANIZER` | Logs in, creates draft events, publishes, edits and cancels **own** events, views the roster of **own** events, checks registered students in, views attendance summaries for own events. Can't register for events. Can't access events owned by other organizers. |
| **Anonymous visitor** | — | Can only reach the login page and the health endpoint. Everything else needs authentication. |
| **System clock** | — | Time-based rules: registration deadline, check-in window, derived COMPLETED state, derived ABSENT attendance. |

Each account has exactly **one** role (DEC-02). Accounts are **seeded**. Self-registration, password reset and account administration are out of scope (see A.3).

## A.3 Scope

### In scope (whole product, across Sprints 1–3)

1. Authentication with seeded accounts: login, logout, current user. Role-based and ownership-based authorization enforced on the server.
2. Event management for organizers: create as draft, publish, edit (with locked-field rules), change capacity (with limits), cancel with a reason.
3. Event discovery for students: list upcoming published events, view details, keyword search, filter by category and date range.
4. Registration: register within capacity and deadline, one active registration per student per event, cancel your own registration before the deadline, re-register after cancelling.
5. Attendance: organizer checks students in from the roster within the check-in window, with undo. Absence is derived after the event ends.
6. Reporting: per-event attendance summary, organizer dashboard across own events, student attendance history.

### Explicit exclusions

| ID | Excluded | Reason |
|---|---|---|
| EX-01 | Self-registration, password recovery, email verification, account admin UI | Not required by spec §5.2. Seeded accounts are enough |
| EX-02 | Admin / super-user role | DEC-02: two roles only, owner-only management |
| EX-03 | Waitlist and automatic promotion | DEC-05: a full event rejects new registrations |
| EX-04 | Co-organizers, club-level shared ownership | DEC-02 |
| EX-05 | QR-code or student self check-in | DEC-09: the organizer marks attendance from the roster |
| EX-06 | Email/LINE/push notifications | Spec §5.3: no external messaging service. Status changes show in the UI |
| EX-07 | Payments or paid events | Out of theme scope |
| EX-08 | CSV/Excel export | DEC-12 |
| EX-09 | Recurring events, multi-session events | Keeps the data model to one event = one time slot |
| EX-10 | Integration with the real KMUTT activity-hour system | Synthetic data only (spec §5.3) |

## A.4 Functional Requirements (FR)

Priority: **M** = must, **S** = should. The sprint column is the planned delivery sprint (see Part B).

| ID | Requirement (observable behavior) | Actor | Pri | Sprint |
|---|---|---|---|---|
| FR-01 | A user can log in with email and password. On success the system creates a server-side session and returns the current user's id, display name and role. | All | M | 1 |
| FR-02 | A logged-in user can log out. The session is destroyed on the server and the old session cookie no longer authenticates. | All | M | 1 |
| FR-03 | A client can retrieve the current user's identity from the session. With no valid session it gets an unauthenticated response. | All | M | 1 |
| FR-04 | An organizer can create and publish an event with title, description, category, location, start time, end time, registration deadline and capacity. The event is owned by the creating organizer. | Organizer | M | 1 |
| FR-05 | An organizer can save an event as a **draft** and publish it later. Drafts are visible only to their owner. | Organizer | M | 2 |
| FR-06 | An organizer can edit their own event, within the locked-field rules (BR-12). | Organizer | M | 2 |
| FR-07 | An organizer can change the capacity of their own event, within the capacity-change rule (BR-11). | Organizer | M | 2 |
| FR-08 | An organizer can cancel their own published event with a reason. Students see the event and their registration as cancelled by the organizer. | Organizer | M | 2 |
| FR-09 | An organizer can list their own events with status, capacity, number of active registrations and remaining seats. | Organizer | M | 1 |
| FR-10 | An organizer can view the registration roster of their own event: each active registrant's name, student number and registration time. | Organizer | M | 1 |
| FR-11 | A student can list upcoming published events (not yet ended), sorted by start time, showing remaining seats and whether registration is open. | Student | M | 1 |
| FR-12 | A student can view an event's details, including whether they currently hold an active registration for it. | Student | M | 1 |
| FR-13 | A student can search events by keyword (title/description) and filter by category and date range. | Student | S | 2 |
| FR-14 | A student can register for a published event that is open for registration and has a free seat. | Student | M | 1 |
| FR-15 | A student can view a list of their own registrations and open the details of one of them. | Student | M | 1 |
| FR-16 | A student can cancel their own active registration before the registration deadline. The seat is released. | Student | M | 2 |
| FR-17 | A student who cancelled can register again for the same event while it is still open and has seats. | Student | S | 2 |
| FR-18 | An organizer can check in a student with an active registration for their own event during the check-in window. | Organizer | M | 2 |
| FR-19 | An organizer can undo a check-in during the check-in window. | Organizer | S | 2 |
| FR-20 | An organizer can view a per-event attendance summary: capacity, active registrations, cancellations, checked in, absent, attendance rate. | Organizer | M | 3 |
| FR-21 | An organizer can view a dashboard across all their events: event count by status, total registrations, overall attendance rate. | Organizer | S | 3 |
| FR-22 | A student can view their attendance history: past events with ATTENDED / ABSENT / CANCELLED result. | Student | S | 3 |
| FR-23 | The system shows an event as **COMPLETED** once its end time has passed, and blocks registration, cancellation and editing for it. | System | M | 2 |

## A.5 Business Rules (BR)

All times are stored in UTC and evaluated against the server clock. They are shown in Asia/Bangkok time (NFR-09).

| ID | Rule (testable) | Error on violation | Sprint |
|---|---|---|---|
| BR-01 | Event capacity must be an integer from **1 to 1000** inclusive. | 400 `VALIDATION_ERROR` | 1 |
| BR-02 | Schedule ordering: `registrationDeadline ≤ startAt < endAt`. When an event is created or published, `startAt` must be in the future. | 400 `VALIDATION_ERROR` | 1 |
| BR-03 | A registration is accepted only if the event is **PUBLISHED** (not CANCELLED, not DRAFT, not COMPLETED) and `now ≤ registrationDeadline`. | 409 `EVENT_NOT_OPEN` / 409 `REGISTRATION_CLOSED` | 1 |
| BR-04 | An event's ACTIVE registrations must never exceed its capacity, including under concurrent requests for the last seat. When full, new registrations are rejected. | 409 `EVENT_FULL` | 1 |
| BR-05 | A student may hold **at most one ACTIVE registration** per event. | 409 `ALREADY_REGISTERED` | 1 |
| BR-06 | Only `STUDENT` accounts may register. Only `ORGANIZER` accounts may create or manage events. | 403 `FORBIDDEN` | 1 |
| BR-07 | An organizer may view the roster of, modify, cancel and check in for **only the events they own**. | 403 `NOT_EVENT_OWNER` | 1 (roster), 2 (others) |
| BR-08 | A student may see **only their own** registration records. Event views shown to students include only aggregate counts, never other registrants' personal data. | 404 `NOT_FOUND` | 1 |
| BR-09 | A DRAFT event is visible only to its owner and can't receive registrations. | 404 `NOT_FOUND` for others | 2 |
| BR-10 | Allowed lifecycle transitions: DRAFT → PUBLISHED, PUBLISHED → CANCELLED. A DRAFT may be deleted by its owner. COMPLETED is derived (PUBLISHED and `now > endAt`). No transition leaves CANCELLED or COMPLETED. | 409 `INVALID_TRANSITION` | 2 |
| BR-11 | Capacity may be increased at any time before completion. It may be decreased only if the new value is ≥ the current number of ACTIVE registrations, and BR-01 still holds. | 409 `CAPACITY_BELOW_REGISTERED` | 2 |
| BR-12 | Once an event has ≥ 1 ACTIVE registration, its `startAt` and `endAt` can't be changed. The other fields may be edited subject to BR-01/02/11. CANCELLED and COMPLETED events can't be edited. | 409 `FIELD_LOCKED` / `INVALID_TRANSITION` | 2 |
| BR-13 | Cancelling an event requires a reason (1–500 characters). In the same transaction every ACTIVE registration becomes `CANCELLED_BY_EVENT`. | 400 / 409 | 2 |
| BR-14 | A student may cancel only their **own ACTIVE** registration, only while `now ≤ registrationDeadline`, and only if they are not checked in. The record is kept with status `CANCELLED` and its seat is released. | 409 `CANCELLATION_CLOSED` / `ALREADY_CHECKED_IN` | 2 |
| BR-15 | Re-registering after a self-cancel creates a **new** registration record, subject to BR-03/04/05. The cancelled record stays as history. | as BR-03/04/05 | 2 |
| BR-16 | Check-in is allowed only for an ACTIVE registration of a PUBLISHED event, and only while `startAt − 60 min ≤ now ≤ endAt`. A registration can be checked in once. | 409 `CHECKIN_WINDOW_CLOSED` / `ALREADY_CHECKED_IN` | 2 |
| BR-17 | A check-in may be undone only within the same check-in window. | 409 `CHECKIN_WINDOW_CLOSED` | 2 |
| BR-18 | After `endAt`: an ACTIVE registration with a check-in is **ATTENDED**, one without is **ABSENT**. Attendance rate = ATTENDED ÷ (ATTENDED + ABSENT). It is shown as "N/A" when the denominator is 0. Cancelled registrations are excluded. | — | 3 |

## A.6 Non-Functional Requirements (NFR)

| ID | Category | Requirement and measurable target | Verification method | Sprint |
|---|---|---|---|---|
| NFR-01 | Security | Passwords are stored only as bcrypt hashes (cost ≥ 10). No plaintext password appears in the database, logs or API responses. | DB integration test checks seeded `password_hash` values, plus a response-shape test | 1 |
| NFR-02 | Security | 100 % of protected endpoints reject requests without a valid session with 401, and the body contains no private data. | Parameterised API test over the endpoint list. The list grows each sprint | 1 (extended 2, 3) |
| NFR-03 | Security | Role and ownership permissions are enforced in the backend for every protected operation, matching the role matrix in Part C. Identity comes only from the session: a client-supplied user id or role is rejected. | API tests per matrix row (forbidden role, cross-owner, cross-student, spoofed field) | 1 (extended 2, 3) |
| NFR-04 | Security | Session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production. Idle timeout is 120 min (rolling). After logout, reusing the old cookie gives 401. | API test for logout reuse, plus a cookie attribute assertion | 1 |
| NFR-05 | Integrity | With 1 seat left, 10 concurrent registrations from different students give exactly 1 success and 9 `EVENT_FULL`. 5 concurrent registrations from the same student give exactly 1 ACTIVE record. | Integration test with parallel requests against real PostgreSQL | 1 |
| NFR-06 | Reliability | Events and registrations survive an application restart (local) and a container redeploy (GCP). | Manual restart check M-01 in Sprint 1. Redeploy check in Lab 5 | 1, Lab 5 |
| NFR-07 | Performance | With seed data of 200 events and 5 000 registrations, p95 response time is < 500 ms for `GET /api/events` and `POST /api/events/:id/registrations`, at 20 concurrent users on the deployed instance. | Load script (autocannon) against the deployed release | 3 |
| NFR-08 | Maintainability / reproducibility | From a fresh clone, the app runs locally with the documented commands (install → migrate → seed → run) in ≤ 15 minutes. The seed is deterministic. | Teammate follows the README on a clean machine/container. Recorded in Part F | 1 |
| NFR-09 | Correctness (time) | Timestamps are stored as `timestamptz` (UTC) and shown in Asia/Bangkok. Rule logic takes an injectable clock, so deadline and window boundaries are testable to the second. | Unit tests at deadline boundary ±1 s | 1 |
| NFR-10 | Usability | Every data screen has distinct loading, empty and error states. Server error codes map to readable messages. Layout is usable at a 375 px viewport width. | E2E checks for selected states plus a manual UI checklist | 1 (core), 3 (all) |
| NFR-11 | Security / config | No secrets are committed to Git or shipped in the client bundle. All config comes from environment variables documented in `.env.example`. | Repo review checklist in S1. Secret scan in CI (Lab 5) | 1, Lab 5 |
| NFR-12 | Security | 5xx responses return a generic `INTERNAL_ERROR` body without stack traces, SQL or file paths. | API test with a forced service failure | 3 |

## A.7 Assumptions

| ID | Assumption |
|---|---|
| AS-01 | Users are KMUTT students and staff with university email addresses. Accounts are seeded with synthetic data. |
| AS-02 | One account has exactly one role. A staff member who is also a student would use two accounts (not modelled). |
| AS-03 | Each event is a single continuous time slot in Bangkok time. |
| AS-04 | Organizers have a device at the venue to check students in from the roster. |
| AS-05 | Scale per semester: ≤ 500 events, ≤ 1000 seats per event, ≤ 10 000 registrations. One Cloud Run instance plus one Cloud SQL instance is enough. |
| AS-06 | Notifications are not needed. Students see status changes when they open the app. |

## A.8 Decisions log

| ID | Question raised by the brief | Decision | Rationale |
|---|---|---|---|
| DEC-01 | Which context? | University student activities (KMUTT clubs/faculties) | Familiar domain with clear capacity, deadline and attendance needs |
| DEC-02 | Who manages an event? | Two roles. Each event has exactly one owning organizer. No admin, no co-organizers | Matches the spec default. Ownership is simple to test |
| DEC-03 | Event states? | Stored: DRAFT, PUBLISHED, CANCELLED. COMPLETED is derived from `endAt` | No scheduled job needed to flip state. Fewer chances for inconsistency |
| DEC-04 | Duplicate registration? | One ACTIVE registration per (student, event). Re-registering after a self-cancel inserts a new row. DB partial unique index as a backstop | Keeps cancellation history. The DB guarantees the rule even under races |
| DEC-05 | What happens when an event is full? | Reject with `EVENT_FULL`. No waitlist (EX-03) | Keeps scope feasible in three sprints |
| DEC-06 | How is the last seat protected? | Registration runs in a transaction that locks the event row (`SELECT … FOR UPDATE`), counts ACTIVE registrations, then inserts | Serialises competing requests per event. Straightforward to test |
| DEC-07 | Registration deadline? | Required organizer-set field, ≤ `startAt`. Registration and self-cancel both close at the deadline (inclusive) | Gives organizers a stable roster before the event |
| DEC-08 | Capacity changes? | Increase any time. Decrease not below the ACTIVE count | Never cancels registrations silently |
| DEC-09 | Check-in method? | Organizer marks from the roster, from start −60 min until end. Undo allowed | No camera/QR complexity. Undo fixes mis-clicks |
| DEC-10 | How is attendance finalised? | Derived after `endAt`. No stored ABSENT state | Report stays consistent with check-in data |
| DEC-11 | Effect of event cancellation and editing? | Cancelling needs a reason and cascades `CANCELLED_BY_EVENT`. `startAt`/`endAt` are locked once registrations exist | Students' commitments aren't moved silently |
| DEC-12 | Which reports? | Per-event summary, organizer dashboard, student history. No CSV | Agreed scope |
| DEC-13 | Session or token? | express-session stored in PostgreSQL, httpOnly cookie | Logout is a real server-side revocation |
| DEC-14 | 403 or 404? | 403 when role/ownership forbids an operation on an event (events are not secret). 404 for another student's registration (doesn't reveal it exists) | Least information leakage for private records |
| DEC-15 | Can the client send owner/user ids? | No. Request schemas are strict: unknown keys such as `organizerId`, `studentId` or `role` give 400 | Identity comes only from the session |
| DEC-16 | Can organizers register? | No (BR-06) | Clear role separation, matching the spec |

## A.9 Open questions for instructor/TA

| ID | Question | Current assumption | Status |
|---|---|---|---|
| Q-01 | Is "COMPLETED derived from time" acceptable as the meaning of a lifecycle state transition? | Yes. The real stored transitions are DRAFT→PUBLISHED and PUBLISHED→CANCELLED | Open |
| Q-02 | Is a two-role model without Admin acceptable for the whole product? | Yes, per spec §6 theme 3 | Open |


---

# Part B.1 — Feature Inventory

Version 1.0 · Baseline for Sprint 1 · Feature IDs are stable. Later changes are recorded in B.3 of `traceability.md`.

| ID | Feature / system responsibility | Short description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| F-01 | Authentication & session | Login, logout, current user. bcrypt-verified seeded accounts. Session stored in PostgreSQL behind an httpOnly cookie | FR-01, FR-02, FR-03, NFR-01, NFR-04 | SR-01 | **1** |
| F-02 | Authorization (cross-cutting) | `requireAuth`, `requireRole` middleware, ownership checks in services, strict request schemas. Extended by every later feature | BR-06, BR-07, BR-08, NFR-02, NFR-03 | F-01 | **1** (extended 2, 3) |
| F-03 | Create & publish event | Organizer creates an event that is published on creation, with capacity and schedule validation | FR-04, BR-01, BR-02 | F-01, F-02 | **1** |
| F-04 | Organizer events & roster | "My events" list with counts. Roster of active registrants for an own event | FR-09, FR-10, BR-07 | F-03 | **1** |
| F-05 | Browse & view events | Students list upcoming published events (seats left, open/closed) and view details including their own registration status | FR-11, FR-12, BR-08 | F-03 | **1** |
| F-06 | Register for event | Transactional registration enforcing status, deadline, capacity, one-active-per-student and the last-seat race | FR-14, BR-03, BR-04, BR-05, BR-06, NFR-05, NFR-09 | F-05 | **1** |
| F-07 | My registrations | Student's own registration list and detail. Cross-student access returns 404 | FR-15, BR-08 | F-06 | **1** |
| F-08 | Draft & event lifecycle | Save as DRAFT, publish transition, delete draft, derived COMPLETED, transition guard | FR-05, FR-23, BR-09, BR-10, BR-02 | F-03 | 2 |
| F-09 | Edit event & capacity change | Edit own event. Capacity decrease guard. Locked start/end once registrations exist | FR-06, FR-07, BR-11, BR-12, BR-07 | F-08 | 2 |
| F-10 | Cancel event | Organizer cancels with a reason. Cascades `CANCELLED_BY_EVENT` atomically | FR-08, BR-13, BR-07, BR-10 | F-08 | 2 |
| F-11 | Cancel & re-register | Student self-cancel before the deadline. Re-register as a new record | FR-16, FR-17, BR-14, BR-15 | F-06, F-07 | 2 |
| F-12 | Search & filter | Keyword, category and date-range filters on the event list | FR-13 | F-05 | 2 |
| F-13 | Check-in & undo | Organizer checks in / undoes from the roster within the window | FR-18, FR-19, BR-16, BR-17, BR-07 | F-04, F-06 | 2 |
| F-14 | Event attendance summary | Per-event counts and attendance rate (derived ATTENDED/ABSENT) | FR-20, BR-18, BR-07 | F-13 | 3 |
| F-15 | Organizer dashboard | Aggregates across the organizer's own events | FR-21, BR-07, BR-18 | F-14 | 3 |
| F-16 | Student attendance history | Student's past events with ATTENDED/ABSENT/CANCELLED | FR-22, BR-08, BR-18 | F-13, F-11 | 3 |
| F-17 | Hardening | Safe 5xx handling, full loading/empty/error states, authorization regression suite, performance check | NFR-07, NFR-10, NFR-12, NFR-02, NFR-03 | all | 3 |
| SR-01 | Platform & configuration (system responsibility) | Project skeleton, Prisma migrations, deterministic seed, env config, clock abstraction, README, test DB setup. Docker/CI/GCP added in Lab 5 | NFR-06, NFR-08, NFR-09, NFR-11 | — | **1** (deploy: Lab 5) |


---

# Part B.2 — Requirements → Feature → Sprint Traceability

Version 1.0 · Sprint 1 rows have AC and test IDs (defined in Part E). Sprint 2/3 rows have a feature and sprint allocation. Their AC/tests will be written in the Sprint 2/3 contracts before implementation.

**Status legend:** `Planned` = allocated, contract not written yet · `Specified` = contract with AC/tests recorded · `Implemented` = tests passing on the release commit.

## B.2.1 Functional requirements

| Req | Feature | Sprint | AC | Planned tests | Status |
|---|---|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01, AC-02, AC-03, AC-07 | TEST-01…05, TEST-09 | Specified |
| FR-02 | F-01 | 1 | AC-05, AC-07 | TEST-07, TEST-09 | Specified |
| FR-03 | F-01 | 1 | AC-01, AC-04 | TEST-01, TEST-06 | Specified |
| FR-04 | F-03 | 1 | AC-14…AC-18 | TEST-17…TEST-22, TEST-40 | Specified |
| FR-05 | F-08 | 2 | *(S2 contract)* | — | Planned |
| FR-06 | F-09 | 2 | *(S2 contract)* | — | Planned |
| FR-07 | F-09 | 2 | *(S2 contract)* | — | Planned |
| FR-08 | F-10 | 2 | *(S2 contract)* | — | Planned |
| FR-09 | F-04 | 1 | AC-19, AC-22 | TEST-23, TEST-40 | Specified |
| FR-10 | F-04 | 1 | AC-20, AC-21, AC-22 | TEST-24, TEST-25, TEST-40 | Specified |
| FR-11 | F-05 | 1 | AC-23, AC-25 | TEST-26, TEST-27, TEST-40 | Specified |
| FR-12 | F-05 | 1 | AC-24, AC-25 | TEST-28, TEST-29, TEST-40 | Specified |
| FR-13 | F-12 | 2 | *(S2 contract)* | — | Planned |
| FR-14 | F-06 | 1 | AC-26…AC-32 | TEST-30…TEST-37, TEST-40, TEST-41 | Specified |
| FR-15 | F-07 | 1 | AC-33, AC-34, AC-35 | TEST-38, TEST-39, TEST-40, M-01 | Specified |
| FR-16 | F-11 | 2 | *(S2 contract)* | — | Planned |
| FR-17 | F-11 | 2 | *(S2 contract)* | — | Planned |
| FR-18 | F-13 | 2 | *(S2 contract)* | — | Planned |
| FR-19 | F-13 | 2 | *(S2 contract)* | — | Planned |
| FR-20 | F-14 | 3 | *(S3 contract)* | — | Planned |
| FR-21 | F-15 | 3 | *(S3 contract)* | — | Planned |
| FR-22 | F-16 | 3 | *(S3 contract)* | — | Planned |
| FR-23 | F-08 | 2 | *(S2 contract)* | — | Planned |

## B.2.2 Business rules

| Rule | Feature(s) | Establishing sprint | AC | Planned tests | Status |
|---|---|---|---|---|---|
| BR-01 | F-03 (later F-09) | 1 | AC-15 | TEST-18, TEST-20 | Specified |
| BR-02 | F-03 (later F-08, F-09) | 1 | AC-16 | TEST-17, TEST-21 | Specified |
| BR-03 | F-06 | 1 | AC-29, AC-30 | TEST-30, TEST-34, TEST-35 | Specified |
| BR-04 | F-06 | 1 | AC-26, AC-28, AC-31 | TEST-30, TEST-31, TEST-33, TEST-36 | Specified |
| BR-05 | F-06 | 1 | AC-27, AC-31 | TEST-30, TEST-32, TEST-37 | Specified |
| BR-06 | F-02, F-06 | 1 | AC-09, AC-10 | TEST-11, TEST-12 | Specified |
| BR-07 | F-02, F-04 (S1). F-09, F-10, F-13, F-14, F-15 (S2/S3) | 1 | AC-11 | TEST-13 | Specified (roster). Others Planned |
| BR-08 | F-02, F-05, F-07 | 1 | AC-12, AC-23 | TEST-14, TEST-27 | Specified |
| BR-09 | F-08 | 2 | *(S2)* | — | Planned |
| BR-10 | F-08, F-10 | 2 | *(S2)* | — | Planned |
| BR-11 | F-09 | 2 | *(S2)* | — | Planned |
| BR-12 | F-09 | 2 | *(S2)* | — | Planned |
| BR-13 | F-10 | 2 | *(S2)* | — | Planned |
| BR-14 | F-11 | 2 | *(S2)* | — | Planned |
| BR-15 | F-11 | 2 | *(S2)* | — | Planned |
| BR-16 | F-13 | 2 | *(S2)* | — | Planned |
| BR-17 | F-13 | 2 | *(S2)* | — | Planned |
| BR-18 | F-14, F-15, F-16 | 3 | *(S3)* | — | Planned |

## B.2.3 Non-functional requirements

| NFR | Feature / responsibility | Established | Verified in | AC | Planned verification | Status |
|---|---|---|---|---|---|---|
| NFR-01 | F-01 | S1 | S1 | AC-06 | TEST-08 | Specified |
| NFR-02 | F-02 (+ every feature adds its endpoints) | S1 | S1, re-run S2, S3 | AC-08 | TEST-10 | Specified |
| NFR-03 | F-02 (+ every feature) | S1 | S1, re-run S2, S3 | AC-09…AC-13 | TEST-11…TEST-16 | Specified |
| NFR-04 | F-01 | S1 | S1 | AC-05 | TEST-07 | Specified |
| NFR-05 | F-06 | S1 | S1 | AC-31 | TEST-36, TEST-37 | Specified |
| NFR-06 | SR-01 | S1 | S1 (local restart), Lab 5 (redeploy) | AC-34 | M-01 (manual), Lab 5 check | Specified |
| NFR-07 | F-17 | S3 | S3 | *(S3)* | Load script | Planned |
| NFR-08 | SR-01 | S1 | S1 | — | M-02 clean-setup run (manual, recorded) | Specified |
| NFR-09 | SR-01, F-06 | S1 | S1 | AC-29 | TEST-34 (boundary with fake clock) | Specified |
| NFR-10 | All UI features. F-17 completes | S1 (core screens) | S1 partial, S3 full | AC-07, AC-18, AC-22, AC-25, AC-32, AC-35 | TEST-09, TEST-40, TEST-41, UI checklist | Specified (S1 part) |
| NFR-11 | SR-01 | S1 | S1 review, Lab 5 CI scan | — | M-03 secret checklist | Specified |
| NFR-12 | F-17 | S3 | S3 | *(S3)* | API test with forced error | Planned |

## B.3 Coverage check and approved changes

**Coverage:** FR-01…FR-23, BR-01…BR-18 and NFR-01…NFR-12 each map to at least one feature or system responsibility and one sprint. **No uncovered requirements.**

**Partially covered by design (disclosed):**
- BR-07 ownership is verified in Sprint 1 only for the roster (the only owner-scoped operation in Sprint 1). Each Sprint 2/3 feature that adds an owner-scoped operation must add its cross-owner test (F-09, F-10, F-13, F-14, F-15).
- NFR-10 covers only the Sprint 1 screens in Sprint 1. F-17 completes it.

**Approved changes log**

| Change ID | Date | Change | Reason | Affected IDs | Approved by |
|---|---|---|---|---|---|
| — | — | *(none yet: baseline)* | — | — | — |


---

# Part C — System-Level Software Design Specification (SDS)

Version 1.0 · Baseline for Sprint 1 · Feature contracts (Part E) hold the detailed endpoint specs.

## C.1 Architecture and stack

### C.1.1 Stack choice

| Layer | Technology | Why |
|---|---|---|
| UI | React 18 + TypeScript, Vite, React Router, TanStack Query, Tailwind CSS | Team's main frontend stack. TanStack Query gives consistent loading/error/empty handling |
| API / application | Node.js 20, Express 4, **TypeScript**, Zod, express-session + connect-pg-simple, bcrypt | Express is the team's backend stack. TS + Zod share request/response types with the UI and validate every input |
| Data access | Prisma ORM + Prisma Migrate (plus raw SQL migration steps for partial index and CHECK constraints) | Versioned migrations and a typed client. `$transaction` + `$queryRaw` for row locking |
| Database | PostgreSQL 16 | Row-level locks (`FOR UPDATE`), partial unique indexes, CHECK constraints, `timestamptz` |
| Tests | Vitest (unit + API), Supertest (HTTP), Playwright (E2E), separate PostgreSQL test database | Real DB integration, no mock-only persistence |
| Packaging (Lab 5) | Docker multi-stage image, docker-compose for local Postgres | One container serves the API and the built UI |

**Architecture style:** a **modular monolith**. One Express process serves `/api/*` and, in production, the static React build. That gives one container image, which fits Cloud Run.

### C.1.2 Component diagram

```mermaid
flowchart LR
  subgraph Browser
    UI["React SPA<br/>pages · components · API client"]
  end
  subgraph "Express app (single container)"
    MW["Middleware<br/>session · requireAuth · requireRole · error handler"]
    R["Routes / Controllers<br/>Zod request validation · HTTP mapping"]
    S["Services<br/>business rules · transactions · ownership checks"]
    D["Prisma client<br/>repositories / raw SQL for locks"]
    C["Clock module<br/>now() — injectable in tests"]
  end
  DB[("PostgreSQL<br/>users · events · registrations · session")]
  UI -- "HTTPS JSON + session cookie" --> MW --> R --> S --> D --> DB
  S --> C
  MW -- "session store" --> DB
```

### C.1.3 Responsibilities and where rules are enforced

| Component | Responsibility | Enforces |
|---|---|---|
| React UI | Screens, client-side form hints, showing server errors, role-based navigation | **Nothing authoritative.** Hidden buttons are UX only |
| Middleware | Load session → `req.user`. `requireAuth` (401). `requireRole` (403). Central error handler → safe error shape | NFR-02, BR-06, NFR-12 |
| Controllers | Parse and validate params/body with **strict** Zod schemas (unknown keys → 400). Call service. Map result to HTTP | BR-01, BR-02 (shape/format), DEC-15 |
| Services | All domain rules, ownership checks, transactions, time rules via `clock.now()` | BR-02…BR-18, BR-07, BR-08 |
| Database | Last line of defence: FK, CHECK, partial unique index, NOT NULL | BR-01, BR-02, BR-05 (backstop) |

Example request path: `POST /api/events/:id/registrations` → session → `requireAuth` → `requireRole('STUDENT')` → param validation → `registrationService.register(user.id, eventId)` → transaction: lock event row, check status, deadline and capacity, check for an existing ACTIVE registration, insert → commit → 201.

### C.1.4 Source layout (planned)

```
/client            React app (src/pages, src/components, src/api, src/auth)
/server
  /src/app.ts      express app factory (used by tests and by index.ts)
  /src/modules     auth/, events/, registrations/ (routes, controller, service, schemas)
  /src/middleware  requireAuth.ts, requireRole.ts, errorHandler.ts
  /src/lib         clock.ts, prisma.ts, errors.ts (AppError + codes)
  /prisma          schema.prisma, migrations/, seed.ts
  /test            unit/, api/ (Supertest), helpers (db reset, login helper)
/e2e               Playwright specs
/docs              srs.md, features.md, traceability.md, system-sds.md, sprints/
```

## C.2 Data model

### C.2.1 Entity-relationship diagram

```mermaid
erDiagram
  USER ||--o{ EVENT : "owns (organizer)"
  USER ||--o{ REGISTRATION : "holds (student)"
  EVENT ||--o{ REGISTRATION : "has"
  USER ||--o{ REGISTRATION : "checked in by (organizer, S2)"

  USER {
    uuid id PK
    string email UK "lower-cased"
    string password_hash "bcrypt"
    string display_name
    enum role "STUDENT | ORGANIZER"
    string student_no UK "nullable; students only"
    timestamptz created_at
  }
  EVENT {
    uuid id PK
    uuid organizer_id FK
    string title "3-120"
    text description "0-2000"
    enum category "WORKSHOP|SEMINAR|CAMP|SPORTS|VOLUNTEER|OTHER"
    string location "1-200"
    timestamptz start_at
    timestamptz end_at
    timestamptz registration_deadline
    int capacity "1-1000"
    enum status "DRAFT|PUBLISHED|CANCELLED"
    timestamptz published_at "nullable"
    text cancel_reason "nullable, S2"
    timestamptz cancelled_at "nullable, S2"
    timestamptz created_at
    timestamptz updated_at
  }
  REGISTRATION {
    uuid id PK
    uuid event_id FK
    uuid student_id FK
    enum status "ACTIVE|CANCELLED|CANCELLED_BY_EVENT"
    timestamptz registered_at
    timestamptz cancelled_at "nullable, S2"
    timestamptz checked_in_at "nullable, S2"
    uuid checked_in_by FK "nullable, S2"
  }
```

A `session` table (`sid` PK, `sess` json, `expire` timestamptz) is created for connect-pg-simple. It is infrastructure, not domain data.

### C.2.2 Constraints and ownership links

| Constraint | Where | Rule |
|---|---|---|
| `users.email` UNIQUE, stored lower-case | DB + service | Login lookup |
| `events.organizer_id` FK → users(id), NOT NULL | DB | Ownership link (BR-07). The service also checks role = ORGANIZER |
| `CHECK (capacity BETWEEN 1 AND 1000)` | DB (raw SQL in migration) + Zod | BR-01 |
| `CHECK (registration_deadline <= start_at AND start_at < end_at)` | DB + Zod/service | BR-02 |
| `registrations.event_id` FK → events ON DELETE CASCADE (drafts only, S2) | DB | Drafts have no registrations, so this is effectively unreachable for published events |
| `registrations.student_id` FK → users(id) | DB | Ownership link (BR-08) |
| **Partial unique index** `uq_active_registration ON registrations(event_id, student_id) WHERE status = 'ACTIVE'` | DB (raw SQL) | BR-05 backstop. Unique-violation `P2002` / SQLSTATE 23505 maps to 409 `ALREADY_REGISTERED` |
| Index `registrations(event_id, status)` | DB | Fast active count and roster |
| Index `events(status, start_at)` | DB | Event list |

**Derived values (not stored):** `activeCount` = count of ACTIVE registrations. `remainingSeats = capacity − activeCount`. `effectiveStatus = COMPLETED if status = PUBLISHED and now > end_at, else status`. `registrationOpen = effectiveStatus = PUBLISHED and now ≤ registration_deadline and remainingSeats > 0`.

### C.2.3 Migrations and seed

- Migrations live in `server/prisma/migrations/` and are applied with `npx prisma migrate deploy`. Each sprint adds migrations and never edits applied ones.
  - `0001_init` (S1): users, events, registrations (ACTIVE only used), session table, CHECKs, partial unique index.
  - `0002_*` (S2): `cancel_reason`, `cancelled_at`, `checked_in_at`, `checked_in_by`.
- Seed `server/prisma/seed.ts` is **deterministic** (fixed UUIDs, times relative to a fixed anchor or `now` with fixed offsets). Run with `npm run db:seed`. The password comes from `SEED_DEMO_PASSWORD`, so nothing real is in Git.

| Seed account | Role | Purpose |
|---|---|---|
| `org1@demo.kmutt.test` | ORGANIZER | Owns E-01…E-04 |
| `org2@demo.kmutt.test` | ORGANIZER | Owns E-05 (cross-owner tests) |
| `stu1@…` … `stu4@demo.kmutt.test` | STUDENT | Normal journeys, cross-student tests |

| Seed event | Owner | Set-up | Used for |
|---|---|---|---|
| E-01 "Intro to Git Workshop" | org1 | capacity 30, deadline +7 d | Normal journey |
| E-02 "Robotics Lab Tour" | org1 | capacity 1, 0 registrations | Last seat / full |
| E-03 "Volunteer Day" | org1 | deadline already passed, start +1 d | Registration closed |
| E-04 "Past Seminar" | org1 | ended yesterday | Excluded from upcoming list |
| E-05 "Badminton Night" | org2 | capacity 20, stu2 registered | Cross-owner and cross-student |

Tests use their own fixtures (factory helpers) against `DATABASE_URL_TEST`. The test DB is reset (truncate) before each test file.

## C.3 UI structure and conventions

### C.3.1 Screens and navigation

| Route | Role | Screen | Sprint |
|---|---|---|---|
| `/login` | anonymous | Login form | 1 |
| `/events` | STUDENT | Upcoming events list (seats left, Full/Closed badge). Search/filter in S2 | 1 / 2 |
| `/events/:id` | STUDENT | Event detail + Register button / "You're registered" state. Cancel in S2 | 1 / 2 |
| `/me/registrations` | STUDENT | My registrations list | 1 |
| `/me/registrations/:id` | STUDENT | Registration detail | 1 |
| `/me/history` | STUDENT | Attendance history | 3 |
| `/organizer/events` | ORGANIZER | My events (status, capacity, active, remaining) | 1 |
| `/organizer/events/new` | ORGANIZER | Create event form (S1: publish. S2: Save draft / Publish) | 1 / 2 |
| `/organizer/events/:id` | ORGANIZER | Roster. S2 adds Edit / Cancel / Check-in / Undo | 1 / 2 |
| `/organizer/events/:id/edit` | ORGANIZER | Edit form | 2 |
| `/organizer/events/:id/summary` | ORGANIZER | Attendance summary | 3 |
| `/organizer/dashboard` | ORGANIZER | Dashboard | 3 |

The top nav bar shows the product name, role-appropriate links, the current user's display name and role, and **Logout**. After login: STUDENT goes to `/events`, ORGANIZER goes to `/organizer/events`. A client route guard redirects to `/login` on 401 and shows a "Not allowed" page on 403. This is UX only, not security.

### C.3.2 Shared UI behavior

| State | Convention |
|---|---|
| Loading | Skeleton or spinner in the content area. Submit buttons disabled with "Saving…" while a mutation is pending (prevents double submit) |
| Empty | Explicit message plus next action, e.g. "No upcoming events", "No registrations yet", "You haven't registered for any events" |
| Validation | Client-side Zod (same schema as the server where possible) shows field errors on blur/submit. Server `VALIDATION_ERROR.details[]` is mapped to the same fields |
| Business error (409) | Inline alert with a message from the error-code table, e.g. `EVENT_FULL` → "This event is full." |
| 401 | Clear cached user and redirect to `/login?expired=1` |
| 403 / 404 | "You don't have access to this page" / "Not found" page |
| 5xx / network | Generic "Something went wrong, try again" with a Retry button |
| Time display | All times in Asia/Bangkok, format `DD MMM YYYY, HH:mm` |

## C.4 API approach

- **Style:** JSON REST under `/api`. Resource nouns. camelCase JSON fields. ISO-8601 UTC timestamps (`2026-11-20T02:00:00.000Z`). UUID ids.
- **Auth:** session cookie `sid`. The client sends `credentials: 'include'`. Mutating requests must have `Content-Type: application/json`. Together with `SameSite=Lax` this mitigates CSRF.
- **Validation:** Zod `strict()` schemas on body, params and query. Unknown keys and malformed values give 400.
- **Success:** `200` (read), `201` + created resource (create), `204` (logout / no body).
- **Error body (all errors):**

```json
{ "error": { "code": "EVENT_FULL", "message": "This event is full.", "details": [] } }
```

`details` is used for validation: `[{ "field": "capacity", "issue": "must be between 1 and 1000" }]`.

| HTTP | Code(s) | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Malformed or invalid input, unknown keys |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` | No or expired session. Login failed (same message for unknown email and wrong password) |
| 403 | `FORBIDDEN`, `NOT_EVENT_OWNER` | Wrong role. Not owner of the event |
| 404 | `NOT_FOUND` | Resource doesn't exist **or** is a private record the caller doesn't own (DEC-14) |
| 409 | `EVENT_FULL`, `ALREADY_REGISTERED`, `REGISTRATION_CLOSED`, `EVENT_NOT_OPEN`, `INVALID_TRANSITION`*, `CAPACITY_BELOW_REGISTERED`*, `FIELD_LOCKED`*, `CANCELLATION_CLOSED`*, `ALREADY_CHECKED_IN`*, `CHECKIN_WINDOW_CLOSED`* | Business-rule conflicts (* = from Sprint 2) |
| 500 | `INTERNAL_ERROR` | Unexpected. Logged server-side with a request id. No internals in the body |

**Endpoint overview (whole product).** Details are in the feature contracts.

| Method & path | Role | Feature | Sprint |
|---|---|---|---|
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | any | F-01 | 1 |
| `GET /api/events` · `GET /api/events/:id` | any authenticated | F-05 (+F-12 query params) | 1 (2) |
| `POST /api/events` | ORGANIZER | F-03 (+F-08 `publish:false`) | 1 (2) |
| `GET /api/organizer/events` | ORGANIZER | F-04 | 1 |
| `GET /api/events/:id/registrations` | ORGANIZER (owner) | F-04 | 1 |
| `POST /api/events/:id/registrations` | STUDENT | F-06 | 1 |
| `GET /api/me/registrations` · `GET /api/registrations/:id` | STUDENT (own) | F-07 | 1 |
| `POST /api/events/:id/publish` · `DELETE /api/events/:id` (draft) | ORGANIZER (owner) | F-08 | 2 |
| `PATCH /api/events/:id` | ORGANIZER (owner) | F-09 | 2 |
| `POST /api/events/:id/cancel` | ORGANIZER (owner) | F-10 | 2 |
| `POST /api/registrations/:id/cancel` | STUDENT (own) | F-11 | 2 |
| `POST /api/registrations/:id/check-in` · `DELETE /api/registrations/:id/check-in` | ORGANIZER (event owner) | F-13 | 2 |
| `GET /api/events/:id/summary` | ORGANIZER (owner) | F-14 | 3 |
| `GET /api/organizer/dashboard` | ORGANIZER | F-15 | 3 |
| `GET /api/me/history` | STUDENT | F-16 | 3 |
| `GET /api/health` | anonymous | SR-01 | 1 |

## C.5 Roles, permissions and ownership

✅ = allowed · ❌ = rejected by the backend (code) · "own" = only records the caller owns.

| Operation | Anonymous | STUDENT | ORGANIZER | Record scope / notes | Sprint |
|---|---|---|---|---|---|
| Login | ✅ | ✅ | ✅ | — | 1 |
| Logout, get current user | ❌ 401 | ✅ | ✅ | own session | 1 |
| List upcoming published events | ❌ 401 | ✅ | ✅ | PUBLISHED, not ended. Aggregate counts only | 1 |
| View event detail | ❌ 401 | ✅ | ✅ | Published events. Drafts only to owner (404 to others, S2) | 1 / 2 |
| Create event | ❌ 401 | ❌ 403 | ✅ | `organizer_id` = session user | 1 |
| List "my events" | ❌ 401 | ❌ 403 | ✅ own | | 1 |
| View roster | ❌ 401 | ❌ 403 | ✅ own | Other organizer's event → 403 `NOT_EVENT_OWNER` | 1 |
| Register | ❌ 401 | ✅ self | ❌ 403 | student_id = session user | 1 |
| List / view my registrations | ❌ 401 | ✅ own | ❌ 403 | Another student's registration → 404 | 1 |
| Publish draft, delete draft, edit, cancel event | ❌ 401 | ❌ 403 | ✅ own | non-owner → 403 | 2 |
| Cancel registration | ❌ 401 | ✅ own | ❌ 403 | other's → 404 | 2 |
| Check in / undo | ❌ 401 | ❌ 403 | ✅ own event | registration must belong to the owner's event | 2 |
| Event summary | ❌ 401 | ❌ 403 | ✅ own | | 3 |
| Dashboard | ❌ 401 | ❌ 403 | ✅ own aggregates | | 3 |
| Attendance history | ❌ 401 | ✅ own | ❌ 403 | | 3 |

**Rule:** authorization never relies on a client-sent user id or role. Each matrix row has at least one API test. The S1 rows are in contract F-02.

## C.6 Authentication and session lifecycle

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as Express API
  participant D as PostgreSQL
  B->>A: POST /api/auth/login {email, password}
  A->>D: SELECT user by lower(email)
  A->>A: bcrypt.compare(password, hash)
  alt valid
    A->>A: req.session.regenerate() (prevents fixation)
    A->>D: INSERT session {userId}
    A-->>B: 200 {user} + Set-Cookie sid (HttpOnly, SameSite=Lax, Secure in prod)
  else invalid
    A-->>B: 401 INVALID_CREDENTIALS (no session)
  end
  B->>A: GET /api/auth/me (cookie)
  A->>D: load session → user
  A-->>B: 200 {user}
  B->>A: POST /api/auth/logout (cookie)
  A->>D: DELETE session
  A-->>B: 204 + clear cookie
  B->>A: GET /api/auth/me (old cookie)
  A-->>B: 401 UNAUTHENTICATED
```

- **Credentials:** email + password. Hashed with bcrypt, `BCRYPT_ROUNDS` = 12 (min 10). A dummy hash compare runs for unknown emails so timing is similar.
- **Session creation:** on successful login. Stores only `userId`. Role is reloaded from the DB on each request, so role changes take effect immediately.
- **Expiry:** rolling idle timeout `SESSION_IDLE_MINUTES` = 120. Expired rows are pruned by connect-pg-simple.
- **Current user:** `GET /api/auth/me` → `{ id, email, displayName, role, studentNo }`. Never includes `passwordHash`.
- **Logout:** `req.session.destroy()` deletes the row and clears the cookie. Idempotent 204.

## C.7 Configuration and secrets

| Variable | Example (`.env.example`) | Used for | Secret? |
|---|---|---|---|
| `NODE_ENV` | `development` | Cookie `secure`, logging | no |
| `PORT` | `3000` | HTTP port (Cloud Run injects `PORT`) | no |
| `DATABASE_URL` | `postgresql://app:app@localhost:5432/events` | Prisma + session store | **yes** in prod |
| `DATABASE_URL_TEST` | `postgresql://app:app@localhost:5433/events_test` | Test runs only | no (local) |
| `SESSION_SECRET` | `change-me-32+chars` | Cookie signing | **yes** |
| `SESSION_IDLE_MINUTES` | `120` | Idle timeout | no |
| `BCRYPT_ROUNDS` | `12` | Hash cost | no |
| `CORS_ORIGIN` | `http://localhost:5173` | Dev only (prod is same-origin) | no |
| `SEED_DEMO_PASSWORD` | `local-demo-only` | Seeded account password | yes (local only) |
| `APP_TIMEZONE` | `Asia/Bangkok` | Display formatting | no |

- `.env` is git-ignored. Only `.env.example` is committed. The client bundle gets **no** secrets (only `VITE_API_BASE` if needed).
- The app refuses to start if `SESSION_SECRET` is missing or shorter than 32 characters in production.

## C.8 Planned deployment (designed now, built in Lab 5)

```mermaid
flowchart LR
  Dev[Developer PR] --> GH[GitHub<br/>Issues · PRs · branch protection]
  GH --> CI[GitHub Actions<br/>build · lint · unit+API tests on Postgres service · E2E]
  CI -->|merge to main + manual approval| CD[Build Docker image]
  CD --> AR[Artifact Registry]
  AR --> CR[Cloud Run service<br/>Express API + static UI]
  CR -->|Cloud SQL connector| SQL[(Cloud SQL<br/>PostgreSQL 16)]
  SM[Secret Manager<br/>SESSION_SECRET · DB password] --> CR
  CD --> MJ[Cloud Run job:<br/>prisma migrate deploy]
  MJ --> SQL
```

- **Container:** multi-stage Dockerfile. Stage 1 builds the client and server. Stage 2 runs `node dist/index.js` with `NODE_ENV=production`, serving `client/dist` statically. One image, stateless. Sessions live in Postgres, so instances can restart freely.
- **Persistence:** all state is in Cloud SQL, so data survives redeploys (NFR-06). Locally, docker-compose runs Postgres with a named volume.
- **Migrations:** `prisma migrate deploy` runs as a pre-deploy step / Cloud Run job, not on every instance start.
- **Release identity:** image tag = git tag (e.g. `v0.1.0`) + short SHA. `GET /api/health` returns `{ status, version, commit }`.
- Exact GCP resources follow the Lab 5 instructions. This plan may be adjusted there and the change recorded.

## C.9 Git workflow conventions

| Item | Convention |
|---|---|
| Branches | `main` (released) ← `sprint-1` / `sprint-2` / `sprint-3` (staging) ← `feature/F-06-register-event`, `fix/<issue#>-short-name` |
| Issues | One per bounded change. Title `[F-06] Register for event: API + rules`. Body links FR/BR/AC IDs and the contract file. Labels `feature`, `bug`, `docs`, `test`, `sprint-1` |
| PRs | Feature → sprint staging. Template: linked Issue, AC covered, test command + result, screenshots. Reviewer = teammate. A specific review comment is required. Authors never approve their own PR |
| Release | Reviewed PR `sprint-N → main`. Tag `v0.1.0` (S1), `v0.2.0` (S2), `v1.0.0` (final). Record the tag/commit in the evidence index |
| Contract history | Contract/STS committed in a `docs:` commit **before** the implementation commits. Revisions are new commits with a changelog line in the contract |


---

# Part D — Three-Sprint Plan

Version 1.0 · Baseline. Together the three sprints cover every feature in `features.md` (F-01…F-17, SR-01).

## D.1 Sprint overview

| Sprint | Dates | Goal | Features | Checkpoint / completion outcome |
|---|---|---|---|---|
| **1** | 26 Oct – 8 Nov | **Small working domain slice:** authenticated organizer publishes a capacity-limited event, a student registers and sees it, the organizer sees the roster. Capacity, duplicate, deadline and last-seat rules enforced and tested, with access restrictions | SR-01, F-01, F-02, F-03, F-04, F-05, F-06, F-07 | **Deliverable 1 (8 Nov):** release `v0.1.0` on `main`, local setup, tests passing. Becomes the base for Lab 5 (deploy), Lab 6 (UAT), Lab 7 (change) |
| **2** | 9 – 29 Nov | **Core expansion:** full event lifecycle and the registration/attendance workflow | F-08, F-09, F-10, F-11, F-12, F-13 (+ F-02 extensions) | **Deliverable 2 (29 Nov):** all S2 features complete, release `v0.2.0` deployed through the Lab 5 pipeline. S3 contracts written, S3 progress shown, remaining-work list |
| **3** | 30 Nov – 13 Dec (S3 contracts by 29 Nov) | **Completion and hardening:** reporting plus quality | F-14, F-15, F-16, F-17 | **Final delivery (13 Dec):** `v1.0.0` deployed, full traceability, regression + UAT re-tests, demo video |

## D.2 Dependencies

```mermaid
flowchart LR
  SR01[SR-01 Platform] --> F01[F-01 Auth]
  F01 --> F02[F-02 Authorization]
  F02 --> F03[F-03 Create/Publish]
  F03 --> F04[F-04 Org events & roster]
  F03 --> F05[F-05 Browse/View]
  F05 --> F06[F-06 Register]
  F06 --> F07[F-07 My registrations]
  F03 --> F08[F-08 Draft & lifecycle]
  F08 --> F09[F-09 Edit & capacity]
  F08 --> F10[F-10 Cancel event]
  F06 --> F11[F-11 Cancel & re-register]
  F07 --> F11
  F05 --> F12[F-12 Search & filter]
  F04 --> F13[F-13 Check-in]
  F06 --> F13
  F13 --> F14[F-14 Event summary]
  F14 --> F15[F-15 Dashboard]
  F13 --> F16[F-16 Student history]
  F11 --> F16
  F14 --> F17[F-17 Hardening]
  F15 --> F17
  F16 --> F17
  classDef s1 fill:#dbeafe,stroke:#1d4ed8;
  classDef s2 fill:#dcfce7,stroke:#15803d;
  classDef s3 fill:#fef3c7,stroke:#b45309;
  class SR01,F01,F02,F03,F04,F05,F06,F07 s1;
  class F08,F09,F10,F11,F12,F13 s2;
  class F14,F15,F16,F17 s3;
```

## D.3 Sprint 1 scope and feasibility

**Why this scope:** it matches the theme 3 Sprint 1 example one-for-one (organizer publishes with positive capacity → participant registers and views → organizer views registrations → capacity + one-active-registration + last-place race). It adds only what that example needs: a browse list and a roster.

**Deliberately deferred to Sprint 2** (so Sprint 1 stays small): drafts (events are published on creation in S1), editing, any cancellation, search, check-in. The schema already includes the `status` enum values DRAFT/CANCELLED so S2 doesn't need an enum migration. S1 never writes them, except test fixtures for BR-03.

**Sprint 1 Issue plan** (both students work on spec, tests and code. "Pair" = both named on the Issue/PR):

| Issue | Feature | Work | Lead | Reviewer |
|---|---|---|---|---|
| #1 | SR-01 | Repo skeleton, Prisma schema + `0001_init`, seed, test DB helpers, clock, README | A | B |
| #2 | F-01 | Contract + tests + login/logout/me API | B | A |
| #3 | F-02 | Contract + auth middleware + authorization test matrix | A | B |
| #4 | F-03 | Contract + create event API + form | B | A |
| #5 | F-04 | Contract + organizer events/roster API + pages | A | B |
| #6 | F-05 | Contract + list/detail API + pages | B | A |
| #7 | F-06 | Contract + register transaction + concurrency tests (TDD) | Pair (A+B) | — (each reviews the other's commits. PR reviewed by the one who didn't open it) |
| #8 | F-07 | Contract + my registrations API + pages | A | B |
| #9 | — | E2E journeys TEST-40/41, release PR `sprint-1 → main`, tag `v0.1.0` | B | A |

## D.4 Sprint 2 plan (core expansion)

| Feature | Goal / outcome | Notes |
|---|---|---|
| F-08 | Draft → publish. Delete draft. Derived COMPLETED. Drafts hidden from students | Adds BR-09/10 tests. Updates the F-03 create form |
| F-09 | Edit own event. Capacity rule. Locked start/end | Migration not needed. Cross-owner tests |
| F-10 | Cancel event with reason, cascade | Migration `0002`: `cancel_reason`, `cancelled_at` |
| F-11 | Student self-cancel before deadline. Re-register | Uses the partial unique index from S1 |
| F-12 | Search/filter on the list | Query params `q`, `category`, `from`, `to` |
| F-13 | Check-in / undo from the roster | Migration `0002`: `checked_in_at`, `checked_in_by`. Clock-based window tests |

**Capacity reserved:** about 20 % of Sprint 2 for Lab 5 pipeline work, Lab 6 UAT defect fixes and the Lab 7 change request. Lab work is tracked as separate Issues with a `lab-5/6/7` label so the evidence stays separate (spec §8.3).

## D.5 Sprint 3 plan (completion and hardening)

| Feature | Goal / outcome |
|---|---|
| F-14 | Per-event attendance summary (BR-18) |
| F-15 | Organizer dashboard across own events |
| F-16 | Student attendance history |
| F-17 | Safe 5xx (NFR-12), all UI states (NFR-10), full authorization regression suite (NFR-02/03), load check (NFR-07), defect backlog from UAT |

S3 contracts are written and committed by **29 Nov**. 1–11 Dec is the exam period: plan only light work (fixes, verification) and finish the release, report and video by 13 Dec.

## D.6 Risks

| Risk | Mitigation |
|---|---|
| Concurrency test is flaky | Use a real Postgres, `Promise.all` on N requests, and assert on the DB count rather than timing. Run it 20× before merging |
| Sprint 2 overlaps three labs | Lab Issues planned in the board. S2 scope ordered F-08 → F-11 → F-13 → F-09 → F-10 → F-12, so F-12 can slip into S3 as a recorded change if needed |
| Time-dependent tests | Injectable clock (NFR-09). No `sleep` in tests |
| Exam period in S3 | S3 contracts done before 29 Nov. Reports are read-only queries (low risk) |


---

# Part E — Sprint 1 Engineering Contracts (index, DoD, coverage)

Sprint 1 goal: see `docs/sprints/plan.md` D.1. Staging branch: `sprint-1`. Release: `v0.1.0`.

## E.0 Contract index

| Contract | Feature | Requirements | AC | Tests |
|---|---|---|---|---|
| [SR-01](#e0a-sr-01-platform--configuration-system-responsibility) | Platform & configuration | NFR-06, NFR-08, NFR-09, NFR-11 | — | M-02, M-03 (+ supports all tests) |
| [F-01](#) | Authentication & session | FR-01–03, NFR-01, NFR-04 | AC-01–07 | TEST-01–09 |
| [F-02](#) | Authorization | BR-06–08, NFR-02, NFR-03 | AC-08–13 | TEST-10–16 |
| [F-03](#) | Create & publish event | FR-04, BR-01, BR-02 | AC-14–18 | TEST-17–22, TEST-40 |
| [F-04](#) | Organizer events & roster | FR-09, FR-10, BR-07 | AC-19–22 | TEST-23–25, TEST-40 |
| [F-05](#) | Browse & view events | FR-11, FR-12, BR-08 | AC-23–25 | TEST-26–29, TEST-40, TEST-41 |
| [F-06](#) | Register for event | FR-14, BR-03–06, NFR-05, NFR-09 | AC-26–32 | TEST-30–37, TEST-40, TEST-41 |
| [F-07](#) | My registrations | FR-15, BR-08, NFR-06 | AC-33–35 | TEST-38, TEST-39, TEST-40, M-01 |

## E.0a SR-01 Platform & configuration (system responsibility)

| Item | Specification |
|---|---|
| Behavior | Fresh clone → install → start Postgres (docker-compose) → `prisma migrate deploy` → seed → run API + UI. `GET /api/health` → `200 {status:"ok", version, commit}` |
| Data | Migration `0001_init` (users, events, registrations, session, enums, CHECKs, partial unique index, indexes). Deterministic seed (SDS C.2.3) |
| Config | `.env.example` with every variable in SDS C.7. Server validates env at start-up (Zod) and exits with a clear message if invalid |
| Clock | `server/src/lib/clock.ts` exports `now()`. Tests replace it via `setNow()` / `vi.useFakeTimers` (NFR-09) |
| Test DB | `npm test` uses `DATABASE_URL_TEST`. Global setup runs migrations. Each API test file truncates tables and inserts its own fixtures |
| **M-02** (NFR-08) | Manual: the teammate who didn't write the README follows it in a clean environment and records elapsed time (≤ 15 min) and any fixes |
| **M-03** (NFR-11) | Manual checklist: `.env` git-ignored, no secret in `git log -p`, client build (`dist/`) grep for `SESSION_SECRET`/`DATABASE_URL` finds nothing |

## E.0b Test levels and conventions

| Level | Tool | Location | Naming |
|---|---|---|---|
| Unit | Vitest | `server/test/unit/*.test.ts` | `it('TEST-30 …')` (test ID as prefix, so results map to the STS) |
| API + DB integration | Vitest + Supertest + real PostgreSQL test DB | `server/test/api/*.test.ts` | same |
| E2E | Playwright | `e2e/*.spec.ts` | `test('TEST-40 …')` |
| Manual | checklist | `docs/sprints/sprint-1/manual-checks.md` | M-01…M-03 |

Commands: `npm run test:unit`, `npm run test:api`, `npm run test:e2e`, `npm test` (all). Results are saved with `--reporter=junit` and `--reporter=verbose`, tied to the commit SHA.

## E.0c AC → test coverage map (all Sprint 1 AC)

| AC | Unit | API/DB | E2E | Manual |
|---|---|---|---|---|
| AC-01 | | TEST-01, 02 | | |
| AC-02 | | TEST-03, 04 | | |
| AC-03 | | TEST-05 | | |
| AC-04 | | TEST-06 | | |
| AC-05 | | TEST-07 | | |
| AC-06 | | TEST-08 | | |
| AC-07 | | | TEST-09 | |
| AC-08 | | TEST-10 | | |
| AC-09 | TEST-16 | TEST-11 | | |
| AC-10 | TEST-16 | TEST-12 | | |
| AC-11 | | TEST-13 | | |
| AC-12 | | TEST-14 | | |
| AC-13 | | TEST-15 | | |
| AC-14 | | TEST-19 | | |
| AC-15 | TEST-18 | TEST-20 | | |
| AC-16 | TEST-17 | TEST-21 | | |
| AC-17 | | TEST-22 | | |
| AC-18 | | | TEST-40 | |
| AC-19 | | TEST-23 | | |
| AC-20 | | TEST-24 | | |
| AC-21 | | TEST-25 | | |
| AC-22 | | | TEST-40 | |
| AC-23 | | TEST-26, 27 | | |
| AC-24 | | TEST-28, 29 | | |
| AC-25 | | | TEST-40, 41 | |
| AC-26 | | TEST-31 | | |
| AC-27 | TEST-30 | TEST-32 | | |
| AC-28 | TEST-30 | TEST-33 | | |
| AC-29 | TEST-30 | TEST-34 | | |
| AC-30 | TEST-30 | TEST-35 | | |
| AC-31 | | TEST-36, 37 | | |
| AC-32 | | | TEST-40, 41 | |
| AC-33 | | TEST-38 | | |
| AC-34 | | TEST-39 | | M-01 |
| AC-35 | | | TEST-40 | |

**Every Sprint 1 AC has at least one automated test.** M-01 supplements AC-34 and doesn't replace TEST-39.

## E.0d Product Definition of Done

A Sprint 1 feature (and the Sprint 1 release) is **Done** only when all of the following have evidence:

1. **Contract first:** the feature contract (design, UI/API/data, AC, STS) is committed to `sprint-1` before the implementation commits. Later revisions appear in the contract changelog.
2. **Behavior implemented:** all AC for the feature are satisfied through UI → API → DB, with real backend authorization.
3. **Tests:** every STS test for the feature is implemented with its ID in the test name and **passes** on the release commit. No `skip`/`only`. No assertions weakened. TDD red→green evidence kept for F-06 rules.
4. **Negative and boundary cases** listed in the AC are tested.
5. **Review:** PR into `sprint-1` reviewed by the teammate, with a specific comment (check, question, finding or reason). The author didn't approve their own PR.
6. **Integration:** after merge, the full suite (`npm test`) passes on `sprint-1`, and the E2E journeys TEST-40/41 pass.
7. **Docs current:** README setup, `.env.example`, traceability status and SDS updated if the design changed.
8. **Release:** reviewed PR `sprint-1 → main` merged, tag `v0.1.0` created, test output saved with the tagged SHA.
9. **Disclosure:** any incomplete AC, failed or skipped test, or known limitation is listed in Part F §F.8.
10. **Completion is shown by test output and Git history, not by an AI agent's statement.**

## E.0e Contract / implementation history (fill from `git log`)

| Feature | Contract commit (date) | Failing-test commit (date) | Implementation commit (date) | PR # → `sprint-1` | Reviewer |
|---|---|---|---|---|---|
| SR-01 | `<sha>` (`<date>`) | — | `<sha>` | #`<n>` | `<B>` |
| F-01 | `<sha>` | `<sha>` | `<sha>` | #`<n>` | `<A>` |
| F-02 | `<sha>` | `<sha>` | `<sha>` | #`<n>` | `<B>` |
| F-03 | `<sha>` | `<sha>` | `<sha>` | #`<n>` | `<A>` |
| F-04 | `<sha>` | `<sha>` | `<sha>` | #`<n>` | `<B>` |
| F-05 | `<sha>` | `<sha>` | `<sha>` | #`<n>` | `<A>` |
| F-06 | `<sha>` | `<sha-red>` | `<sha-green>` | #`<n>` | `<A/B>` |
| F-07 | `<sha>` | `<sha>` | `<sha>` | #`<n>` | `<B>` |
| Release | — | — | merge `<sha>` · tag `v0.1.0` | #`<n>` `sprint-1→main` | `<A>` |


---

# E.1 Contract F-01 — Authentication & Session

| Field | Value |
|---|---|
| Feature | F-01 Authentication & session |
| Requirements | FR-01, FR-02, FR-03, NFR-01, NFR-04 |
| Depends on | SR-01 (schema, seed, session table) |
| Issue / branch | #2 · `feature/F-01-auth` |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` (before implementation) |

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
`200` → `{ "user": { "id": "uuid", "email": "stu1@demo.kmutt.test", "displayName": "Student One", "role": "STUDENT", "studentNo": "66070501001" } }` + `Set-Cookie: sid=…; HttpOnly; SameSite=Lax; Path=/`
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

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | `<date>` | Initial contract |


---

# E.2 Contract F-02 — Authorization (cross-cutting)

| Field | Value |
|---|---|
| Feature | F-02 Role- and ownership-based authorization |
| Requirements | BR-06, BR-07, BR-08, NFR-02, NFR-03 |
| Depends on | F-01 |
| Issue / branch | #3 · `feature/F-02-authorization` |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` |

## 1. Feature-level design

| Mechanism | Where | Behavior |
|---|---|---|
| `loadUser` | middleware (all `/api`) | If the session has a `userId`, load the user from the DB and set `req.user`. Role always comes from the DB, never from the client |
| `requireAuth` | route | No `req.user` → 401 `UNAUTHENTICATED` |
| `requireRole(...roles)` | route | `req.user.role` not in roles → 403 `FORBIDDEN` |
| Ownership — events | service | `event.organizerId !== user.id` → 403 `NOT_EVENT_OWNER` |
| Ownership — registrations | service | Query is scoped `WHERE id = :id AND student_id = :userId`. Not found → 404 `NOT_FOUND` (DEC-14) |
| Strict schemas | controller | Unknown body keys (e.g. `organizerId`, `studentId`, `role`) → 400 `VALIDATION_ERROR` (DEC-15) |
| Data minimisation | service DTOs | Student-facing event DTOs contain only aggregate counts. Roster DTO only for the owner |

**Sprint 1 protected endpoint inventory** (input to TEST-10):

| Endpoint | Allowed |
|---|---|
| `GET /api/auth/me`, `GET /api/events`, `GET /api/events/:id` | any authenticated |
| `POST /api/events`, `GET /api/organizer/events`, `GET /api/events/:id/registrations` | ORGANIZER (roster: owner only) |
| `POST /api/events/:id/registrations`, `GET /api/me/registrations`, `GET /api/registrations/:id` | STUDENT (own) |

**UI.** Route guards hide links and redirect (UX only). There is no separate screen beyond the 403/404 pages defined in SDS C.3.2.
**Data.** No change. Uses `events.organizer_id` and `registrations.student_id`.

## 2. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-08 | **Given** no session, **when** any endpoint in the S1 protected inventory is called, **then** the response is 401 `UNAUTHENTICATED` and the body contains only the error object (no event/registration/user fields). |
| AC-09 | **Given** a logged-in STUDENT, **when** they call `POST /api/events`, `GET /api/organizer/events` or `GET /api/events/:id/registrations`, **then** the response is 403 `FORBIDDEN` and no event row is created. |
| AC-10 | **Given** a logged-in ORGANIZER, **when** they call `POST /api/events/:id/registrations` or `GET /api/me/registrations`, **then** the response is 403 `FORBIDDEN` and no registration row is created. |
| AC-11 | **Given** org2 logged in and event E-01 owned by org1, **when** org2 requests `GET /api/events/E-01/registrations`, **then** the response is 403 `NOT_EVENT_OWNER` with no roster data. |
| AC-12 | **Given** stu2 holds registration R on E-05, **when** stu1 requests `GET /api/registrations/R`, **then** the response is 404 `NOT_FOUND`. `GET /api/me/registrations` for stu1 never contains R. |
| AC-13 | **When** a client sends identity fields it must not control (`organizerId` on create event, `studentId` on register, `role` on login), **then** the response is 400 `VALIDATION_ERROR` and no row is created with the spoofed identity. |

## 3. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-10 | AC-08 | API (table-driven) | No cookie. All 9 S1 protected endpoints | Call each | Each 401. `Object.keys(body)` = `["error"]` |
| TEST-11 | AC-09 | API+DB | stu1 session | Call the 3 organizer operations | 403 FORBIDDEN each. Event count unchanged |
| TEST-12 | AC-10 | API+DB | org1 session, E-01 | Call the 2 student operations | 403 each. Registration count unchanged |
| TEST-13 | AC-11 | API+DB | org2 session, E-01 owned by org1 with 1 registration | GET roster | 403 NOT_EVENT_OWNER. Body has no `registrations` |
| TEST-14 | AC-12 | API+DB | stu2 registration R on E-05. stu1 session | GET /registrations/R. GET /me/registrations | 404. List ids don't include R |
| TEST-15 | AC-13 | API+DB | org1 session. stu1 session | POST /events with `organizerId: org2`. POST register with `studentId: stu2` | 400 each. No rows created |
| TEST-16 | AC-09, AC-10 | Unit | Mock req with role STUDENT / ORGANIZER / none | `requireRole('ORGANIZER')` | Calls next() only for ORGANIZER. Passes AppError(403) or (401) otherwise |

## 4. Definition of Done (feature)

Product DoD plus: every S1 row of the SDS role matrix (C.5) is covered by TEST-10…16. Any new protected endpoint in later sprints must be added to the TEST-10 table in the same PR.

## 5. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | `<date>` | Initial contract |


---

# E.3 Contract F-03 — Create & Publish Event

| Field | Value |
|---|---|
| Feature | F-03 Create & publish event |
| Requirements | FR-04, BR-01, BR-02, (BR-06 via F-02) |
| Depends on | F-01, F-02 |
| Issue / branch | #4 · `feature/F-03-create-event` |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` |

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

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | `<date>` | Initial contract |


---

# E.4 Contract F-04 — Organizer Events & Roster

| Field | Value |
|---|---|
| Feature | F-04 Organizer "My events" and registration roster |
| Requirements | FR-09, FR-10, BR-07 |
| Depends on | F-03 (events exist), F-06 (registrations appear in the roster) |
| Issue / branch | #5 · `feature/F-04-organizer-roster` |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` |

## 1. Feature-level design

- **My events:** returns events where `organizer_id = req.user.id`, ordered by `start_at` ascending, each with `activeCount` (count of ACTIVE registrations) and `remainingSeats`. Includes past events (marked `effectiveStatus = COMPLETED`).
- **Roster:** the service loads the event (404 if missing) and checks `event.organizerId === req.user.id` (403 `NOT_EVENT_OWNER` otherwise). It returns ACTIVE registrations joined with the student, ordered by `registered_at` ascending.
- **Permissions:** ORGANIZER only. Roster is owner only. Cross-owner tests are in F-02 (AC-11).
- **Data exposure:** the roster shows student `displayName`, `studentNo`, `email`, `registeredAt`. This is allowed because the organizer must contact and check in registrants. It is never exposed to students.
- **Data:** no schema change. Uses index `registrations(event_id, status)`.

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/organizer/events` | Table: Title · Date/time · Status badge · Capacity · Registered · Seats left · "View". Empty state: "You have no events yet" + **Create event** button. Loading skeleton. Error alert + Retry |
| `/organizer/events/:id` | Event header (title, time, location, capacity, `activeCount/capacity`). Roster table: # · Name · Student no. · Email · Registered at. Empty state "No registrations yet". 403 → "You don't have access to this event" |

## 3. API specification

**`GET /api/organizer/events`** (ORGANIZER) → `200`
```json
{ "events": [ { "id": "uuid", "title": "…", "startAt": "…", "endAt": "…", "status": "PUBLISHED",
  "effectiveStatus": "PUBLISHED", "capacity": 30, "activeCount": 3, "remainingSeats": 27 } ] }
```

**`GET /api/events/:id/registrations`** (ORGANIZER, owner) → `200`
```json
{ "event": { "id": "uuid", "title": "…", "capacity": 30, "activeCount": 1 },
  "registrations": [ { "id": "uuid", "status": "ACTIVE", "registeredAt": "…",
    "student": { "id": "uuid", "displayName": "Student One", "studentNo": "66070501001", "email": "stu1@demo.kmutt.test" } } ] }
```
Errors: `401` · `403 FORBIDDEN` (student) · `403 NOT_EVENT_OWNER` · `404 NOT_FOUND` (unknown or malformed id).

## 4. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-19 | **Given** org1 owns E-01…E-04 and org2 owns E-05, **when** org1 calls `GET /api/organizer/events`, **then** exactly E-01…E-04 are returned, each with correct `activeCount` and `remainingSeats`. |
| AC-20 | **Given** E-01 has ACTIVE registrations from stu1 then stu3, **when** org1 requests the roster, **then** both appear in registration order with name, student no., email and registeredAt, and `event.activeCount = 2`. |
| AC-21 | **When** org1 requests the roster of a non-existent UUID or a malformed id, **then** the response is 404 `NOT_FOUND`. |
| AC-22 | **UI:** My Events and the roster page show the data above, with the empty states "You have no events yet" / "No registrations yet". |

## 5. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-23 | AC-19 | API+DB | Fixtures: org1 has 2 events (one with 1 registration), org2 has 1 | org1 GET /organizer/events | Only org1's 2 ids. Counts 1/0 and remaining seats correct |
| TEST-24 | AC-20 | API+DB | Event with stu1 at t1, stu3 at t2 | org1 GET roster | Order [stu1, stu3]. Fields present. activeCount 2 |
| TEST-25 | AC-21 | API | org1 session | GET roster for random UUID and for `abc` | 404 both |
| TEST-40 | AC-22 | E2E | — | Main journey (roster shows the registered student) | — |

## 6. Definition of Done (feature)

Product DoD plus: roster query scoped by owner check (code review item). Cross-owner TEST-13 (F-02) passes.

## 7. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | `<date>` | Initial contract |


---

# E.5 Contract F-05 — Browse & View Events

| Field | Value |
|---|---|
| Feature | F-05 Browse upcoming events and view details |
| Requirements | FR-11, FR-12, BR-08 |
| Depends on | F-03 |
| Issue / branch | #6 · `feature/F-05-browse-events` |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` |

## 1. Feature-level design

- **List:** `status = PUBLISHED AND end_at > now`, ordered by `start_at` ascending. Each item has `activeCount`, `remainingSeats`, `registrationOpen` (PUBLISHED and `now ≤ registrationDeadline` and `remainingSeats > 0`) and `organizerName`. No pagination in S1 (≤ 100 events expected. Pagination is part of the S2 search work if needed).
- **Detail:** any event by id that is PUBLISHED (S1 has no drafts). Unknown id → 404. For a STUDENT caller, `myRegistration` = their ACTIVE registration `{id, status, registeredAt}` or `null`. For an ORGANIZER caller it is always `null`.
- **Privacy (BR-08):** list and detail responses contain **no** registrant identities, only counts.
- **Permissions:** any authenticated user. Organizers may browse too.
- **Data:** no schema change.

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/events` | Card list: title, category chip, date/time (Bangkok), location, "X seats left". Badge **Full** if remainingSeats = 0. **Closed** if the deadline has passed. **Registered** if the student holds a registration (fetched via `/me/registrations`). Empty: "No upcoming events". Loading skeleton cards. Error + Retry |
| `/events/:id` | Full details, organizer name, deadline, seats left. Action area: **Register** (F-06), or "You're registered ✓" + link to the registration, or a disabled button with reason "Full" / "Registration closed". 404 page for unknown id |

## 3. API specification

**`GET /api/events`** → `200`
```json
{ "events": [ { "id": "uuid", "title": "…", "category": "WORKSHOP", "location": "…", "startAt": "…", "endAt": "…",
  "registrationDeadline": "…", "capacity": 30, "activeCount": 3, "remainingSeats": 27,
  "registrationOpen": true, "organizerName": "Computer Club" } ] }
```
**`GET /api/events/:id`** → `200 { "event": { …list fields…, "description": "…", "effectiveStatus": "PUBLISHED" }, "myRegistration": null | { "id", "status", "registeredAt" } }` · `404 NOT_FOUND`.

## 4. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-23 | **Given** published future events, one ended event and one CANCELLED event (fixture), **when** a student calls `GET /api/events`, **then** only the published, not-ended events are returned, sorted by `startAt`, with correct `remainingSeats`/`registrationOpen`, and no item contains registrant ids, names or emails. |
| AC-24 | **Given** stu1 is registered for E-01, **when** stu1 GETs `/api/events/E-01`, **then** `myRegistration` holds that registration. For stu3 it is `null`. Unknown/malformed id → 404. |
| AC-25 | **UI:** the list shows seats left and Full/Closed badges plus an empty state. The detail page shows the correct action state (Register / Registered / Full / Closed). |

## 5. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-26 | AC-23 | API+DB | Fixtures: 2 future (start +2 d, +1 d), 1 ended, 1 CANCELLED. Fake clock | stu1 GET /events | Exactly the 2 future events, order [+1 d, +2 d]. Counts correct. Full event has `registrationOpen=false` |
| TEST-27 | AC-23 | API | Event with 1 registration by stu2 | stu1 GET /events and /events/:id | Serialized JSON contains no stu2 id/email/name |
| TEST-28 | AC-24 | API+DB | stu1 registered on E | stu1 and stu3 GET /events/E | stu1: `myRegistration.id` matches. stu3: null |
| TEST-29 | AC-24 | API | — | GET /events/{random uuid}, /events/abc | 404 both |
| TEST-40 | AC-25 | E2E | — | Main journey | — |
| TEST-41 | AC-25 | E2E | — | Full-event journey (shows Full badge / disabled button) | — |

## 6. Definition of Done (feature)

Product DoD plus: DTO for student-facing events reviewed for privacy (no nested registrations).

## 7. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | `<date>` | Initial contract |


---

# E.6 Contract F-06 — Register for Event

| Field | Value |
|---|---|
| Feature | F-06 Register for event (core domain transaction) |
| Requirements | FR-14, BR-03, BR-04, BR-05, BR-06, NFR-05, NFR-09 |
| Depends on | F-05, SR-01 (partial unique index, clock) |
| Issue / branch | #7 · `feature/F-06-register-event` (pair work A+B) |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` |
| TDD | Required. Commit the failing tests TEST-30, 32, 33, 34, 36 before the implementation commit and keep the red run output |

## 1. Feature-level design

**Workflow.** A student on `/events/:id` clicks **Register** and gets `POST /api/events/:id/registrations` with an empty body `{}`. On 201 the UI shows "You're registered ✓". On 409 it shows the mapped message.

**Algorithm (service, single transaction)**
```
BEGIN
  SELECT * FROM events WHERE id = :eventId FOR UPDATE      -- serialises competitors (DEC-06)
  if not found                       -> 404 NOT_FOUND
  SELECT count(*) AS active FROM registrations WHERE event_id = :eventId AND status='ACTIVE'
  SELECT 1 FROM registrations WHERE event_id=:eventId AND student_id=:userId AND status='ACTIVE'
  decision = checkRegistrationEligibility(event, activeCount, alreadyRegistered, clock.now())
  if decision is error               -> ROLLBACK, return mapped 409
  INSERT INTO registrations(event_id, student_id, status, registered_at) VALUES (…,'ACTIVE', now)
COMMIT
-- a unique violation on uq_active_registration (race on the same student) -> 409 ALREADY_REGISTERED
```

**Pure rule function** `checkRegistrationEligibility(event, activeCount, alreadyRegistered, now)`. It checks in this order (the first failure wins, so error codes are deterministic):

| # | Condition | Result |
|---|---|---|
| 1 | `event.status ≠ PUBLISHED` or `now > endAt` | `EVENT_NOT_OPEN` (BR-03) |
| 2 | `now > registrationDeadline` | `REGISTRATION_CLOSED` (BR-03, inclusive deadline) |
| 3 | `alreadyRegistered` | `ALREADY_REGISTERED` (BR-05) |
| 4 | `activeCount ≥ capacity` | `EVENT_FULL` (BR-04) |
| — | otherwise | `OK` |

Duplicate is checked before full, so a registered student retrying on a now-full event gets the more useful message.

**Permissions.** STUDENT only (403 for ORGANIZER, AC-10). `student_id` always = session user (AC-13).

## 2. UI specification

| State | UI |
|---|---|
| Can register | Primary **Register** button. While pending it is disabled with "Registering…" (no double submit) |
| 201 | Button replaced by "You're registered ✓ · View registration". Seats-left count refreshes |
| 409 EVENT_FULL | Alert "Sorry, this event just filled up." Button disabled "Full" |
| 409 ALREADY_REGISTERED | Alert "You're already registered for this event." Shows registered state |
| 409 REGISTRATION_CLOSED / EVENT_NOT_OPEN | Alert "Registration is closed for this event." |

## 3. API specification

**`POST /api/events/:id/registrations`** (STUDENT). Body `{}` (strict).
`201` →
```json
{ "registration": { "id": "uuid", "eventId": "uuid", "status": "ACTIVE", "registeredAt": "2026-11-10T03:15:00.000Z" },
  "event": { "id": "uuid", "capacity": 30, "activeCount": 4, "remainingSeats": 26 } }
```
Errors: `400 VALIDATION_ERROR` (unknown keys) · `401` · `403 FORBIDDEN` · `404 NOT_FOUND` · `409 EVENT_NOT_OPEN | REGISTRATION_CLOSED | ALREADY_REGISTERED | EVENT_FULL`.

## 4. Data specification

Table `registrations` (`0001_init`): `id uuid PK`, `event_id uuid NOT NULL FK events`, `student_id uuid NOT NULL FK users`, `status registration_status NOT NULL DEFAULT 'ACTIVE'` (enum ACTIVE, CANCELLED, CANCELLED_BY_EVENT), `registered_at timestamptz NOT NULL DEFAULT now()`.
Raw SQL:
```sql
CREATE UNIQUE INDEX uq_active_registration ON registrations(event_id, student_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_reg_event_status ON registrations(event_id, status);
```

## 5. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-26 | **Given** E-01 is PUBLISHED, before its deadline, with free seats, **when** stu1 registers, **then** the response is 201, an ACTIVE row exists for (E-01, stu1), and `remainingSeats` decreases by exactly 1. |
| AC-27 | **Given** stu1 already has an ACTIVE registration on E-01, **when** stu1 registers again, **then** the response is 409 `ALREADY_REGISTERED` and there is still exactly one ACTIVE row for (E-01, stu1). |
| AC-28 | **Given** E-02 has capacity 1 and 1 ACTIVE registration, **when** another student registers, **then** the response is 409 `EVENT_FULL` and no row is added. |
| AC-29 | **Given** the deadline D, **when** a student registers at `now = D`, **then** it succeeds. At `now = D + 1 s` the response is 409 `REGISTRATION_CLOSED` and no row is added. |
| AC-30 | **Given** an event with status CANCELLED, or one whose `endAt` has passed, **when** a student registers, **then** the response is 409 `EVENT_NOT_OPEN`. |
| AC-31 | **Concurrency:** **given** an event with exactly 1 seat left, **when** 10 different students register concurrently, **then** exactly one gets 201, nine get 409 `EVENT_FULL`, and the ACTIVE count equals capacity. **When** one student sends 5 concurrent requests to an event with seats, **then** exactly one ACTIVE row exists and the others get 409 `ALREADY_REGISTERED`. |
| AC-32 | **UI:** Register shows the registered state on success. On a full event the button is disabled ("Full") and a race-lost 409 shows "Sorry, this event just filled up." |

## 6. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-30 | AC-27, AC-28, AC-29, AC-30 | Unit | Table of (status, now vs deadline/end, alreadyRegistered, activeCount/capacity) incl. boundary `now = deadline`, `activeCount = capacity − 1`, `= capacity` | `checkRegistrationEligibility` | Expected code per row, with precedence as in §1 |
| TEST-31 | AC-26 | API+DB | E capacity 30, 3 active. stu1 session | POST register. Query DB | 201. Row ACTIVE (E, stu1). `remainingSeats` 26 |
| TEST-32 | AC-27 | API+DB | stu1 already ACTIVE on E | POST register | 409 ALREADY_REGISTERED. Active rows for (E, stu1) = 1 |
| TEST-33 | AC-28 | API+DB | E capacity 1 with stu2 ACTIVE | stu1 POST register | 409 EVENT_FULL. Active count = 1 |
| TEST-34 | AC-29 | API+DB | Fake clock. Deadline D | Set now = D → register stu1 (expect 201). Set now = D + 1 s → register stu3 | 201 then 409 REGISTRATION_CLOSED |
| TEST-35 | AC-30 | API+DB | Fixture CANCELLED event. Fixture ended event | Register | 409 EVENT_NOT_OPEN both. No rows |
| TEST-36 | AC-31 | API+DB concurrency | E capacity 5 with 4 active. 10 student sessions logged in first | `Promise.all` 10 POSTs | Exactly one 201, nine 409 EVENT_FULL. DB active count = 5. Repeated 20× in CI-local loop without failure before merge |
| TEST-37 | AC-31 | API+DB concurrency | E capacity 30, stu1 session | `Promise.all` 5 POSTs by stu1 | Exactly one 201, four 409 ALREADY_REGISTERED. Active rows (E, stu1) = 1 |
| TEST-40 | AC-32 | E2E | — | Main journey (register success) | — |
| TEST-41 | AC-32 | E2E | E-02 full (capacity 1, filled in setup) | stu3 opens E-02 | Full badge, disabled button. Forced POST through the UI path shows the full message |

## 7. Definition of Done (feature)

Product DoD plus: TDD evidence (red run of TEST-30/32/33/34/36 at commit `<sha-red>`, green at `<sha-green>`). TEST-36 stable over 20 consecutive runs. Partial unique index present in the migration.

## 8. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | `<date>` | Initial contract |


---

# E.7 Contract F-07 — My Registrations

| Field | Value |
|---|---|
| Feature | F-07 Student's own registrations (list + detail) |
| Requirements | FR-15, BR-08, NFR-06 |
| Depends on | F-06 |
| Issue / branch | #8 · `feature/F-07-my-registrations` |
| Contract version | 1.0 · recorded in commit `<sha>` on `<date>` |

## 1. Feature-level design

- **List:** `WHERE student_id = req.user.id`, all statuses (S1 only produces ACTIVE), joined with event summary fields, ordered by event `start_at` ascending.
- **Detail:** `WHERE id = :id AND student_id = req.user.id`. Not found (or not owned) → 404 (DEC-14, AC-12).
- **Persistence:** read straight from PostgreSQL, no in-memory cache, so results survive an app restart (NFR-06).
- **Permissions:** STUDENT only (AC-10).
- **Data:** no schema change.

## 2. UI specification

| Screen | Behavior |
|---|---|
| `/me/registrations` | List: event title (link) · date/time · location · status badge (Active) · registered at. Empty: "You haven't registered for any events yet" + link to `/events` |
| `/me/registrations/:id` | Registration id (short), status, registered at, event details. 404 page if not found |

## 3. API specification

**`GET /api/me/registrations`** (STUDENT) → `200`
```json
{ "registrations": [ { "id": "uuid", "status": "ACTIVE", "registeredAt": "…",
  "event": { "id": "uuid", "title": "…", "startAt": "…", "endAt": "…", "location": "…", "effectiveStatus": "PUBLISHED" } } ] }
```
**`GET /api/registrations/:id`** (STUDENT, own) → `200 { "registration": { …same item shape… } }` · `404 NOT_FOUND`.

## 4. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| AC-33 | **Given** stu1 has registrations on E-01 and E-02 and stu2 has one on E-05, **when** stu1 calls `GET /api/me/registrations`, **then** exactly stu1's two registrations are returned with event title/time/location, ordered by event start. |
| AC-34 | **Given** stu1's registration R, **when** stu1 calls `GET /api/registrations/R`, **then** 200 with the details. The same request still returns R after the API process restarts (new app instance on the same DB). |
| AC-35 | **UI:** My Registrations shows the student's registrations, or the empty state, and each item links to its detail. |

## 5. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-38 | AC-33 | API+DB | Fixtures as in AC-33 | stu1 GET /me/registrations | 2 items, both student_id stu1, order by start |
| TEST-39 | AC-34 | API+DB | stu1 registers via app instance #1 | Build a **new** `createApp()` instance (fresh Prisma client). GET /registrations/R with a new login | 200, same id and registeredAt |
| M-01 | AC-34 | Manual | Local app running, stu1 registered on E-01 | Stop the server and the Postgres container, start both again, log in, open My Registrations | Registration still listed. Screenshot in Part F |
| TEST-40 | AC-35 | E2E | Seeded DB | **Main journey:** org1 logs in → creates and publishes event X (cap 2) → logs out → stu1 logs in → finds X in `/events` → opens it → Register → "You're registered" → My Registrations lists X → logs out → org1 logs in → roster of X shows Student One | Every step visible as described |

## 6. Definition of Done (feature)

Product DoD plus: M-01 executed and screenshot captured for Part F.

## 7. Contract changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | `<date>` | Initial contract |


---

# Part F — Working Sprint 1 and Verification (TEMPLATE — fill with real evidence)

> Everything in `<…>` must be replaced with **real** output from your release commit. Don't submit placeholders. Remove this note before export.

**Release:** tag `v0.1.0` · commit `<full sha>` · branch `main` · date `<date>`
All screenshots and test runs below are from this commit unless stated.

## F.1 Setup summary (from README)

```bash
git clone <repo URL> && cd <repo>
cp .env.example .env                       # set SESSION_SECRET, SEED_DEMO_PASSWORD
docker compose up -d db db_test            # PostgreSQL 16 on 5432 (app) and 5433 (tests)
npm ci
npm run db:migrate && npm run db:seed      # prisma migrate deploy + deterministic seed
npm run dev                                # API :3000, UI :5173
npm test                                   # unit + API/DB integration
npm run test:e2e                           # Playwright (starts app automatically)
```
Demo accounts: `org1@demo.kmutt.test`, `org2@…`, `stu1@…`–`stu4@…`. The password is the local `SEED_DEMO_PASSWORD` (not in Git/PDF).
M-02 clean-setup result: `<tester B>`, `<date>`, `<n> min`, issues: `<none / list>`.

## F.2 Program demonstrations

| # | Scenario | Feature / AC | Role | Start condition | Steps | Expected | Actual | Screenshot |
|---|---|---|---|---|---|---|---|---|
| D-1 | Normal journey + persisted retrieval | F-03, F-05, F-06, F-07, F-04 · AC-14, 26, 33, 20 | Organizer → Student → Organizer | Fresh seed | org1 creates "Demo Event" cap 2 → stu1 registers → My Registrations → org1 roster | Registration listed for stu1 and in the roster | `<PASS/notes>` | `<fig D-1a…d>` |
| D-2 | Persistence after restart | AC-34 · M-01 | Student | D-1 done | Restart server + DB, log in, open My Registrations | Still listed | `<…>` | `<fig>` |
| D-3 | Business-rule rejection: full event | AC-28, AC-32 | Student | E-02 cap 1 already filled | stu3 opens E-02 | "Full", disabled. API 409 EVENT_FULL | `<…>` | `<fig>` |
| D-4 | Duplicate registration | AC-27 | Student | stu1 registered on E-01 | Attempt again (API call shown) | 409 ALREADY_REGISTERED | `<…>` | `<fig>` |
| D-5 | Login / logout | AC-01, 05, 07 | Student | — | Log in, show nav name, log out, replay /me | 401 after logout | `<…>` | `<fig>` |
| D-6 | Forbidden role / ownership | AC-09, AC-11 | Student, Organizer 2 | — | stu1 POST /api/events. org2 GET roster of E-01 | 403 FORBIDDEN / 403 NOT_EVENT_OWNER (API evidence, not just a hidden button) | `<…>` | `<fig>` |

## F.3 Build and automated test results

| Command | Commit | Passed | Failed | Skipped | Duration |
|---|---|---|---|---|---|
| `npm run build` | `<sha>` | ✓ | — | — | `<s>` |
| `npm run test:unit` | `<sha>` | `<n>` | `<n>` | `<n>` | `<s>` |
| `npm run test:api` | `<sha>` | `<n>` | `<n>` | `<n>` | `<s>` |
| `npm run test:e2e` | `<sha>` | `<n>` | `<n>` | `<n>` | `<s>` |

```
<paste readable test runner output here — summary lines with counts>
```

## F.4 AC → test results table

| AC | Planned test | Actual file › test name | Type | Result |
|---|---|---|---|---|
| AC-01 | TEST-01, 02 | `server/test/api/auth.test.ts › TEST-01 …` | Auto | `<PASS>` |
| … | … | … | … | … |
| AC-34 | TEST-39, M-01 | `…` / manual | Auto + Manual | `<…>` |
*(one row per AC-01…AC-35, copied from E.0c)*

## F.5 Test excerpts

**Domain rule: last-seat concurrency (TEST-36)**
```ts
<paste setup + Promise.all + assertions, not the whole file>
```
Result: `<✓ TEST-36 … (n ms)>`

**Role / ownership: cross-organizer roster (TEST-13)**
```ts
<paste>
```
Result: `<✓ …>`

**TDD evidence (F-06):** red run at `<sha-red>` (`<date>`): `<n failed: TEST-30, 32, 33, 34, 36>`. Green run at `<sha-green>`: `<all pass>`.

## F.6 Engineering workflow and history

| Issue | Feature / contract | Branch | PR | Author | Reviewer | Review comment (excerpt) | Merged into |
|---|---|---|---|---|---|---|---|
| #`<n>` | F-06 / AC-26–32 | `feature/F-06-register-event` | #`<n>` | `<A>` | `<B>` | "`<e.g. TEST-36 asserts the DB count, not only status codes. Ran it 20× locally ✓>`" | `sprint-1` (`<sha>`) |
| #`<n>` | F-02 / AC-08–13 | `feature/F-02-authorization` | #`<n>` | `<B>` | `<A>` | "`<…>`" | `sprint-1` (`<sha>`) |
| Release | — | `sprint-1` | #`<n>` | `<…>` | `<…>` | "`<…>`" | `main` · `v0.1.0` |

Screenshots: `<Issue page>`, `<PR conversation with review>`, `<final project board>`, `<tag/release page>`.
History sequence: see E.0e (contract commit → failing test → implementation, with dates).

## F.7 Contributions and AI use

| Area | Student A | Student B |
|---|---|---|
| Requirements / design | `<…>` | `<…>` |
| Tests | `<…>` | `<…>` |
| Implementation | `<…>` | `<…>` |
| Reviews | `<PR #s>` | `<PR #s>` |
| Integration / release | `<…>` | `<…>` |

**AI-use declaration:** `<tool(s)>` used for `<e.g. drafting SRS/SDS structure from our decisions, generating test scaffolds from the STS, code suggestions on bounded Issues>`. All output was reviewed, run and tested by the team. Both students can explain the requirements, tests and code.

## F.8 Known limitations, incomplete work, failed/skipped tests

| Item | Detail | Plan |
|---|---|---|
| `<e.g. Events published on creation (no drafts)>` | Planned. F-08 in Sprint 2 | S2 |
| `<failed/skipped tests, if any>` | `<…>` | `<…>` |


---

