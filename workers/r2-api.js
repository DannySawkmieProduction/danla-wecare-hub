import { runExec } from './db.js';

const ALLOWED_TYPES = [
  'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip','text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,X-Role,X-Uploader-Id' };
    if(request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    // Basic API key check if configured
    const apiKey = env.UPLOAD_API_KEY;
    const reqKey = request.headers.get('x-api-key');
    if(apiKey && reqKey !== apiKey){ return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }); }

    try{
      if(url.pathname === '/api/r2/upload' && request.method === 'POST'){
        const form = await request.formData();
        const file = form.get('file');
        const purpose = form.get('purpose') || 'generic';
        const uploader_id = form.get('uploader_id') || request.headers.get('x-uploader-id') || null;

        if(!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } });
        const contentType = file.type || 'application/octet-stream';
        if(!ALLOWED_TYPES.includes(contentType) && !contentType.startsWith('image/')){
          return new Response(JSON.stringify({ error: 'File type not allowed' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } });
        }

        const MAX_BYTES = env.MAX_UPLOAD_SIZE ? Number(env.MAX_UPLOAD_SIZE) : 50 * 1024 * 1024; // 50MB default
        const buf = await file.arrayBuffer();
        const size = buf.byteLength;
        if(size > MAX_BYTES) return new Response(JSON.stringify({ error: 'File too large' }), { status: 413, headers: { ...headers, 'Content-Type': 'application/json' } });

        const uuid = crypto.randomUUID();
        const sanitized = (file.name || 'upload').replace(/[^a-zA-Z0-9.\-_]/g,'_');
        const objectKey = `${purpose}/${uuid}-${Date.now()}-${sanitized}`;

        // Put to R2
        await env.R2_BUCKET.put(objectKey, buf, { httpMetadata: { contentType }, customMetadata: { filename: sanitized, uploader_id: uploader_id || '' } });

        // Store metadata in D1
        const id = uuid;
        const created_at = Date.now();
        const stmt = 'INSERT INTO r2_objects(id, object_key, bucket_name, filename, content_type, size, purpose, uploader_id, created_at) VALUES(?,?,?,?,?,?,?,?,?)';
        await env.DB.prepare(stmt).run(id, objectKey, env.R2_BUCKET_NAME || 'default', sanitized, contentType, size, purpose, uploader_id, created_at);

        return new Response(JSON.stringify({ id, object_key: objectKey, filename: sanitized, content_type: contentType, size, purpose, created_at }), { status: 201, headers: { ...headers, 'Content-Type': 'application/json' } });
      }

      // metadata
      const m = url.pathname.match(/^\/api\/r2\/(meta|download|replace|delete)\/(.+)$/);
      if(m){ const op = m[1]; const id = decodeURIComponent(m[2]);
        if(op === 'meta' && request.method === 'GET'){
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          return new Response(JSON.stringify(row||null), { status:200, headers: { ...headers, 'Content-Type': 'application/json' } });
        }
        if(op === 'download' && request.method === 'GET'){
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if(!row) return new Response('Not found', { status:404, headers });
          // Optionally check uploader or role here (headers contain x-role,x-uploader-id)
          const obj = await env.R2_BUCKET.get(row.object_key);
          if(!obj || !obj.body) return new Response('Object not found', { status:404, headers });
          const respHeaders = new Headers({ 'Content-Type': row.content_type, 'Content-Disposition': `attachment; filename="${row.filename}"` });
          return new Response(obj.body, { status:200, headers: { ...headers, ...Object.fromEntries(respHeaders) } });
        }
        if(op === 'delete' && request.method === 'DELETE'){
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if(!row) return new Response(JSON.stringify({ error:'Not found' }), { status:404, headers: { ...headers, 'Content-Type':'application/json' } });
          await env.R2_BUCKET.delete(row.object_key);
          await env.DB.prepare('DELETE FROM r2_objects WHERE id = ?').run(id);
          return new Response(JSON.stringify({ ok:true }), { status:200, headers: { ...headers, 'Content-Type':'application/json' } });
        }
        if(op === 'replace' && (request.method === 'POST' || request.method === 'PUT')){
          const row = await env.DB.prepare('SELECT * FROM r2_objects WHERE id = ?').first(id);
          if(!row) return new Response(JSON.stringify({ error:'Not found' }), { status:404, headers: { ...headers, 'Content-Type':'application/json' } });
          const form = await request.formData(); const file = form.get('file');
          if(!file) return new Response(JSON.stringify({ error:'No file provided' }), { status:400, headers: { ...headers, 'Content-Type':'application/json' } });
          const contentType = file.type || 'application/octet-stream';
          if(!ALLOWED_TYPES.includes(contentType) && !contentType.startsWith('image/')){
            return new Response(JSON.stringify({ error: 'File type not allowed' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } });
          }
          const buf = await file.arrayBuffer(); const size = buf.byteLength;
          const MAX_BYTES = env.MAX_UPLOAD_SIZE ? Number(env.MAX_UPLOAD_SIZE) : 50 * 1024 * 1024;
          if(size > MAX_BYTES) return new Response(JSON.stringify({ error: 'File too large' }), { status: 413, headers: { ...headers, 'Content-Type': 'application/json' } });

          // delete old object
          await env.R2_BUCKET.delete(row.object_key);
          const sanitized = (file.name || 'upload').replace(/[^a-zA-Z0-9.\-_]/g,'_');
          const newKey = `${row.purpose}/${crypto.randomUUID()}-${Date.now()}-${sanitized}`;
          await env.R2_BUCKET.put(newKey, buf, { httpMetadata: { contentType }, customMetadata: { filename: sanitized } });
          await env.DB.prepare('UPDATE r2_objects SET object_key=?, filename=?, content_type=?, size=?, created_at=? WHERE id=?').run(newKey, sanitized, contentType, size, Date.now(), id);
          return new Response(JSON.stringify({ ok:true, id, object_key:newKey, filename:sanitized, size }), { status:200, headers: { ...headers, 'Content-Type':'application/json' } });
        }
      }

      return new Response('Not Found', { status:404, headers });
    }catch(err){
      return new Response(JSON.stringify({ error: err.message }), { status:500, headers: { 'Content-Type': 'application/json', ...headers } });
    }
  }
};
