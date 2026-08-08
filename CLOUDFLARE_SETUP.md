# Cloudflare Setup

This is a quick dashboard-oriented reference. For the full step-by-step
walkthrough (including exact commands), see **DEPLOYMENT.md** — that is the
authoritative guide; this file summarizes the same steps for anyone working
directly in the Cloudflare dashboard instead of the CLI.

## Cloudflare Pages (the whole project — static site AND API)
1. Create a Cloudflare Pages project (Workers & Pages → Create → Pages).
2. Connect your GitHub repository, or deploy directly with
   `wrangler pages deploy .`.
3. Set the production build output directory to the repository root (there
   is no build step — this is a static site plus a `_worker.js`).
4. That's it for the "Workers" side of this project: the `_worker.js` file
   at the repository root puts this Pages project into Advanced Mode, so
   Pages itself handles every `/api/*` request — there is no separate
   Cloudflare Worker to create, deploy, or route to.

## D1 Database
1. Workers & Pages → D1 → Create database (name: `danla_wecare_hub`).
2. Run the schema — either apply `d1/migrations/*.sql` in order via
   `wrangler d1 migrations apply`, or run `d1/schema.sql` directly (both
   produce the same tables; see DEPLOYMENT.md).
3. Bind it to the Pages project: Pages project → Settings → Functions → D1
   database bindings → add binding named `DB` pointing at
   `danla_wecare_hub`. (Equivalently, configure `[[d1_databases]]` in
   `wrangler.toml`.)

## R2 Bucket
1. Workers & Pages → R2 → Create bucket.
2. Bind it to the Pages project: Settings → Functions → R2 bucket bindings
   → add binding named `R2_BUCKET` pointing at your bucket.
3. Set `R2_BUCKET_NAME` (an environment variable, not a binding) to the same
   bucket name — it's stored alongside each upload's metadata in D1.

## Environment Variables
Set these on the Pages project (Settings → Environment variables) or in
`wrangler.toml`'s `[vars]` block — see DEPLOYMENT.md for what each one does
and which ones should be set as secrets instead of plaintext vars:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`
- `STUDENT_GOOGLE_CLIENT_ID`
- `TEACHER_GOOGLE_CLIENT_ID`
- `R2_BUCKET_NAME`
- `MAX_UPLOAD_SIZE`

There is no `UPLOAD_API_KEY` variable in this project anymore — file
uploads authenticate with the same session cookie as every other protected
endpoint (see the Phase 4 Infrastructure Audit).

## API Routes
All served by the single `_worker.js` / `workers/d1-api.js` module:
- `/api/ping`, `/api/client-config` — public
- `/api/auth/admin`, `/api/auth/teacher`, `/api/auth/student`,
  `/api/auth/logout`, `/api/auth/session` — authentication
- `/api/dump`, `/api/kv/<key>`, `/api/table/<table>` — data (session
  required; see the Phase 2/3 reports for the authorization rules)
- `/api/r2/upload`, `/api/r2/meta/<id>`, `/api/r2/download/<id>`,
  `/api/r2/replace/<id>`, `/api/r2/delete/<id>` — file storage (session
  required; see the Phase 4 Infrastructure Audit for the authorization
  rules)
