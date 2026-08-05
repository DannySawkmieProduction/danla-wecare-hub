# Production Checklist

## Configuration
- [ ] `wrangler.toml` exists and contains Cloudflare Workers, D1, and R2 bindings.
- [ ] `ADMIN_USERNAME` is configured in the worker environment.
- [ ] `ADMIN_PASSWORD_HASH` is configured securely in the worker environment.
- [ ] `STUDENT_GOOGLE_CLIENT_ID` is configured.
- [ ] `TEACHER_GOOGLE_CLIENT_ID` is configured.
- [ ] `UPLOAD_API_KEY` is configured.
- [ ] `R2_BUCKET_NAME` is configured.
- [ ] `MAX_UPLOAD_SIZE` is configured if required.

## Backend Services
- [ ] Cloudflare Pages project created.
- [ ] Cloudflare Worker deployed.
- [ ] D1 database created and migrated.
- [ ] R2 bucket created and bound.

## Security
- [ ] No hard-coded secrets in repo.
- [ ] Admin auth is environment-driven.
- [ ] Worker routes are protected by API key when `UPLOAD_API_KEY` is enabled.
- [ ] `manifest.webmanifest` and `service-worker.js` are served securely.

## Verification
- [ ] `/api/ping` returns status 200.
- [ ] `/api/client-config` returns runtime config values.
- [ ] Admin login works with configured credentials.
- [ ] D1 sync fetches content via `/api/dump`.
- [ ] R2 upload endpoints are reachable.
- [ ] Static site loads correctly from Pages.
