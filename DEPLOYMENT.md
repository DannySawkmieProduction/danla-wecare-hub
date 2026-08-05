# Deployment Guide

## Overview
This project deploys as a single Cloudflare Pages project: the static PWA (HTML/CSS/JS) and the `/api/*` backend (Cloudflare Pages Functions in `functions/api/[[path]].js`) are served from the same domain, with D1 and R2 bound directly to the Pages project. No separate Worker, custom domain, or zone route is needed.

## Required Services
- Cloudflare Pages (with Functions enabled — on by default)
- Cloudflare D1 database
- Cloudflare R2 bucket

## Config Files
- `wrangler.toml` — Pages project name, D1/R2 bindings, non-secret vars.
- `functions/api/[[path]].js` — API backend (auth, D1 CRUD/kv, R2 upload/download/replace/delete).
- `functions/_lib/db.js` — shared D1 helper used by the API function.
- `.assetsignore` — keeps `d1/`, `workers/`, and markdown docs from being published as public static files.
- `_headers` — cache-control and security headers.
- `manifest.webmanifest` / `service-worker.js` — PWA metadata and offline caching.
- `icons/icon-192.svg`, `icons/icon-512.svg` — PWA icons referenced by the manifest, HTML, and service worker precache list.

## Deployment Steps
1. `wrangler d1 create danla_wecare_hub`, then paste the returned `database_id` into `wrangler.toml`.
2. Run `wrangler d1 execute danla_wecare_hub --file=d1/schema.sql`, then `d1/migrations/001_init.sql`, then `d1/migrations/002_r2_objects.sql` (add `--remote` for the production database).
3. `wrangler r2 bucket create <your-bucket-name>`, then set that name in `wrangler.toml` (`bucket_name` and `R2_BUCKET_NAME`).
4. Set secrets (do not put these in `wrangler.toml`):
   - `wrangler pages secret put ADMIN_PASSWORD_HASH`
   - `wrangler pages secret put UPLOAD_API_KEY`
5. Set the remaining non-secret vars in `wrangler.toml` or the Pages Dashboard:
   - `ADMIN_USERNAME`, `STUDENT_GOOGLE_CLIENT_ID`, `TEACHER_GOOGLE_CLIENT_ID`, `R2_BUCKET_NAME`, `MAX_UPLOAD_SIZE`
6. Deploy: `wrangler pages deploy .` (or connect the repo in the Dashboard for git-based deploys).
7. Verify `/api/ping` returns `{"ok":true}` on your `*.pages.dev` URL, then attach a custom domain if desired — no route configuration is required for the API to keep working on a custom domain, since it's same-origin with the Pages site.

## Notes
- Do not commit real secret values to source control. Copy `.dev.vars.example` to `.dev.vars` for local `wrangler pages dev` testing (`.dev.vars` is gitignored).
- Use the SHA-256 hashed admin password value in `ADMIN_PASSWORD_HASH`.
- Ensure `STUDENT_GOOGLE_CLIENT_ID` and `TEACHER_GOOGLE_CLIENT_ID` match your Google Cloud OAuth credentials.
