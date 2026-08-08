# Deployment Guide

This is the authoritative deployment guide for DanLa WeCare Hub. It reflects
the architecture as of Phase 4: **a single Cloudflare Pages project**, no
separate Worker, no custom domain required.

## Architecture

- **Cloudflare Pages** serves the static site (HTML/CSS/JS) *and* the API.
  A file called `_worker.js` at the project root puts the Pages project into
  "Advanced Mode," which routes every request — static or `/api/*` — through
  one JavaScript module (`workers/d1-api.js`). Requests that aren't for
  `/api/*` are handed off to Pages' normal static asset serving
  (`env.ASSETS.fetch(request)`); everything else is handled by the API code.
- **Cloudflare D1** (`env.DB`) is the relational database.
- **Cloudflare R2** (`env.R2_BUCKET`) stores uploaded files; metadata for
  each upload lives in D1's `r2_objects` table.
- There is **no separate Worker to deploy**, **no zone/custom domain
  requirement**, and **no Worker Route to configure**. One
  `wrangler pages deploy .` (or a git-connected Pages build) publishes
  everything. The project works immediately on the free `*.pages.dev`
  domain Cloudflare assigns it; a custom domain is optional.

## Prerequisites

- A Cloudflare account (free tier is sufficient).
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) installed
  and logged in: `npm install -g wrangler` then `wrangler login`.
- A Google Cloud project with two OAuth 2.0 Client IDs (Web application
  type) for Teacher and Student Google Sign-In — see
  [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials).

## Step-by-step: fresh deployment to a brand-new Cloudflare account

### 1. Get the code and fill in configuration
Clone/download this repository. Open `wrangler.toml` and note every
`<PLACEHOLDER>` value — you'll fill each one in over the next steps. No
other file needs code changes for a standard deployment.

### 2. Create the D1 database
```
wrangler d1 create danla_wecare_hub
```
This prints a `database_id`. Copy it into `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "danla_wecare_hub"
database_id = "PASTE_THE_ID_HERE"
```

### 3. Initialize the database schema
Two equivalent ways to get from an empty database to the full schema — pick
one:

**Option A — run the migrations (recommended, tracks what's been applied):**
```
wrangler d1 migrations apply danla_wecare_hub --remote
```
This runs `d1/migrations/001_init.sql`, `002_r2_objects.sql`, and
`003_r2_objects_uploader_role.sql` in order, and records which have been
applied so re-running the command later (after adding a future migration)
only applies what's new.

**Option B — run the consolidated schema directly (one shot, for a database
you know is empty):**
```
wrangler d1 execute danla_wecare_hub --remote --file=d1/schema.sql
```
Both options produce an identical set of tables — verified automatically as
part of this project's test suite (see "Automated tests" in the
Infrastructure Audit).

### 4. Create the R2 bucket
```
wrangler r2 bucket create danla-wecare-uploads
```
Then in `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "danla-wecare-uploads"
```
...and set the matching variable further down:
```toml
[vars]
R2_BUCKET_NAME = "danla-wecare-uploads"
```

### 5. Generate the admin password hash
`ADMIN_PASSWORD_HASH` must be the lowercase hex SHA-256 digest of the admin
password (never the plaintext password itself):
```
echo -n "your-chosen-password" | shasum -a 256
```
Put the resulting hex string in `wrangler.toml`'s `ADMIN_PASSWORD_HASH`.

### 6. Generate a session secret
```
openssl rand -hex 32
```
Put the result in `wrangler.toml`'s `SESSION_SECRET`. (If you skip this, the
server derives a working signing key from `ADMIN_PASSWORD_HASH` instead —
functional, but a dedicated secret is recommended for production so that
changing the admin password doesn't invalidate every active session.)

### 7. Set the Google OAuth Client IDs
Fill in `STUDENT_GOOGLE_CLIENT_ID` and `TEACHER_GOOGLE_CLIENT_ID` in
`wrangler.toml` with the two Client IDs from your Google Cloud OAuth
credentials (prerequisite above). These are public identifiers, not secrets.

### 8. Treat secrets as secrets, not committed plaintext
Everything in `wrangler.toml`'s `[vars]` block deploys as a plaintext
environment variable. That's fine for non-sensitive values
(`ADMIN_USERNAME`, the Google Client IDs, `R2_BUCKET_NAME`,
`MAX_UPLOAD_SIZE`), but for `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` in a
real production deployment, prefer Wrangler secrets instead of committing
the values to `wrangler.toml`:
```
wrangler pages secret put ADMIN_PASSWORD_HASH --project-name danla-wecare-hub
wrangler pages secret put SESSION_SECRET --project-name danla-wecare-hub
```
A secret set this way overrides anything left in `[vars]`, so you can leave
the placeholder text in `wrangler.toml` (safe to commit) and supply the real
values only via `wrangler pages secret put` or the dashboard.

### 9. Deploy
```
wrangler pages deploy . --project-name danla-wecare-hub
```
Wrangler creates the Pages project (first run) or publishes a new deployment
(subsequent runs), and applies the bindings/variables from `wrangler.toml`.
Your site is now live at `https://danla-wecare-hub.pages.dev` (or whatever
subdomain Cloudflare assigns) — no custom domain, no DNS changes, no zone
required.

### 10. Verify
- Visit the site, confirm the homepage loads.
- Visit `/admin-login`, log in with the admin credentials from step 5.
- Confirm `/api/ping` returns `{"ok":true}` and `/api/client-config` returns
  the Google Client IDs (but see the Security Notes below on what it
  intentionally does *not* return).
- See "Post-deploy verification checklist" below for the full list.

## Optional: custom domain
A custom domain is entirely optional with this architecture (it was
*required* in earlier phases; no longer). If you want one: Pages project →
Custom domains → add your domain. No Worker Route or zone-level API routing
needs to be configured — Pages Advanced Mode already routes `/api/*` through
`_worker.js` regardless of which domain the request arrives on.

## Environment variable reference

| Variable | Required | Sensitive | Purpose |
|---|---|---|---|
| `ADMIN_USERNAME` | No (defaults to `admin`) | No | Admin login username |
| `ADMIN_PASSWORD_HASH` | **Yes** | **Yes** | SHA-256 hex digest of the admin password |
| `SESSION_SECRET` | Recommended | **Yes** | Signs session cookies (falls back to a key derived from `ADMIN_PASSWORD_HASH` if unset) |
| `STUDENT_GOOGLE_CLIENT_ID` | Yes, for Student Sign-In | No | Google OAuth Client ID |
| `TEACHER_GOOGLE_CLIENT_ID` | Yes, for Teacher Sign-In | No | Google OAuth Client ID |
| `R2_BUCKET_NAME` | Yes, for uploads | No | Must match the `[[r2_buckets]]` binding's `bucket_name` |
| `MAX_UPLOAD_SIZE` | No (defaults to 52428800 = 50 MiB) | No | Max upload size in bytes |

Every route that depends on `env.DB` or `env.R2_BUCKET` checks for that
binding before using it and returns a clear `500` error naming exactly
what's missing, rather than crashing, if it isn't configured (see
`requireBinding()` in `workers/d1-api.js`). This means, for example, that
admin login and every D1-backed route keep working even before the R2
bucket has been created — only the `/api/r2/*` routes are affected until R2
is bound.

## Post-deploy verification checklist
- [ ] `/api/ping` → `200 {"ok":true}`
- [ ] `/api/client-config` → `200` with the two Google Client IDs
- [ ] Admin login succeeds with the configured credentials and sets a
      session cookie
- [ ] Visiting `/admin-dashboard` directly while logged out redirects to
      `/admin-login`
- [ ] Teacher/Student Google Sign-In succeeds for an email that exists in
      the `faculty`/`students` D1 tables, and is rejected (403, correct
      message) for one that doesn't
- [ ] `/api/dump`, `/api/kv/*`, `/api/table/*` all return `401` when called
      with no session
- [ ] A file can be uploaded, downloaded, and deleted through the R2 routes
      (see the automated infrastructure tests for a scripted version of this)
- [ ] Static pages (CSS, images, the PWA manifest) still load correctly —
      confirms the `_worker.js` → `env.ASSETS` static-asset passthrough is
      working

## Notes
- Never commit real secret values — only placeholder text — to source
  control. Use `wrangler pages secret put` (step 8) for anything sensitive.
- This project intentionally has **one** Cloudflare Pages project and **one**
  `wrangler.toml`. Earlier revisions of this project used a separate
  Cloudflare Worker with its own `route`/`zone_id`; that model has been
  retired in favor of Pages Advanced Mode specifically because it required a
  custom domain and a second deployment step that a fresh Cloudflare account
  doesn't have set up by default. If you're migrating an existing deployment
  from that model, you can delete the old standalone Worker and its Route
  once this Pages deployment is live and verified.
