// Shared D1 helper for Pages Functions (moved from workers/db.js, unchanged logic).
// Files under functions/_lib/ start with an underscore, so Cloudflare Pages
// treats this as a shared module, not a routable endpoint.
function stmtFor(db, sql){ if(!db.__stmtCache) db.__stmtCache = new Map(); if(!db.__stmtCache.has(sql)){ db.__stmtCache.set(sql, db.prepare(sql)); } return db.__stmtCache.get(sql); }

export async function runAll(db, sql, params=[]){ const stmt = stmtFor(db, sql); const res = await stmt.all(...params); return res; }
export async function runFirst(db, sql, params=[]){ const stmt = stmtFor(db, sql); const res = await stmt.first(...params); return res; }
export async function runExec(db, sql, params=[]){ const stmt = stmtFor(db, sql); const res = await stmt.run(...params); return res; }

export function safeId(id){ return id ? String(id).replace(/[^a-zA-Z0-9-_.]/g,'') : id; }
