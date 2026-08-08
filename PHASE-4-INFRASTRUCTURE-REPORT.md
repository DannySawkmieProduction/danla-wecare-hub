# Phase 4 Report — Production Infrastructure & Storage

Read alongside **DEPLOYMENT.md** (the deployment guide deliverable) and the
Infrastructure Audit at the bottom of this report.

## Files changed

**New:**
- `workers/r2.js` — R2 authorization/validation helpers
- `_worker.js` — Cloudflare Pages Advanced Mode entry point
- `d1/migrations/003_r2_objects_uploader_role.sql`

**Rewritten:**
- `workers/d1-api.js` — static-asset passthrough, binding validation, integrated R2 routes
- `wrangler.toml` — Pages-native configuration
- `d1/migrations/001_init.sql` — real SQL instead of a broken shell command
- `d1/schema.sql` — added `r2_objects` (with `uploader_role`) so it matches the full migration sequence
- `js/upload.js` — classic script (was broken ES-module syntax), session-cookie auth instead of a shared API key
- `DEPLOYMENT.md`, `CLOUDFLARE_SETUP.md`, `R2-INTEGRATION.md`, `PRODUCTION_CHECKLIST.md` — rewritten to match the real architecture

**Minimally edited (one line each — the now-dead `UPLOAD_API_KEY` passthrough removed):**
- `js/admin-auth.js`, `js/teacher-auth.js`, `js/student-auth.js`

**Deleted (dead code):**
- `workers/r2-api.js` — a second Worker entry point that `wrangler.toml` never referenced and could never be deployed (confirmed dead in the Phase 0 audit); its logic is now integrated into `workers/d1-api.js`.
- `js/env-config.js` — self-documented in its own header as "deprecated... no longer required," and loaded by zero HTML files (confirmed by a repo-wide grep before deletion).

**Not touched:** every `.html` file, every `.css` file, `workers/auth.js`, `workers/db.js`, `d1/migrations/002_r2_objects.sql`, and all 15 sub-page files updated in Phase 3 (`admin-faculty.js` etc.) — verified below.

---

## The architectural decision this phase is built on

Objective 3 ("fix every remaining deployment inconsistency between Cloudflare
Pages and Workers") and objective 12 ("deploy to a brand-new Cloudflare
account without manual code changes") can't both be satisfied by patching
the old architecture — the old architecture *is* the inconsistency. It
required: a real custom domain (Worker Routes cannot attach to the free
`*.pages.dev` domain), a separate `wrangler deploy` for the Worker on top of
the Pages deployment, and manual Worker Route configuration in the
dashboard tying the two together. None of that is achievable on a fresh
account "without manual code changes" — it's manual *infrastructure*
changes no matter what the code looks like.

The fix: **Cloudflare Pages Advanced Mode.** A file named `_worker.js` at
the project root takes over request handling for the entire Pages project.
It re-exports the exact same `fetch(request, env)` handler that
`workers/d1-api.js` already had:
```js
export { default } from './workers/d1-api.js';
```
Inside that handler, the very first check is now:
```js
if (!url.pathname.startsWith('/api/')) {
  if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    return env.ASSETS.fetch(request);
  }
  return new Response('Not Found', { status: 404 });
}
```
`env.ASSETS` is a binding Cloudflare Pages provides automatically in
Advanced Mode — it serves the static site exactly as Pages always has.
Everything under `/api/*` continues into the same routing logic that
existed before. The result: **one Cloudflare Pages project, one
deployment command, no custom domain, no separate Worker** — D1 and R2
bindings are configured directly on the Pages project (via `wrangler.toml`'s
`pages_build_output_dir` or the dashboard), and a fresh account can go from
zero to a working deployment through Pages alone.

This is why `wrangler.toml` lost `main`, `route`, `zone_id`, `account_id`,
and `workers_dev` — none of them apply to a Pages Advanced Mode deployment;
keeping them would have been exactly the kind of unnecessary/misleading
configuration objective 5 asked to eliminate.

---

## Objective-by-objective

### 1–2. R2 fully integrated and wired into the application
The R2 routes (`upload`, `meta`, `download`, `replace`, `delete`) that used
to live in the orphaned, never-deployed `workers/r2-api.js` are now part of
`workers/d1-api.js` itself — reachable the moment the project deploys,
because there's only one worker module and one deployment. Authorization
was rebuilt on the same real session-cookie model as the rest of the API
(`workers/r2.js`) instead of the old shared `X-Api-Key` header, which had
been leaking to every visitor via `/api/client-config` (a Phase 0 finding).
`getClientConfig()` no longer returns `UPLOAD_API_KEY` at all — it isn't
needed anymore, and the variable itself has been removed from
`wrangler.toml`.

### 3. Deployment inconsistency between Pages and Workers fixed
Covered above — the two deployment targets are now one.

### 4. D1 migrations repaired for a fresh deployment
`d1/migrations/001_init.sql` contained `.read schema.sql` — a `sqlite3`
interactive-shell command, not SQL, and not something D1's migration runner
(`wrangler d1 migrations apply`) can execute. It now contains the actual
`CREATE TABLE` statements. A new `003_r2_objects_uploader_role.sql` adds the
`uploader_role` column Phase 4's authorization model needs (added as a new
migration rather than editing the existing `002_r2_objects.sql`, since a
migration that may already have been applied by an earlier deployment
should never be edited after the fact — only added to). **Verified against
a real SQLite engine** (Node's built-in `node:sqlite`), not just by reading
the SQL: running `001` → `002` → `003` from an empty database produces
tables that are byte-for-byte identical (by table/column name) to running
`d1/schema.sql` directly.

### 5. wrangler.toml trimmed to required production configuration
Removed: `main` (Pages Advanced Mode auto-detects `_worker.js`),
`workers_dev`, `account_id`, `zone_id`, `route` (none apply to a Pages
deployment), `disable_classes` (not a real Wrangler key — it never did
anything), the invalid `environment = "production"` field inside
`[[d1_databases]]` (environments are configured differently in Wrangler;
this field was silently ignored), and `UPLOAD_API_KEY` (obsolete, see
above). Added: `database_id` under `[[d1_databases]]` — this was **missing
entirely** before, and a real D1 binding requires it; without it, binding
resolution would fail regardless of anything else being correct. Also
added: `SESSION_SECRET`, promoting what was an undocumented fallback
(deriving a signing key from `ADMIN_PASSWORD_HASH`, added in Phase 2) into
a first-class, documented, recommended production variable, while keeping
the fallback intact for anyone who leaves it unset.

### 6. Dead routes, unused APIs, and obsolete code removed
`workers/r2-api.js` (dead second Worker entry point) and `js/env-config.js`
(self-documented as deprecated, loaded nowhere) were deleted outright. The
`UPLOAD_API_KEY` variable, binding, client-config field, and all three
client-side passthrough lines that read it are gone. `workers/db.js` was
deliberately **not** deleted — it's unused by the current routing style but
is small, correct, and harmless; removing a working utility module nobody
asked to remove felt like overreach rather than cleanup (see "Known
remaining issues" below).

### 7. Environment variables validated
`requireBinding(env, key, label)` in `workers/d1-api.js` checks `env.DB`
before any D1-dependent route runs, and `env.R2_BUCKET` before any R2 route
runs, returning a clear `500 {"error": "<Label> is not configured. Set the
'<KEY>' binding..."}` instead of letting an unhandled exception through.
Admin/Teacher/Student login already validated `ADMIN_PASSWORD_HASH` /
`TEACHER_GOOGLE_CLIENT_ID` / `STUDENT_GOOGLE_CLIENT_ID` before this phase
(Phase 2) and continue to.

### 8. Graceful error handling for missing bindings
This is deliberately **per-route**, not all-or-nothing: a deployment
missing its R2 bucket still has fully working admin login, D1 data routes,
and static asset serving — only `/api/r2/*` returns the clear
configuration-error response. Verified directly: with both `DB` and
`R2_BUCKET` completely unset, `/api/ping` and `/api/client-config` still
return `200`; with only `R2_BUCKET` unset, admin login still succeeds and
only the upload route reports the missing binding.

### 9. Uploads, downloads, previews, and deletions verified with R2
Verified end-to-end against the real `workers/d1-api.js` module with a
functioning in-memory R2 mock: upload → the file is retrievable byte-for-
byte via download → metadata is recorded correctly → delete removes it from
both R2 and D1 → a subsequent download correctly 404s. `previewFile()` in
`js/upload.js` is client-side-only (FileReader/blob URL, no server round
trip) and was already logically correct — it just couldn't run at all
before this phase because the file's `export function` syntax threw a
`SyntaxError` the instant a plain `<script>` tag tried to load it. That's
fixed (classic function declarations now, matching every other
browser-facing script in the project). **No new upload UI/button was added
to any page** — that's feature work, explicitly out of scope for an
infrastructure phase ("do not begin feature development"); what this phase
delivers is a fully working, fully tested plumbing layer ready for a future
phase to wire a "choose file" button into.

### 10. Uploaded files respect authorization rules
Every object records `uploader_id` (the session's admin username or
teacher/student email) and `uploader_role` at upload time. Access is
decided from that, never from client-supplied headers:
- **Upload**: any authenticated role.
- **Download/metadata**: the uploader, an admin, or *any* authenticated
  role if the file's `purpose` is `resource` or `notice` (institution-wide
  material) — anything else defaults to private (fail closed).
- **Delete/replace**: the uploader or an admin, full stop — never granted
  by a public-read purpose.

Verified with real cross-role scenarios: a student cannot download a
teacher's private upload (403) but an admin can (200); a different student
*can* download another student's `resource`-purpose upload (200) but
*cannot* delete it (403) — only the original uploader or an admin can.

### 11. D1 initialization from scratch verified
Covered under objective 4 — executed against a real SQLite engine from a
completely empty database, both via the migrations path and the
`schema.sql` path, with an automated assertion that both paths produce an
identical table set.

### 12. Deployable to a brand-new Cloudflare account without manual code changes
The combination of Pages Advanced Mode (objective 3) + a complete
`wrangler.toml` with every required binding/variable declared (objective 5)
+ working migrations (objective 4) means the sequence in DEPLOYMENT.md is:
create D1 → run migrations → create R2 bucket → fill in config values →
`wrangler pages deploy .`. Every step is configuration (filling in
placeholder *values*, exactly like the project already did for
`ADMIN_PASSWORD_HASH` etc.), not a code change.

---

## Test results

### Automated infrastructure tests (24/24 passed)
Run with `node --experimental-sqlite phase4_infra_tests.mjs`. Uses Node's
real, built-in SQLite engine for the D1/migration checks (not a hand-rolled
parser) and the actual `workers/d1-api.js` module (imported directly) for
everything else, against in-memory D1/R2/ASSETS mocks and a real
multipart/form-data body for upload requests.

```
PASS  All migrations (001_init.sql, 002_r2_objects.sql, 003_r2_objects_uploader_role.sql) execute as valid SQL against a real SQLite engine (fresh, empty database)
PASS  schema.sql and the full migration sequence produce an identical set of tables
PASS  Every table required by workers/d1-api.js exists after a fresh migration run
PASS  r2_objects has uploader_role after migrations (003 applied)
PASS  Non-API path (/admin-login) is handed to env.ASSETS.fetch (static passthrough)
PASS  Missing ASSETS binding degrades gracefully (404, not a crash)
PASS  Missing DB binding on a DB-dependent route -> 500 with a clear message
PASS  Recovery from missing bindings: /api/ping and /api/client-config still work with DB and R2 both unbound
PASS  Missing R2_BUCKET binding on an upload -> 500 with a clear message (not a crash), while admin login above worked fine
PASS  R2 upload with no session -> 401
PASS  R2 upload with a forged session cookie -> 401
PASS  R2 upload as admin -> 201, object stored
PASS  R2 download of just-uploaded file -> 200 with correct bytes
PASS  R2 metadata lookup -> 200 with filename/purpose recorded
PASS  R2 delete as the uploader (admin) -> 200
PASS  R2 download after delete -> 404 (object actually gone)
PASS  Upload exceeding MAX_UPLOAD_SIZE -> 413
PASS  Upload of a disallowed content type (application/x-sh) -> 400
PASS  Student cannot download a teacher's private (non-public-purpose) upload -> 403
PASS  Admin CAN download any upload regardless of purpose -> 200
PASS  Student cannot delete a teacher's upload -> 403
PASS  A different student CAN download a "resource"-purpose (public) upload -> 200
PASS  ...but that same student CANNOT delete someone else's upload, public purpose or not -> 403
PASS  The original uploader CAN delete their own public upload -> 200

24/24 tests passed.
```

### Mapped against the stated testing requirements
| Requirement | Covered by |
|---|---|
| Test fresh deployment | Static-asset passthrough tests + the full migration-from-empty-database tests |
| Test database migration | The `node:sqlite`-backed migration tests (both paths, table-set equality) |
| Test R2 upload | "R2 upload as admin -> 201" + type/size rejection tests |
| Test R2 download | "R2 download of just-uploaded file" + cross-role download tests |
| Test R2 delete | "R2 delete as the uploader" + cross-role delete tests |
| Test unauthorized upload attempts | "no session -> 401" + "forged session cookie -> 401" |
| Test environment validation | Missing-DB and missing-R2_BUCKET tests, with the exact error message asserted |
| Test recovery from missing bindings | The "still works with DB and R2 both unbound" test for routes that don't need them |
| Automated tests for all infrastructure | All 24, run as one suite |

### Regression check — Phases 2 and 3 re-run against the Phase 4 code (51/51 passed)
```
Phase 2 backend tests:      33/33 passed
Phase 3 browser e2e tests:  18/18 passed
```
Confirms none of this phase's changes to `workers/d1-api.js` (static
passthrough, binding checks, R2 routes) altered the authentication or
authorization behavior verified in Phases 2–3. `workers/auth.js` was not
touched this phase at all.

**Total across all four phases: 75/75 automated tests passing.**

---

## Infrastructure Audit

### Issues fixed this phase
| # | Issue | Fix |
|---|---|---|
| 1 | `workers/r2-api.js` was a second Worker entry point `wrangler.toml` never referenced — permanently undeployed, R2 upload/download/delete were 100% unreachable in production | Merged into `workers/d1-api.js`, deployed via the same single Pages Advanced Mode entry point as everything else |
| 2 | R2 authorization relied on a single shared `X-Api-Key`, which was itself leaked to every visitor (logged in or not) via `/api/client-config` | Replaced with the real per-user session-cookie model; `UPLOAD_API_KEY` removed from `wrangler.toml`, `getClientConfig()`, and every client reference |
| 3 | `d1/migrations/001_init.sql` contained `.read schema.sql`, a `sqlite3`-shell-only command that is not valid SQL and cannot run under `wrangler d1 migrations apply` | Replaced with real `CREATE TABLE` statements; verified against a real SQLite engine |
| 4 | `r2_objects` existed only in a migration, not in `d1/schema.sql` — the two initialization paths produced different schemas depending on which one an operator followed | `schema.sql` now includes `r2_objects` (plus `uploader_role`); both paths verified identical |
| 5 | `[[d1_databases]]` in `wrangler.toml` had no `database_id` — required for a real D1 binding to resolve at all | Added (as a placeholder to fill in, consistent with every other required value) |
| 6 | `[[d1_databases]] environment = "production"` and top-level `disable_classes = false` were not valid Wrangler configuration and were silently ignored | Removed |
| 7 | The project required a custom domain + Worker Route + a second `wrangler deploy` beyond the Pages deployment — impossible to satisfy "deploy to a fresh account without manual changes" | Converted to Cloudflare Pages Advanced Mode (`_worker.js`); one deployment, no custom domain required |
| 8 | No environment/binding validation anywhere — a missing D1 or R2 binding would throw an unhandled exception (Cloudflare's generic error page) instead of a clear message | `requireBinding()` added; every D1- and R2-dependent route checks first |
| 9 | A missing R2 binding would have no path to graceful degradation (nothing to test, since R2 was never wired in) | Verified: missing R2 only affects `/api/r2/*`; everything else (including D1-backed routes) keeps working |
| 10 | `js/upload.js` used ES-module `export function` syntax but was loaded via a plain `<script>` tag — it threw `SyntaxError: Unexpected token 'export'` and never executed at all | Rewritten as classic global functions, matching every other browser-facing script in the project |
| 11 | `js/env-config.js` was self-documented as deprecated and loaded by no HTML file | Deleted |
| 12 | `admin-auth.js`/`teacher-auth.js`/`student-auth.js` each still read a `config.UPLOAD_API_KEY` field the server no longer sends | Dead lines removed (one per file) |
| 13 | Deployment documentation (`DEPLOYMENT.md`, `CLOUDFLARE_SETUP.md`, `R2-INTEGRATION.md`, `PRODUCTION_CHECKLIST.md`) described the old Worker+Route+API-key architecture and would actively mislead anyone following it | All four rewritten to match the real, current architecture |

### Known remaining issues (not addressed this phase — explicitly out of scope or deferred)
- **No upload UI exists yet.** `js/upload.js`'s functions are fully working infrastructure with no "choose file" button wired to them anywhere in the current pages. Wiring one up is feature work for a later phase.
- **Teacher-specific data scoping is still not implemented** (from Phase 2/3): teachers are authenticated but fail closed on bulk `students`/`attendance`/`marks` reads. Unaffected by this phase.
- **No CSRF token beyond `SameSite=Strict`; no login rate limiting.** Unchanged from Phase 2/3.
- **Admin password hashing (unsalted SHA-256)** is unchanged — this phase did not touch authentication logic itself, only infrastructure around it, per the instruction to leave authentication alone unless required for infrastructure integration.
- **`workers/db.js` remains unused** by the current routing style (which uses `env.DB.prepare(...)` directly rather than the cached-statement helpers in `db.js`). It's correct and harmless, so it was left in place rather than deleted; a future cleanup phase could either adopt it project-wide or remove it, but doing so wasn't necessary for any Phase 4 objective.
- **`R2_BUCKET_NAME` is redundant with the R2 binding's own `bucket_name`** — it exists only to be stored as descriptive metadata alongside each `r2_objects` row. This is pre-existing behavior, not changed this phase, and is documented as intentional in `R2-INTEGRATION.md`.
- **`pages_build_output_dir`-based bindings in `wrangler.toml` for Pages projects require a sufficiently recent Wrangler version.** DEPLOYMENT.md and `wrangler.toml`'s own header comment both note the dashboard-based fallback (Settings → Functions → Bindings) for anyone on an older CLI.

---

## Scope verification

```
$ diff -rq <pristine original> <current working tree>
```
Files that differ from the pristine original, beyond what Phases 1–3 already
changed (all of which were verified unchanged since Phase 3 by a direct diff
against the exact files delivered at the end of that phase): exactly the
files listed at the top of this report. No `.html` or `.css` file differs
from the original archive. `workers/auth.js` and `workers/db.js` are
byte-identical to their Phase 2 state. All 15 sub-page files touched in
Phase 3 (`admin-faculty.js` and siblings) are byte-identical to their Phase
3 state — this phase did not need to touch any of them.
