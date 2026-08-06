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

async function hexEncode(buffer){ const bytes = new Uint8Array(buffer); return Array.from(bytes).map(byte => byte.toString(16).padStart(2,'0')).join(''); }

async function verifyAdminPassword(password, env){ const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)); return await hexEncode(raw); }

function getClientConfig(env){ return {
  STUDENT_GOOGLE_CLIENT_ID: env.STUDENT_GOOGLE_CLIENT_ID || '',
  TEACHER_GOOGLE_CLIENT_ID: env.TEACHER_GOOGLE_CLIENT_ID || '',
  UPLOAD_API_KEY: env.UPLOAD_API_KEY || '',
  R2_BUCKET_NAME: env.R2_BUCKET_NAME || '',
  MAX_UPLOAD_SIZE: env.MAX_UPLOAD_SIZE || '52428800'
}; }

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

    // ---- Public, unauthenticated endpoints ----

    if(url.pathname === '/api/ping'){
      return jsonResponse({ok:true}, 200);
    }

    if(url.pathname === '/api/client-config' && request.method === 'GET'){
      return jsonResponse(getClientConfig(env), 200);
    }

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

    // ---- Full database dump: admin only. This previously had no
    //      authentication at all and was fetched automatically on public
    //      pages; it is now the single most tightly restricted endpoint. ----
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

    // ---- Generic kv endpoints: kv_store mirrors bulk institutional data
    //      (faculty lists, student lists, etc. as JSON blobs) with no safe
    //      per-role scoping possible, so it is admin-only for every method. ----
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

    // ---- Generic table endpoints: simplistic CRUD (table names must match
    //      schema), now gated per-table by classifyTable() above. ----
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
