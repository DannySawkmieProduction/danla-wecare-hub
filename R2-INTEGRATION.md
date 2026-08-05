# Cloudflare R2 Integration (Phase 18)

This document explains how to configure Cloudflare R2, environment variables, deploy the Worker endpoints, and test locally.

1. Create an R2 bucket
- In the Cloudflare dashboard, go to **Workers & R2** → **R2** → **Create bucket**.
- Note the bucket name (e.g., `danla-wecare-uploads`).

2. Create a D1 database (if not already created)
- In Cloudflare dashboard, create a D1 database and run `d1/schema.sql` and `d1/migrations/002_r2_objects.sql` to add `r2_objects` table.

3. Configure Wrangler / Worker bindings
- In your `wrangler.toml` add:

```toml
name = "danla-wecare-api"
main = "workers/d1-api.js"
route = "example.com/*"

[env.production]

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-bucket-name"
preview = true

[vars]
UPLOAD_API_KEY = "replace-with-strong-random-key"
MAX_UPLOAD_SIZE = "52428800" # bytes (50MB)
R2_BUCKET_NAME = "your-bucket-name"
```

- Bind D1 as `DB` in `wrangler.toml` or in dashboard (the worker expects `env.DB`).

4. Environment variables used
- `UPLOAD_API_KEY` — optional API key to protect upload endpoints. If set, all upload/download/replace/delete requests must include `x-api-key: <key>` header.
- `MAX_UPLOAD_SIZE` — optional numeric limit in bytes (defaults to 50MB).
- `R2_BUCKET_NAME` — a descriptive bucket name stored in D1 metadata (not required by R2 SDK).

5. Deploy the Worker
- Use `wrangler publish` or deploy via Cloudflare dashboard. Ensure `R2_BUCKET` and `DB` bindings are configured.

6. Client integration
- The project includes `js/upload.js`. To enable automatic header injection for the API key, set `window.__UPLOAD_API_KEY = 'your-key'` in a secure admin-only script before using `uploadFile()`.
- Example upload usage:

```html
<input id="file" type="file">
<button id="upload">Upload</button>
<script>
  document.getElementById('upload').addEventListener('click', async ()=>{
    const f = document.getElementById('file').files[0];
    const progressEl = document.getElementById('progress');
    try{
      const result = await window.uploadFile({ file: f, purpose: 'assignment', uploaderId: 'teacher:1', onProgress: p => progressEl.value = p });
      console.log('Uploaded', result);
    }catch(err){ console.error(err); }
  });
</script>
```

7. Testing locally
- Wrangler provides a dev server but R2 preview may be limited. Use `wrangler dev` with R2 preview enabled or test against a deployed dev worker.
- To test end-to-end locally without Cloudflare, you can set `UPLOAD_API_KEY` to blank and implement a mock endpoint or use a small Express server that writes files locally and mimics the R2 API (not provided here).

8. Security notes
- Always use HTTPS in production and keep `UPLOAD_API_KEY` secret. Prefer short-lived signed URLs for public downloads if you want unauthenticated access.
- Consider adding role checks by validating `Authorization` tokens (JWT) issued by your auth flow rather than relying solely on `x-api-key`.

9. Next steps (optional)
- Add signed download URL generation endpoint for time-limited public access.
- Integrate R2 object lifecycle rules or immutability policies if files must be preserved.
- Move large file processing (thumbnails, PDF stamping) to a separate Worker queue to avoid blocking uploads.

