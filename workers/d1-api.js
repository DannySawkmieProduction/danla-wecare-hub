import { runAll, runFirst, runExec, safeId } from './db.js';

async function hexEncode(buffer){ const bytes = new Uint8Array(buffer); return Array.from(bytes).map(byte => byte.toString(16).padStart(2,'0')).join(''); }

async function verifyAdminPassword(password, env){ const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)); return await hexEncode(raw); }

function getClientConfig(env){ return {
  STUDENT_GOOGLE_CLIENT_ID: env.STUDENT_GOOGLE_CLIENT_ID || '',
  TEACHER_GOOGLE_CLIENT_ID: env.TEACHER_GOOGLE_CLIENT_ID || '',
  UPLOAD_API_KEY: env.UPLOAD_API_KEY || '',
  R2_BUCKET_NAME: env.R2_BUCKET_NAME || '',
  MAX_UPLOAD_SIZE: env.MAX_UPLOAD_SIZE || '52428800'
}; }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if(url.pathname === '/api/ping'){
      return new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}});
    }

    if(url.pathname === '/api/client-config' && request.method === 'GET'){
      return new Response(JSON.stringify(getClientConfig(env)), {status:200, headers:{'Content-Type':'application/json'}});
    }

    if(url.pathname === '/api/auth/admin' && request.method === 'POST'){
      try{
        const payload = await request.json();
        const username = payload.username || '';
        const password = payload.password || '';
        const expectedUser = env.ADMIN_USERNAME || 'admin';
        const expectedHash = env.ADMIN_PASSWORD_HASH || '';
        if(!expectedHash){ return new Response(JSON.stringify({error:'Admin authentication is not configured.'}), {status:500, headers:{'Content-Type':'application/json'}}); }
        if(username !== expectedUser){ return new Response(JSON.stringify({error:'Invalid username or password.'}), {status:401, headers:{'Content-Type':'application/json'}}); }
        const computedHash = await verifyAdminPassword(password, env);
        if(computedHash !== expectedHash){ return new Response(JSON.stringify({error:'Invalid username or password.'}), {status:401, headers:{'Content-Type':'application/json'}}); }
        return new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}});
      }catch(e){ return new Response(JSON.stringify({error:e.message}), {status:500, headers:{'Content-Type':'application/json'}}); }
    }

    // dump kv_store and key tables for client sync
    if(url.pathname === '/api/dump'){
      try{
        const tables = ['departments','classes','subjects','faculty','students','assignments','exams','attendance','resources','notices','marks','kv_store'];
        const out = {};
        for(const t of tables){ const r = await env.DB.prepare(`SELECT * FROM ${t}`).all(); out[t]= r.results || []; }
        return new Response(JSON.stringify(out), {status:200, headers:{'Content-Type':'application/json'}});
      }catch(e){ return new Response(JSON.stringify({error:e.message}), {status:500, headers:{'Content-Type':'application/json'}}); }
    }

    // generic kv endpoints
    if(url.pathname.startsWith('/api/kv/')){
      const key = decodeURIComponent(url.pathname.replace('/api/kv/',''));
      if(request.method === 'GET'){
        const row = await env.DB.prepare('SELECT value FROM kv_store WHERE key = ?').first(key);
        return new Response(JSON.stringify({value: row? row.value: null}), {status:200, headers:{'Content-Type':'application/json'}});
      }
      if(request.method === 'POST'){
        const body = await request.json(); const value = JSON.stringify(body.value); const ts = Date.now();
        await env.DB.prepare('INSERT INTO kv_store(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(key, value, ts);
        return new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}});
      }
      if(request.method === 'DELETE'){
        await env.DB.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
        return new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}});
      }
    }

    // generic table endpoints simplistic CRUD (table names must match schema)
    const match = url.pathname.match(/^\/api\/table\/([a-z_]+)(?:\/(.*))?$/);
    if(match){ const table = match[1]; const id = match[2]; if(request.method === 'GET'){ if(id){ const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).first(id); return new Response(JSON.stringify(row||null), {status:200, headers:{'Content-Type':'application/json'}}); } else { const rows = await env.DB.prepare(`SELECT * FROM ${table}`).all(); return new Response(JSON.stringify(rows.results||[]), {status:200, headers:{'Content-Type':'application/json'}}); } }
      if(request.method === 'POST'){ const body = await request.json(); // insert with prepared statement building
        const keys = Object.keys(body); const placeholders = keys.map(_=>'?').join(','); const cols = keys.join(','); const values = keys.map(k=> body[k]); const sql = `INSERT INTO ${table}(${cols}) VALUES(${placeholders})`;
        await env.DB.prepare(sql).run(...values);
        return new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}});
      }
      if(request.method === 'PUT' && id){ const body = await request.json(); const keys = Object.keys(body); const assignments = keys.map(k=> `${k} = ?`).join(','); const values = keys.map(k=> body[k]); values.push(id); const sql = `UPDATE ${table} SET ${assignments} WHERE id = ?`;
        await env.DB.prepare(sql).run(...values); return new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}});
      }
      if(request.method === 'DELETE' && id){ await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id); return new Response(JSON.stringify({ok:true}), {status:200, headers:{'Content-Type':'application/json'}}); }
    }

    return new Response('Not Found', {status:404});
  }
};
