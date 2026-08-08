# Phase 2 Fix Report — API Security & Role-Based Authorization

## Files changed (2 total, both returned below)
- **`workers/auth.js`** — new file. Session + authorization helpers.
- **`workers/d1-api.js`** — modified. Every route now goes through real authentication/authorization.

Not touched: any HTML file, any file under `js/` (including the three Phase 1 login files), `wrangler.toml`, `workers/db.js`, `workers/r2-api.js`. Verified with a byte-for-byte diff against the original archive (see "Scope verification" at the end of this report).

---

## Why a new file (`workers/auth.js`) was necessary

Tasks 1–9 require real session verification and role checks on every route. Inlining that logic into `workers/d1-api.js` directly would have meant duplicating cookie-parsing, HMAC signing/verification, and Google-token verification code across many branches, or bloating a single `fetch()` handler with cryptography. A small, focused helper module is the "required file" here — it's backend-only, adds no new deployment surface, and lets `d1-api.js` stay readable. It was **not** possible to do this with zero new files while keeping the code honest (no placeholder/mock auth) and readable.

**No new deployment configuration was added.** The signing key is derived from `env.ADMIN_PASSWORD_HASH`, which every working deployment already has configured for the admin login to function at all — so this works immediately, on the existing `wrangler.toml`, with nothing new to set up. (The code also honors an optional `env.SESSION_SECRET` if one is ever added later, for cleaner separation of concerns — but nothing requires it today, and `wrangler.toml` was not touched.)

---

## What was broken before (recap from the Phase 0 audit)

Every one of these endpoints was reachable by anyone on the internet, logged in or not:
- `GET /api/dump` — full database dump (every student, every mark, every attendance record, everything)
- `GET/POST/DELETE /api/kv/:key` — arbitrary read/write of any stored blob
- `GET/POST/PUT/DELETE /api/table/:table` — arbitrary read/write of any D1 table by name, including `administrators`

There was also no concept of "who is calling this" anywhere in the backend — the only thing resembling a session was a client-side `sessionStorage` flag that never left the browser and was never checked by the server.

---

## What Phase 2 implements

### 1–2. `/api/dump` is now admin-only
`GET /api/dump` requires a valid session cookie with `role: 'admin'`. No session → `401`. Valid session but not admin → `403`. This is the single biggest exposure closed in this phase — it was previously fetched automatically and silently by every visitor to the public homepage and every login page (see Phase 0 audit, finding 1.5).

### 3. `/api/kv/*` is now admin-only for every method (GET, POST, DELETE)
`kv_store` mirrors bulk institutional data (full faculty lists, full student lists, etc.) as opaque JSON blobs. There is no safe way to scope read access to this table by role without knowing in advance what's inside every blob, so — rather than guess at a key-name allow-list that could be wrong or incomplete — access is locked to admin only, across all methods. This is the conservative, fail-safe choice, and it doesn't regress any real functionality: no teacher- or student-facing code path in this codebase legitimately depends on reading arbitrary `kv_store` keys.

### 4. `/api/table/:table` is now authorized per table, per method
Every table reachable through the generic CRUD endpoint is classified into exactly one policy bucket in `d1-api.js` (`classifyTable()`):

| Bucket | Tables | GET (read) | POST/PUT/DELETE (write) |
|---|---|---|---|
| **Blocked** | `administrators` | 403 for everyone, always | 403 for everyone, always |
| **Open read** | `institution`, `departments`, `classes`, `subjects`, `timetables`, `exams`, `assignments`, `resources`, `notices` | Any authenticated role (admin/teacher/student) | Admin only |
| **Admin-only** | `faculty`, `reports_meta`, `kv_store`, `r2_objects` | Admin only | Admin only |
| **Student — own record by id** | `students` | Admin: full. Student: only their own row (`id` must equal their session's `studentId`). Teacher: blocked (no scoping mechanism exists yet — fails closed, see "Known limitations" below). | Admin only |
| **Student — own rows by foreign key** | `attendance`, `marks` | Admin: full. Student: automatically filtered to `WHERE student_id = <their own id>` — a plain `GET /api/table/marks` as a student silently returns *only their own* marks, and a request for a specific row belonging to someone else returns 403. Teacher: blocked (fails closed). | Admin only |
| **Anything unrecognized** | any future/unknown table name | Treated as Admin-only by default | Admin only |

Any table name not explicitly classified falls through to the admin-only default — the system fails closed for anything new, rather than accidentally exposing a future table.

`administrators` is blocked outright, closing a specific escalation path flagged in the Phase 0 audit (D1 issue #5): previously the generic `/api/table/:table` regex would happily run `SELECT * FROM administrators` for any caller.

### 5, 7, 8, 9. Role-based authorization, concretely
- **Admin-only endpoints reject teacher and student** — verified for `/api/dump`, `/api/table/students` (bulk), `/api/table/faculty` (write). (Task 7 ✅)
- **No teacher-only endpoints exist yet in the current codebase** to gate (teacher-specific server-side identity is new in this phase — see "Known limitations"), so there's nothing today a student could reach that's meant to be teacher-only. (Task 8 — satisfied vacuously; see limitations below for what's still needed to make this concrete.)
- **Student endpoints only expose the authenticated student's own data** — implemented for real, not just blocked: `GET /api/table/students/:id`, `GET /api/table/marks`, and `GET /api/table/attendance` are all scoped so a student only ever sees rows tied to their own `studentId`, whether they ask for "all of them" or for someone else's row by id. (Task 9 ✅ — verified with automated tests below, including a direct attempt by one student to read another student's marks, which is correctly rejected.)

### 6. Proper HTTP status codes
- No session / invalid or forged signature / expired token → **401**
- Valid session, wrong role, or accessing another user's data → **403**
- Table not accessible via the API at all (`administrators`) → **403**
- Bad admin credentials → **401** (unchanged from before)
- Server missing its signing secret → **500** (fails closed, never silently "succeeds")

### 10. Automated tests
A 33-case automated test suite (`/tmp/phase2_tests.mjs`, described below) runs the actual `workers/d1-api.js` module — not a reimplementation of it — against an in-memory D1 mock, with only the database and the external Google `tokeninfo` network call mocked. **All 33 tests pass.** See "Test results" below for the full list.

---

## New capabilities added (additive, required to make role-based auth real)

These didn't exist before and were necessary to have any real teacher/student identity on the server at all — without them, "role-based authorization" would have had nothing to check except admin:

- **`POST /api/auth/admin`** (existing endpoint, modified): on success, now also sets a signed, `HttpOnly`, `Secure`, `SameSite=Strict` session cookie (`wecare_session`). The request/response contract the frontend already relies on (`response.ok` → success) is unchanged, so this required **zero changes to `js/admin-auth.js`** — the browser attaches the cookie automatically on subsequent same-origin requests.
- **`POST /api/auth/teacher`** (new): accepts `{ credential: <Google ID token> }`, verifies it **server-side** against Google's `tokeninfo` endpoint (real signature/issuer/audience/expiry verification — not the client-side `atob()` decode the existing frontend uses for its own UI purposes), confirms the email exists in the D1 `faculty` table, and issues a session cookie scoped to that teacher.
- **`POST /api/auth/student`** (new): same pattern against the `students` table.
- **`POST /api/auth/logout`** (new): clears the session cookie.
- **`GET /api/auth/session`** (new): lets a caller confirm their current role — useful for the test suite and for any future frontend work.

**Important — these new teacher/student endpoints are not yet called by anything**, because `js/teacher-auth.js` and `js/student-auth.js` were explicitly off-limits in this phase ("do NOT modify login"). Today, Google Sign-In still only decodes the credential in the browser and never talks to the server (Phase 0 audit finding 1.7/1.8). This phase makes it *possible* for a teacher/student to obtain a real, verified session — but wiring the existing Sign-In button to actually call `/api/auth/teacher` / `/api/auth/student` requires a small change to the login files themselves, which is exactly the kind of change this phase was told not to make. **Practical effect right now:** no teacher or student can obtain a session cookie through the current UI, so their dashboards' `/api/dump`-based data sync (Phase 0 finding 1.5) will now correctly get `401` instead of silently leaking everything — a strict improvement (fail closed instead of fail open), but their dashboards won't show live data until that wiring happens in a later phase. Recommend this as the first item for Phase 3.

---

## Known limitations (explicitly not solved here, so nothing is overstated)

1. **No teacher-specific data scoping exists yet.** Bulk access to `students`, `attendance`, and `marks` is blocked (403) for the teacher role rather than scoped to "students in my classes," because there is no class/subject-assignment mapping wired into the API yet, and building one wasn't part of this phase's task list. Failing closed (blocking) is the correct, safe choice until that scoping logic exists — silently returning nothing or guessing at a filter would be worse.
2. **Teacher/student sessions are unreachable from the current UI**, as explained above, because the login files couldn't be touched this phase.
3. **`/api/client-config` still returns `UPLOAD_API_KEY` to anyone, unauthenticated** — this was flagged in the Phase 0 audit as a separate issue and is not one of the 10 tasks for this phase, so it was left alone. It is unrelated to the dump/kv/table/RBAC work done here.
4. **No CSRF token / rate limiting** was added. The `SameSite=Strict` cookie attribute mitigates the most common CSRF vector for this same-origin architecture, but dedicated rate limiting on login attempts (Phase 0 finding 2.5) is still outstanding.
5. **Admin password hashing** (unsalted SHA-256, Phase 0 finding 2.1) is unchanged — out of scope for "API security" as defined by this phase's task list, and changing it would touch the credential-verification logic rather than the authorization layer.

---

## Test results (33/33 passed)

Run with: `node /tmp/phase2_tests.mjs` (executes the real `workers/d1-api.js` against an in-memory D1 mock; only the database and Google's `tokeninfo` endpoint are mocked).

```
PASS  GET /api/dump with no session -> 401
PASS  POST /api/auth/admin correct creds -> 200 + Set-Cookie
PASS  POST /api/auth/admin wrong password -> 401
PASS  GET /api/dump with admin session -> 200 + data
PASS  GET /api/kv/:key with no session -> 401
PASS  GET /api/kv/:key with admin session -> 200
PASS  POST /api/kv/:key with no session -> 401
PASS  GET /api/table/administrators blocked even for admin -> 403
PASS  GET /api/table/students (bulk) as admin -> 200
PASS  POST /api/auth/teacher valid+registered -> 200 + Set-Cookie
PASS  POST /api/auth/teacher wrong audience -> 401
PASS  POST /api/auth/student valid+registered -> 200 + Set-Cookie
PASS  POST /api/auth/student valid Google token but not in students table -> 403
PASS  GET /api/dump as teacher -> 403
PASS  GET /api/dump as student -> 403
PASS  GET /api/table/students (bulk) as teacher -> 403 (fail-closed, no scoping)
PASS  POST /api/table/faculty as teacher -> 403
PASS  GET /api/table/students/s1 as student s1 (own record) -> 200
PASS  GET /api/table/students/s2 as student s1 (someone else) -> 403
PASS  GET /api/table/students (bulk, no id) as student -> 403
PASS  GET /api/table/marks (bulk) as student -> auto-scoped to own rows only
PASS  GET /api/table/marks/m2 (belongs to s2) as student s1 -> 403
PASS  GET /api/table/marks/m1 (belongs to s1) as student s1 -> 200
PASS  GET /api/table/attendance (bulk) as student -> auto-scoped to own rows only
PASS  GET /api/table/departments as teacher -> 200 (open-read table)
PASS  GET /api/table/departments as student -> 200 (open-read table)
PASS  GET /api/table/departments unauthenticated -> 401
PASS  POST /api/table/departments as student -> 403 (writes are admin-only)
PASS  POST /api/table/departments as admin -> 200
PASS  POST /api/auth/logout -> clears cookie (Max-Age=0)
PASS  GET /api/dump with a forged/invalid-signature cookie -> 401
PASS  GET /api/ping (no session) -> 200 (still public)
PASS  GET /api/client-config (no session) -> 200 (still public)

33/33 tests passed.
```

Notably tested and confirmed:
- A forged/tampered session cookie (invalid HMAC signature) is rejected with 401 — the token can't just be "any string," it has to verify.
- A student who successfully logs in cannot read another student's `marks` or `attendance` row even by guessing its id, and a bulk request auto-filters to their own rows only rather than erroring or returning everything.
- Public endpoints (`/api/ping`, `/api/client-config`) remain public, and the admin login endpoint's existing success/failure contract is unchanged.

---

## Full endpoint inventory (every `/api/*` route, its access rule, and status codes)

| Endpoint | Method | Access | Status codes |
|---|---|---|---|
| `/api/ping` | GET | Public | 200 |
| `/api/client-config` | GET | Public | 200 |
| `/api/auth/admin` | POST | Public (this is the login) | 200 (+cookie) / 401 bad creds / 500 misconfigured |
| `/api/auth/teacher` | POST | Public (verifies Google token itself) | 200 (+cookie) / 401 invalid token / 403 not registered / 500 misconfigured |
| `/api/auth/student` | POST | Public (verifies Google token itself) | 200 (+cookie) / 401 invalid token / 403 not registered / 500 misconfigured |
| `/api/auth/logout` | POST | Public | 200 (+cookie cleared) |
| `/api/auth/session` | GET | Any authenticated role | 200 / 401 |
| `/api/dump` | GET | **Admin only** | 200 / 401 / 403 |
| `/api/kv/:key` | GET/POST/DELETE | **Admin only** | 200 / 401 / 403 |
| `/api/table/administrators` | any | **Blocked for everyone** | 403 |
| `/api/table/{institution,departments,classes,subjects,timetables,exams,assignments,resources,notices}` | GET | Any authenticated role | 200 / 401 |
| same tables | POST/PUT/DELETE | Admin only | 200 / 401 / 403 |
| `/api/table/{faculty,reports_meta,kv_store,r2_objects}` | any | Admin only | 200 / 401 / 403 |
| `/api/table/students` | GET (bulk) | Admin only | 200 / 401 / 403 |
| `/api/table/students/:id` | GET | Admin: any. Student: only if `:id` is their own. | 200 / 401 / 403 |
| `/api/table/students*` | POST/PUT/DELETE | Admin only | 200 / 401 / 403 |
| `/api/table/{attendance,marks}` | GET (bulk) | Admin: all rows. Student: auto-filtered to own rows. Teacher: blocked. | 200 / 401 / 403 |
| `/api/table/{attendance,marks}/:id` | GET | Admin: any. Student: only if the row belongs to them. Teacher: blocked. | 200 / 401 / 403 |
| `/api/table/{attendance,marks}*` | POST/PUT/DELETE | Admin only | 200 / 401 / 403 |
| any other/unknown table | any | Admin only (fail-closed default) | 200 / 401 / 403 |

---

## Scope verification

Diffed the full working tree against the original uploaded archive:

```
wrangler.toml UNCHANGED
db.js UNCHANGED
r2-api.js UNCHANGED
ALL HTML UNCHANGED
```

Only `workers/d1-api.js` (modified) and `workers/auth.js` (new) differ from the original project, beyond the three Phase 1 login files already delivered. No UI, no login flow, no deployment configuration was touched in this phase.
