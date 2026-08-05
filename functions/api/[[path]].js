// Cloudflare Pages Function — catches every request under /api/*.
// Merges the logic previously split between workers/d1-api.js (D1 CRUD/auth/kv,
// never actually wired to a working route) and workers/r2-api.js (R2 upload,
// never referenced by wrangler.toml at all). Runs on the same origin as the
// static Pages site, so no custom domain, zone, or Worker route is required.
//
// env.DB       -> D1 binding (see wrangler.toml [[d1_databases]])
// env.R2_BUCKET -> R2 binding (see wrangler.toml [[r2_buckets]])
import { runAll, runFirst, runExec, safeId } from '../_lib/db.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,X-Role,X-Uploader-Id'
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders }
  });
}

async function hexEncode(buffer){ const bytes = new Uint8Array(buffer); return Array.from(bytes).map(byte => byte.toString(16).padStart(2,'0')).join(''); }

async function sha256Hex(password){ const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)); return await hexEncode(raw); }

function getClientConfig(env){ return {
  STUDENT_GOOGLE_CLIENT_ID: env.STUDENT_GOOGLE_CLIENT_ID || '',
  TEACHER_GOOGLE_CLIENT_ID: env.TEACHER_GOOGLE_CLIENT_ID || '',
  UPLOAD_API_KEY: env.UPLOAD_API_KEY || '',
  R2_BUCKET_NAME: env.R2_BUCKET_NAME || '',
  MAX_UPLOAD_SIZE: env.MAX_UPLOAD_SIZE || '52428800'
}; }

const ALLOWED_TYPES = [
  'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip','text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ---------------------------------------------------------------
    // D1 / auth / kv / generic table routes (from workers/d1-api.js)
    // ---------------------------------------------------------------
    if (url.pathname === '/api/ping') {
      return json({ ok: true });
    }

    if (url.pathname === '/api/client-config' && request.method === 'GET') {
      return json(getClientConfig(env));
    }

    if (url.pathname === '/api/auth/admin' && request.method === 'POST') {
      const payload = await request.json();
      const username = payload.username || '';
      const password = payload.password || '';
      const expectedUser = env.ADMIN_USERNAME || 'admin';
      const expectedHash = env.ADMIN_PASSWORD_HASH || '';
      if (!expectedHash) return json({ error: 'Admin authentication is not configured.' }, 500);
      if (username !== expectedUser) return json({ error: 'Invalid username or password.' }, 401);
      const computedHash = await sha256Hex(password);
      if (computedHash !== expectedHash) return json({ error: 'Invalid username or password.' }, 401);
      return json({ ok: true });
    }

    if (url.pathname === '/api/dump') {
      const tables = ['departments','classes','subjects','faculty','students','assignments','exams','attendance','resources','notices','marks','kv_store'];
      const out = {};
      for (const t of tables) { const r = await env.DB.prepare(`SELECT * FROM ${t}`).all(); out[t] = r.results || []; }
      return json(out);
    }

    if (url.pathname.startsWith('/api/kv/')) {
      const key = decodeURIComponent(url.pathname.replace('/api/kv/', ''));
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT value FROM kv_store WHERE key = ?').first(key);
        return json({ value: row ? row.value : null });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        const value = JSON.stringify(body.value);
        const ts = Date.now();
        await env.DB.prepare('INSERT INTO kv_store(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(key, value, ts);
        return json({ ok: true });
      }
      if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
        return json({ ok: true });
      }
    }

    const tableMatch = url.pathname.match(/^\/api\/table\/([a-z_]+)(?:\/(.*))?$/);
    if (tableMatch) {
      const table = tableMatch[1];
      const id = tableMatch[2];
      if (request.method === 'GET') {
        if (id) {
          const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).first(id);
          return json(row || null);
        }
        const rows = await env.DB.prepare(`SELECT * FROM ${table}`).all();
        return json(rows.results || []);
      }
      if (request.method === 'POST') {
        const body = await request.json();
        const keys = Object.keys(body);
        const placeholders = keys.map(_ => '?').join(',');
        const cols = keys.join(',');
        const values = keys.map(k => body[k]);
        const sql = `INSERT INTO ${table}(${cols}) VALUES(${placeholders})`;
        await env.DB.prepare(sql).run(...values);
        return json({ ok: true });
      }
      if (request.method === 'PUT' && id) {
        const body = await request.json();
        const keys = Object.keys(body);
        const assignments = keys.map(k => `${k} = ?`).join(',');
        const values = keys.map(k => body[k]);
        values.push(id);
        const sql = `UPDATE ${table} SET ${assignments} WHERE id = ?`;
        await env.DB.prepare(sql).run(...values);
        return json({ ok: true });
      }
      if (request.method === 'DELETE' && id) {
        await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
        return json({ ok: true });
      }
    }

    // ---------------------------------------------------------------
    // R2 upload / meta / download / replace / delete (from workers/r2-api.js)
    // ---------------------------------------------------------------
    if (url.pathname.startsWith('/api/r2/')) {
      const apiKey = env.UPLOAD_API_KEY;
      const reqKey = request.headers.get('x-api-key');
      if (apiKey && reqKey !== apiKey) return json({ error: 'Unauthorized' }, 401);

      if (url.pathname === '/api/r2/upload' && request.method === 'POST') {
        const form = await request.formData();
        const file = form.get('file');
        const purpose = form.get('purpose') || 'generic';
        const uploader_id = form.get('uploader_id') || request.headers.get('x-uploader-id') || null;

        if (!file) return json({ error: 'No file provided' }, 400);
        const contentType = file.type || 'application/octet-stream';
        if (!ALLOWED_TYPES.includes(contentType) && !contentType.startsWith('image/')) {
          return json({ error: 'File type not allowed' }, 400);
        }

        const MAX_BYTES = env.MAX_UPLOAD_SIZE ? Number(env.MAX_UPLOAD_SIZE) : 50 * 1024 * 1024;
        const buf = await file.arrayBuffer();
        const size = buf.byteLength;
        if (size > MAX_BYTES) return json({ error: 'File too large' }, 413);

        const uuid = crypto.randomUUID();
        const sanitized = (file.name || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const objectKey = `${purpose}/${uuid}-${Date.now()}-${sanitized}`;

        await env.R2_BUCKET.put(objectKey, buf, { httpMetadata: { contentType }, customMetadata: { filename: sanitized, uploader_id: uploader_id || '' } });

        const id = uuid;
        const created_at = Date.now();
        const stmt = 'INSERT INTO r2_objects(id, object_key, bucket_name, filename, content_type, size, purpose, uploader_id, created_at) VALUES(?,?,?,?,?,?,?,?,?)';
        await env.DB.prepare(stmt).run(id, objectKey, env.R2_BUCKET_NAME || 'default', sanitized, contentType, size, purpose, uploader_id, created_at);

        return json({ id, object_key: objectKey, filename: sanitized, content_type: contentType, size, purpose, created_at }, 201);
      }

      const r2Match = url.pathname.match(/^\/api\/r2\/(meta|download|replace|delete)\/(.+)$/);
      if (r2Match) {
        const op = r2Match[1];
        const id = decodeURIComponent(r2Match[2]);

        if (op === 'meta' && request.method === 'GET') {
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          return json(row || null);
        }

        if (op === 'download' && request.method === 'GET') {
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if (!row) return new Response('Not found', { status: 404, headers: CORS_HEADERS });
          const obj = await env.R2_BUCKET.get(row.object_key);
          if (!obj || !obj.body) return new Response('Object not found', { status: 404, headers: CORS_HEADERS });
          const respHeaders = new Headers({ 'Content-Type': row.content_type, 'Content-Disposition': `attachment; filename="${row.filename}"` });
          return new Response(obj.body, { status: 200, headers: { ...CORS_HEADERS, ...Object.fromEntries(respHeaders) } });
        }

        if (op === 'delete' && request.method === 'DELETE') {
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if (!row) return json({ error: 'Not found' }, 404);
          await env.R2_BUCKET.delete(row.object_key);
          await env.DB.prepare('DELETE FROM r2_objects WHERE id = ?').run(id);
          return json({ ok: true });
        }

        if (op === 'replace' && (request.method === 'POST' || request.method === 'PUT')) {
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if (!row) return json({ error: 'Not found' }, 404);
          const form = await request.formData();
          const file = form.get('file');
          if (!file) return json({ error: 'No file provided' }, 400);
          const contentType = file.type || 'application/octet-stream';
          if (!ALLOWED_TYPES.includes(contentType) && !contentType.startsWith('image/')) {
            return json({ error: 'File type not allowed' }, 400);
          }
          const buf = await file.arrayBuffer();
          const size = buf.byteLength;
          const MAX_BYTES = env.MAX_UPLOAD_SIZE ? Number(env.MAX_UPLOAD_SIZE) : 50 * 1024 * 1024;
          if (size > MAX_BYTES) return json({ error: 'File too large' }, 413);

          await env.R2_BUCKET.delete(row.object_key);
          const sanitized = (file.name || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const newKey = `${row.purpose}/${crypto.randomUUID()}-${Date.now()}-${sanitized}`;
          await env.R2_BUCKET.put(newKey, buf, { httpMetadata: { contentType }, customMetadata: { filename: sanitized } });
          await env.DB.prepare('UPDATE r2_objects SET object_key=?, filename=?, content_type=?, size=?, created_at=? WHERE id=?').run(newKey, sanitized, contentType, size, Date.now(), id);
          return json({ ok: true, id, object_key: newKey, filename: sanitized, size });
        }
      }
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
