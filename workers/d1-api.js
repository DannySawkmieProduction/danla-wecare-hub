import { runAll, runFirst, runExec, safeId } from './db.js';
import {
  createSessionToken,
  getSession,
  sessionCookieHeader,
  jsonResponse,
  unauthorized,
  forbidden,
  verifyGoogleIdToken
} from './auth.js';
import {
  isAllowedType,
  sanitizeFilename,
  buildObjectKey,
  maxUploadBytes,
  canReadObject,
  canModifyObject
} from './r2.js';

async function hexEncode(buffer){ const bytes = new Uint8Array(buffer); return Array.from(bytes).map(byte => byte.toString(16).padStart(2,'0')).join(''); }

async function verifyAdminPassword(password, env){ const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)); return await hexEncode(raw); }

function getClientConfig(env){ return {
  STUDENT_GOOGLE_CLIENT_ID: env.STUDENT_GOOGLE_CLIENT_ID || '',
  TEACHER_GOOGLE_CLIENT_ID: env.TEACHER_GOOGLE_CLIENT_ID || '',
  MAX_UPLOAD_SIZE: env.MAX_UPLOAD_SIZE || '52428800'
}; }

// ---------------------------------------------------------------------------
// Environment / binding validation
//
// Every route that depends on a binding (D1, R2) or a piece of required
// configuration checks for it explicitly before touching it, and returns a
// clean 500 JSON error identifying exactly what's missing rather than
// letting an unhandled exception surface Cloudflare's generic error page.
// This lets the rest of the API keep working even if one binding is
// missing or misconfigured (e.g. R2 not yet provisioned shouldn't take down
// admin login or D1-backed routes, and vice versa).
// ---------------------------------------------------------------------------
function requireBinding(env, key, label){
  if(!env[key]){
    return jsonResponse({ error: `${label} is not configured. Set the '${key}' binding for this Cloudflare Pages project (Settings -> Functions -> Bindings, or wrangler.toml) and redeploy.` }, 500);
  }
  return null;
}

// ---------------------------------------------------------------------------
// /api/table/:table authorization policy
//
// Every table reachable through the generic CRUD endpoint is classified into
// exactly one bucket below. Any table name NOT listed anywhere (including any
// future table added to the schema that nobody has classified yet) falls
// through to the 'admin_only' default in classifyTable() - i.e. the system
// fails closed, never open, for anything unrecognized.
// ---------------------------------------------------------------------------

// Never exposed through the generic table API at all, for any role,
// regardless of authentication - this table holds admin credential material.
const BLOCKED_TABLES = new Set(['administrators']);

// Any authenticated role (admin, teacher, student) may read these in bulk or
// by id. Only admin may write (POST/PUT/DELETE). These are institution-wide
// reference/schedule tables with no per-user personal data in them.
const OPEN_READ_TABLES = new Set([
  'institution', 'departments', 'classes', 'subjects',
  'timetables', 'exams', 'assignments', 'resources', 'notices'
]);

// Contain PII or internal data with no safe per-role scoping implemented yet.
// Bulk/​by-id reads and all writes are admin-only.
const ADMIN_ONLY_TABLES = new Set(['faculty', 'reports_meta', 'kv_store', 'r2_objects']);

// The student's own row is looked up by the table's own primary key (id),
// which must equal the authenticated student's session studentId.
const STUDENT_OWN_ID_TABLES = new Set(['students']);

// Tables with a foreign key column pointing at the authenticated student.
// Table name -> FK column name.
const STUDENT_FK_SCOPED_TABLES = { attendance: 'student_id', marks: 'student_id' };

function classifyTable(table){
  if (BLOCKED_TABLES.has(table)) return 'blocked';
  if (STUDENT_OWN_ID_TABLES.has(table)) return 'student_own_id';
  if (STUDENT_FK_SCOPED_TABLES[table]) return 'student_fk_scoped';
  if (ADMIN_ONLY_TABLES.has(table)) return 'admin_only';
  if (OPEN_READ_TABLES.has(table)) return 'open_read';
  return 'admin_only'; // fail closed for any unrecognized/unclassified table
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // -------------------------------------------------------------------
    // Static asset passthrough.
    //
    // This worker is deployed as a Cloudflare Pages "Advanced Mode"
    // _worker.js (see /_worker.js at the project root), which means every
    // request to the Pages project - not just /api/* - is routed through
    // this fetch handler first. Anything that isn't an API call is handed
    // straight to Pages' static asset serving (env.ASSETS), which is what
    // actually serves the HTML/CSS/JS site. This is what lets the whole
    // project - static site AND API - deploy as a single Cloudflare Pages
    // project with no separate Worker, no custom domain/zone, and no
    // Worker Route to configure.
    // -------------------------------------------------------------------
    if(!url.pathname.startsWith('/api/')){
      if(env.ASSETS && typeof env.ASSETS.fetch === 'function'){
        return env.ASSETS.fetch(request);
      }
      // No ASSETS binding available (e.g. this module was invoked directly
      // as a plain Worker rather than through Cloudflare Pages). Fail
      // gracefully instead of throwing.
      return new Response('Not Found', { status: 404 });
    }

    // ---- Public, unauthenticated endpoints ----

    if(url.pathname === '/api/ping'){
      return jsonResponse({ok:true}, 200);
    }

    if(url.pathname === '/api/client-config' && request.method === 'GET'){
      return jsonResponse(getClientConfig(env), 200);
    }

    // Every route below this point needs the D1 binding.
    const dbCheck = requireBinding(env, 'DB', 'The D1 database');
    if(dbCheck) return dbCheck;

    // ---- Admin login: verifies credentials and issues a signed session cookie ----
    if(url.pathname === '/api/auth/admin' && request.method === 'POST'){
      try{
        const payload = await request.json();
        const username = payload.username || '';
        const password = payload.password || '';
        const expectedUser = env.ADMIN_USERNAME || 'admin';
        const expectedHash = env.ADMIN_PASSWORD_HASH || '';
        if(!expectedHash){ return jsonResponse({error:'Admin authentication is not configured.'}, 500); }
        if(username !== expectedUser){ return jsonResponse({error:'Invalid username or password.'}, 401); }
        const computedHash = await verifyAdminPassword(password, env);
        if(computedHash !== expectedHash){ return jsonResponse({error:'Invalid username or password.'}, 401); }
        const token = await createSessionToken(env, { role: 'admin', sub: username });
        if(!token){ return jsonResponse({error:'Admin authentication is not configured.'}, 500); }
        return jsonResponse({ok:true}, 200, { 'Set-Cookie': sessionCookieHeader(token) });
      }catch(e){ return jsonResponse({error:e.message}, 500); }
    }

    // ---- Teacher Google Sign-In: verifies the Google ID token server-side,
    //      confirms the email is a registered faculty member in D1, and
    //      issues a signed session cookie scoped to that teacher. ----
    if(url.pathname === '/api/auth/teacher' && request.method === 'POST'){
      try{
        const payload = await request.json();
        const credential = payload.credential || '';
        const expectedAud = env.TEACHER_GOOGLE_CLIENT_ID || '';
        if(!expectedAud){ return jsonResponse({error:'Teacher Google Sign-In is not configured.'}, 500); }
        const claims = await verifyGoogleIdToken(credential, expectedAud);
        if(!claims){ return jsonResponse({error:'Invalid or expired Google credential.'}, 401); }
        const row = await env.DB.prepare('SELECT id, name, email FROM faculty WHERE email = ?').first(claims.email);
        if(!row){ return jsonResponse({error:'Your account has not yet been registered. Please contact the Administrator.'}, 403); }
        const token = await createSessionToken(env, { role: 'teacher', sub: claims.email, facultyId: row.id });
        if(!token){ return jsonResponse({error:'Authentication is not configured.'}, 500); }
        return jsonResponse({ok:true, name: row.name, email: row.email}, 200, { 'Set-Cookie': sessionCookieHeader(token) });
      }catch(e){ return jsonResponse({error:e.message}, 500); }
    }

    // ---- Student Google Sign-In: same pattern, checked against the students table. ----
    if(url.pathname === '/api/auth/student' && request.method === 'POST'){
      try{
        const payload = await request.json();
        const credential = payload.credential || '';
        const expectedAud = env.STUDENT_GOOGLE_CLIENT_ID || '';
        if(!expectedAud){ return jsonResponse({error:'Student Google Sign-In is not configured.'}, 500); }
        const claims = await verifyGoogleIdToken(credential, expectedAud);
        if(!claims){ return jsonResponse({error:'Invalid or expired Google credential.'}, 401); }
        const row = await env.DB.prepare('SELECT id, name, email FROM students WHERE email = ?').first(claims.email);
        if(!row){ return jsonResponse({error:'Your account has not yet been registered. Please contact the Administrator.'}, 403); }
        const token = await createSessionToken(env, { role: 'student', sub: claims.email, studentId: row.id });
        if(!token){ return jsonResponse({error:'Authentication is not configured.'}, 500); }
        return jsonResponse({ok:true, name: row.name, email: row.email}, 200, { 'Set-Cookie': sessionCookieHeader(token) });
      }catch(e){ return jsonResponse({error:e.message}, 500); }
    }

    // ---- Logout: clears the session cookie regardless of whether one was present. ----
    if(url.pathname === '/api/auth/logout' && request.method === 'POST'){
      return jsonResponse({ok:true}, 200, { 'Set-Cookie': sessionCookieHeader('', {clear:true}) });
    }

    // ---- Session introspection: lets a caller (or a test) confirm who the
    //      server currently believes they are. ----
    if(url.pathname === '/api/auth/session' && request.method === 'GET'){
      const session = await getSession(request, env);
      if(!session){ return unauthorized(); }
      return jsonResponse({ role: session.role, sub: session.sub }, 200);
    }

    // ---- Full database dump: admin only. ----
    if(url.pathname === '/api/dump'){
      const session = await getSession(request, env);
      if(!session){ return unauthorized(); }
      if(session.role !== 'admin'){ return forbidden(); }
      try{
        const tables = ['departments','classes','subjects','faculty','students','assignments','exams','attendance','resources','notices','marks','kv_store'];
        const out = {};
        for(const t of tables){ const r = await env.DB.prepare(`SELECT * FROM ${t}`).all(); out[t]= r.results || []; }
        return jsonResponse(out, 200);
      }catch(e){ return jsonResponse({error:e.message}, 500); }
    }

    // ---- Generic kv endpoints: admin-only for every method (see Phase 2
    //      report for why kv_store cannot be safely scoped by role). ----
    if(url.pathname.startsWith('/api/kv/')){
      const session = await getSession(request, env);
      if(!session){ return unauthorized(); }
      if(session.role !== 'admin'){ return forbidden(); }
      const key = decodeURIComponent(url.pathname.replace('/api/kv/',''));
      if(request.method === 'GET'){
        const row = await env.DB.prepare('SELECT value FROM kv_store WHERE key = ?').first(key);
        return jsonResponse({value: row? row.value: null}, 200);
      }
      if(request.method === 'POST'){
        const body = await request.json(); const value = JSON.stringify(body.value); const ts = Date.now();
        await env.DB.prepare('INSERT INTO kv_store(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(key, value, ts);
        return jsonResponse({ok:true}, 200);
      }
      if(request.method === 'DELETE'){
        await env.DB.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
        return jsonResponse({ok:true}, 200);
      }
    }

    // ---- Integrated R2 file storage ----
    //
    // Merged in from what used to be a separate, never-deployed
    // workers/r2-api.js (see the Phase 0 and Phase 4 audits). Authorization
    // now uses the same real session cookie as everything else in this
    // file, instead of a shared X-Api-Key that was exposed to every visitor
    // via /api/client-config.
    if(url.pathname === '/api/r2/upload' && request.method === 'POST'){
      const session = await getSession(request, env);
      if(!session){ return unauthorized(); }
      const r2Check = requireBinding(env, 'R2_BUCKET', 'R2 file storage');
      if(r2Check) return r2Check;
      try{
        const form = await request.formData();
        const file = form.get('file');
        const purpose = form.get('purpose') || 'generic';
        if(!file){ return jsonResponse({error:'No file provided'}, 400); }
        const contentType = file.type || 'application/octet-stream';
        if(!isAllowedType(contentType)){ return jsonResponse({error:'File type not allowed'}, 400); }
        const buf = await file.arrayBuffer();
        const size = buf.byteLength;
        const maxBytes = maxUploadBytes(env);
        if(size > maxBytes){ return jsonResponse({error:'File too large'}, 413); }

        const sanitized = sanitizeFilename(file.name);
        const objectKey = buildObjectKey(purpose, sanitized);
        await env.R2_BUCKET.put(objectKey, buf, { httpMetadata: { contentType }, customMetadata: { filename: sanitized, uploader_id: session.sub, uploader_role: session.role } });

        const id = crypto.randomUUID();
        const created_at = Date.now();
        await env.DB.prepare('INSERT INTO r2_objects(id, object_key, bucket_name, filename, content_type, size, purpose, uploader_id, uploader_role, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
          .run(id, objectKey, env.R2_BUCKET_NAME || 'default', sanitized, contentType, size, purpose, session.sub, session.role, created_at);

        return jsonResponse({ id, object_key: objectKey, filename: sanitized, content_type: contentType, size, purpose, created_at }, 201);
      }catch(e){ return jsonResponse({error:e.message}, 500); }
    }

    const r2Match = url.pathname.match(/^\/api\/r2\/(meta|download|replace|delete)\/(.+)$/);
    if(r2Match){
      const op = r2Match[1]; const id = decodeURIComponent(r2Match[2]);
      const session = await getSession(request, env);
      if(!session){ return unauthorized(); }

      try{
        if(op === 'meta' && request.method === 'GET'){
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if(!row){ return jsonResponse(null, 200); }
          if(!canReadObject(row, session)){ return forbidden('You do not have permission to view this file.'); }
          return jsonResponse(row, 200);
        }

        if(op === 'download' && request.method === 'GET'){
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if(!row){ return new Response('Not found', { status: 404 }); }
          if(!canReadObject(row, session)){ return forbidden('You do not have permission to download this file.'); }
          const r2Check = requireBinding(env, 'R2_BUCKET', 'R2 file storage');
          if(r2Check) return r2Check;
          const obj = await env.R2_BUCKET.get(row.object_key);
          if(!obj || !obj.body){ return new Response('Object not found', { status: 404 }); }
          return new Response(obj.body, { status: 200, headers: {
            'Content-Type': row.content_type,
            'Content-Disposition': `attachment; filename="${row.filename}"`
          }});
        }

        if(op === 'delete' && request.method === 'DELETE'){
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if(!row){ return jsonResponse({error:'Not found'}, 404); }
          if(!canModifyObject(row, session)){ return forbidden('You do not have permission to delete this file.'); }
          const r2Check = requireBinding(env, 'R2_BUCKET', 'R2 file storage');
          if(r2Check) return r2Check;
          await env.R2_BUCKET.delete(row.object_key);
          await env.DB.prepare('DELETE FROM r2_objects WHERE id = ?').run(id);
          return jsonResponse({ok:true}, 200);
        }

        if(op === 'replace' && (request.method === 'POST' || request.method === 'PUT')){
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if(!row){ return jsonResponse({error:'Not found'}, 404); }
          if(!canModifyObject(row, session)){ return forbidden('You do not have permission to replace this file.'); }
          const r2Check = requireBinding(env, 'R2_BUCKET', 'R2 file storage');
          if(r2Check) return r2Check;

          const form = await request.formData();
          const file = form.get('file');
          if(!file){ return jsonResponse({error:'No file provided'}, 400); }
          const contentType = file.type || 'application/octet-stream';
          if(!isAllowedType(contentType)){ return jsonResponse({error:'File type not allowed'}, 400); }
          const buf = await file.arrayBuffer();
          const size = buf.byteLength;
          const maxBytes = maxUploadBytes(env);
          if(size > maxBytes){ return jsonResponse({error:'File too large'}, 413); }

          await env.R2_BUCKET.delete(row.object_key);
          const sanitized = sanitizeFilename(file.name);
          const newKey = buildObjectKey(row.purpose, sanitized);
          await env.R2_BUCKET.put(newKey, buf, { httpMetadata: { contentType }, customMetadata: { filename: sanitized, uploader_id: row.uploader_id, uploader_role: row.uploader_role || '' } });
          await env.DB.prepare('UPDATE r2_objects SET object_key=?, filename=?, content_type=?, size=?, created_at=? WHERE id=?')
            .run(newKey, sanitized, contentType, size, Date.now(), id);
          return jsonResponse({ok:true, id, object_key:newKey, filename:sanitized, size}, 200);
        }
      }catch(e){ return jsonResponse({error:e.message}, 500); }
    }

    // ---- Generic table endpoints ----
    const match = url.pathname.match(/^\/api\/table\/([a-z_]+)(?:\/(.*))?$/);
    if(match){
      const table = match[1]; const id = match[2];
      const cls = classifyTable(table);

      if(cls === 'blocked'){
        return forbidden('This table is not accessible via the API.');
      }

      const session = await getSession(request, env);

      if(request.method === 'GET'){
        if(!session){ return unauthorized(); }

        if(cls === 'admin_only'){
          if(session.role !== 'admin'){ return forbidden(); }
        } else if(cls === 'student_own_id'){
          if(session.role === 'student'){
            if(!id || id !== session.studentId){ return forbidden('You may only access your own record.'); }
          } else if(session.role !== 'admin'){
            return forbidden();
          }
        } else if(cls === 'student_fk_scoped'){
          const fkCol = STUDENT_FK_SCOPED_TABLES[table];
          if(session.role === 'student'){
            if(id){
              const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).first(id);
              if(!row || row[fkCol] !== session.studentId){ return forbidden('You may only access your own records.'); }
              return jsonResponse(row, 200);
            }
            const rows = await env.DB.prepare(`SELECT * FROM ${table} WHERE ${fkCol} = ?`).all(session.studentId);
            return jsonResponse(rows.results || [], 200);
          } else if(session.role !== 'admin'){
            return forbidden();
          }
        } else if(cls === 'open_read'){
          // any authenticated role permitted
        }

        if(id){
          const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).first(id);
          return jsonResponse(row || null, 200);
        }
        const rows = await env.DB.prepare(`SELECT * FROM ${table}`).all();
        return jsonResponse(rows.results || [], 200);
      }

      // Writes: POST / PUT / DELETE are admin-only across every non-blocked table.
      if(request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE'){
        if(!session){ return unauthorized(); }
        if(session.role !== 'admin'){ return forbidden(); }

        if(request.method === 'POST'){
          const body = await request.json();
          const keys = Object.keys(body); const placeholders = keys.map(_=>'?').join(','); const cols = keys.join(','); const values = keys.map(k=> body[k]); const sql = `INSERT INTO ${table}(${cols}) VALUES(${placeholders})`;
          await env.DB.prepare(sql).run(...values);
          return jsonResponse({ok:true}, 200);
        }
        if(request.method === 'PUT' && id){
          const body = await request.json(); const keys = Object.keys(body); const assignments = keys.map(k=> `${k} = ?`).join(','); const values = keys.map(k=> body[k]); values.push(id); const sql = `UPDATE ${table} SET ${assignments} WHERE id = ?`;
          await env.DB.prepare(sql).run(...values);
          return jsonResponse({ok:true}, 200);
        }
        if(request.method === 'DELETE' && id){
          await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
          return jsonResponse({ok:true}, 200);
        }
      }
    }

    return new Response('Not Found', {status:404});
  }
};
