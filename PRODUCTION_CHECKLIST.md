# Production Checklist

## Configuration
- [ ] `wrangler.toml` exists with `pages_build_output_dir`, `[[d1_databases]]`
      (including a real `database_id`, not the placeholder), and
      `[[r2_buckets]]`.
- [ ] `ADMIN_USERNAME` is configured.
- [ ] `ADMIN_PASSWORD_HASH` is configured (as a secret, not a committed
      plaintext value — see DEPLOYMENT.md step 8).
- [ ] `SESSION_SECRET` is configured (as a secret; recommended but not
      strictly required — see DEPLOYMENT.md step 6).
- [ ] `STUDENT_GOOGLE_CLIENT_ID` and `TEACHER_GOOGLE_CLIENT_ID` are
      configured and match real Google OAuth credentials.
- [ ] `R2_BUCKET_NAME` matches the `[[r2_buckets]]` binding's `bucket_name`.
- [ ] `MAX_UPLOAD_SIZE` is set appropriately for your expected file sizes.
- [ ] No `UPLOAD_API_KEY` variable is needed or present — uploads use the
      real session cookie, not a shared key.

## Backend Services
- [ ] Cloudflare Pages project created and deployed (`wrangler pages deploy .`).
- [ ] D1 database created, bound as `DB`, and initialized (migrations
      applied or `d1/schema.sql` run — verified identical either way).
- [ ] R2 bucket created and bound as `R2_BUCKET`.
- [ ] There is **no separate Cloudflare Worker** to deploy for this project
      — if one exists from a previous version, it can be retired once this
      Pages deployment is verified.

## Security
- [ ] No real secret values committed to source control — only placeholder
      text in `wrangler.toml`.
- [ ] Admin auth is environment-driven (`ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`).
- [ ] Every `/api/dump`, `/api/kv/*`, and `/api/table/*` request without a
      valid session returns `401`.
- [ ] Every `/api/r2/*` request without a valid session returns `401`, and a
      non-owner/non-admin attempting to delete or replace someone else's
      upload returns `403`.
- [ ] Session cookies are `HttpOnly`, `Secure`, and `SameSite=Strict`
      (already the case — verify via browser DevTools → Application →
      Cookies after logging in).
- [ ] `manifest.webmanifest` and `service-worker.js` are served over HTTPS
      (automatic on Cloudflare Pages).

## Verification
- [ ] `/api/ping` returns `200 {"ok":true}`.
- [ ] `/api/client-config` returns the two Google Client IDs and nothing
      sensitive.
- [ ] Admin login works with the configured credentials and sets a session
      cookie.
- [ ] Teacher/Student Google Sign-In works for a registered
      faculty/student email, and is rejected (403) for an unregistered one.
- [ ] Logging out clears the session and re-visiting a dashboard redirects
      to login.
- [ ] A file can be uploaded, downloaded, and deleted end-to-end through the
      R2 routes.
- [ ] Static site (HTML/CSS/JS/images) loads correctly — confirms the
      `_worker.js` → `env.ASSETS` static-asset passthrough works.
- [ ] The full automated test suite (Phases 1–4) passes against the deployed
      environment or an equivalent local/mocked run.
