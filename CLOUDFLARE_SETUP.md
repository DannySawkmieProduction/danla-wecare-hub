# Cloudflare Setup

## Cloudflare Pages
1. Create a Cloudflare Pages project.
2. Connect your GitHub repository.
3. Set the production build directory to the repository root.
4. Ensure the Pages project serves `index.html` and other static HTML assets.

## Cloudflare Workers
1. Create a new Worker or use the Workers dashboard.
2. Deploy using `wrangler publish` from the repository root.
3. Use `wrangler.toml` to configure `main = "workers/d1-api.js"`.
4. Set `route = "https://<YOUR_DOMAIN>/api/*"` to forward API calls.

## D1 Database
1. Create a new D1 database.
2. Run `d1/schema.sql`.
3. Run `d1/migrations/001_init.sql`.
4. Run `d1/migrations/002_r2_objects.sql`.
5. Bind the D1 database to the worker as `DB`.

## R2 Bucket
1. Create a new R2 bucket.
2. Bind the bucket to the worker as `R2_BUCKET`.
3. Use `R2_BUCKET_NAME` in environment variables to preserve the bucket name in metadata.

## Environment Variables
Set the following values in the worker environment:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `STUDENT_GOOGLE_CLIENT_ID`
- `TEACHER_GOOGLE_CLIENT_ID`
- `UPLOAD_API_KEY`
- `R2_BUCKET_NAME`
- `MAX_UPLOAD_SIZE`

## API Routes
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
