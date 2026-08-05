# Cloudflare Setup

## Cloudflare Pages
1. Create a Cloudflare Pages project (Dashboard -> Workers & Pages -> Create -> Pages), or run `wrangler pages deploy .` from the repository root.
2. Connect your GitHub repository, or deploy directly with Wrangler.
3. Build output directory: repository root (`pages_build_output_dir = "."` in `wrangler.toml`) — there is no build step.
4. Pages automatically serves `index.html` and every other static HTML/CSS/JS file, and automatically turns `functions/api/[[path]].js` into your `/api/*` backend. No separate Worker, custom domain, zone, or route is required.

## D1 Database
1. Create a database: `wrangler d1 create danla_wecare_hub`.
2. Copy the returned `database_id` into `wrangler.toml` under `[[d1_databases]]`.
3. Run `d1/schema.sql`.
4. Run `d1/migrations/001_init.sql`.
5. Run `d1/migrations/002_r2_objects.sql`.
6. The binding name `DB` is already wired to `functions/api/[[path]].js` via `wrangler.toml`.

## R2 Bucket
1. Create a bucket: `wrangler r2 bucket create <your-bucket-name>`.
2. Put the bucket name into `wrangler.toml` under `[[r2_buckets]]` (`bucket_name`) and into the `R2_BUCKET_NAME` var.
3. The binding name `R2_BUCKET` is already wired to `functions/api/[[path]].js`.

## Environment Variables (non-secret)
Set in `wrangler.toml` under `[vars]`, or in the Pages Dashboard -> Settings -> Environment variables:
- `ADMIN_USERNAME`
- `STUDENT_GOOGLE_CLIENT_ID`
- `TEACHER_GOOGLE_CLIENT_ID`
- `R2_BUCKET_NAME`
- `MAX_UPLOAD_SIZE`

## Secrets (never in `wrangler.toml`)
Set with `wrangler pages secret put <NAME>`, or Dashboard -> Settings -> Environment variables -> Encrypt:
- `ADMIN_PASSWORD_HASH`
- `UPLOAD_API_KEY`

## API Routes (served by functions/api/[[path]].js)
- `/api/ping`
- `/api/client-config`
- `/api/auth/admin`
- `/api/dump`
- `/api/kv/<key>`
- `/api/table/<table>`
- `/api/r2/upload`
- `/api/r2/meta/<id>`
- `/api/r2/download/<id>`
- `/api/r2/replace/<id>`
- `/api/r2/delete/<id>`
