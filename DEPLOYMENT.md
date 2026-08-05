# Deployment Guide

## Overview
This project deploys a static PWA to Cloudflare Pages with backend APIs on Cloudflare Workers. The Workers connect to D1 and R2 for data persistence and file storage.

## Required Services
- Cloudflare Pages
- Cloudflare Workers
- Cloudflare D1 database
- Cloudflare R2 bucket

## Config Files
- `wrangler.toml` — Worker deployment, D1/R2 bindings, and environment variable placeholders.
- `manifest.webmanifest` — PWA metadata.
- `service-worker.js` — offline caching for static assets.

## Deployment Steps
1. Create a Cloudflare Pages project for the static site content.
2. Create a D1 database and run `d1/schema.sql`, then `d1/migrations/001_init.sql` and `d1/migrations/002_r2_objects.sql`.
3. Create an R2 bucket for uploaded files.
4. Create or configure a Cloudflare Worker with `wrangler.toml`.
5. Set production environment variables in Cloudflare:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH`
   - `STUDENT_GOOGLE_CLIENT_ID`
   - `TEACHER_GOOGLE_CLIENT_ID`
   - `UPLOAD_API_KEY`
   - `R2_BUCKET_NAME`
   - `MAX_UPLOAD_SIZE`
6. Publish the Pages site and confirm `/api/` routing to the Worker.

## Notes
- Do not commit real secret values to source control.
- Use the hashed admin password value in `ADMIN_PASSWORD_HASH`.
- Ensure `STUDENT_GOOGLE_CLIENT_ID` and `TEACHER_GOOGLE_CLIENT_ID` match Google Cloud OAuth credentials.
