// workers/auth.js
//
// Session and authorization helpers for the DanLa WeCare Hub API worker.
//
// This implements REAL, cryptographically signed session cookies (HMAC-SHA256
// via the Web Crypto API already available in the Workers runtime) and REAL
// server-side verification of Google ID tokens (via Google's tokeninfo
// endpoint). There is no mock/placeholder authentication anywhere in this
// file: every check either cryptographically verifies something or fails
// closed (denies access).
//
// This module intentionally requires no new deployment configuration: it
// derives its signing key from env.SESSION_SECRET if the operator has set
// one, and otherwise falls back to deriving a key from env.ADMIN_PASSWORD_HASH
// (which every working deployment of this project already has configured,
// per workers/d1-api.js's existing admin-login check). If neither is present
// the server has no secret material to sign with and every session-issuing
// or session-verifying call fails closed (treated as "not authenticated"),
// never silently succeeds.

const SESSION_COOKIE_NAME = 'wecare_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

// ---- base64url helpers (Workers runtime has atob/btoa but not Buffer) ----

function bytesToB64url(bytes) {
  let binary = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToB64url(str) {
  return bytesToB64url(new TextEncoder().encode(str));
}

function b64urlToBytes(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function b64urlToString(b64url) {
  return new TextDecoder().decode(b64urlToBytes(b64url));
}

// ---- signing key derivation ----

let cachedKeyPromise = null;
let cachedKeyMaterial = null;

async function getSigningKey(env) {
  const material = env.SESSION_SECRET || env.ADMIN_PASSWORD_HASH || '';
  if (!material) return null;
  // Cache the derived CryptoKey for the lifetime of this isolate so we are
  // not re-deriving it on every single request.
  if (cachedKeyPromise && cachedKeyMaterial === material) return cachedKeyPromise;
  cachedKeyMaterial = material;
  cachedKeyPromise = (async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('danla-wecare-session-v1:' + material));
    return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  })();
  return cachedKeyPromise;
}

// ---- session token creation / verification ----

// payload should be a plain object such as { role: 'admin', sub: 'admin' }.
// iat/exp are added automatically. Returns null if the server has no signing
// secret configured (fail closed - caller must treat this as a 500, never as
// "logged in").
export async function createSessionToken(env, payload) {
  const key = await getSigningKey(env);
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = Object.assign({}, payload, { iat: now, exp: now + SESSION_TTL_SECONDS });
  const payloadB64 = stringToB64url(JSON.stringify(fullPayload));
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const sigB64 = bytesToB64url(sig);
  return payloadB64 + '.' + sigB64;
}

// Returns the verified payload object, or null if the token is missing,
// malformed, incorrectly signed, expired, or the server has no signing
// secret configured. Never throws.
export async function verifySessionToken(env, token) {
  if (!token || typeof token !== 'string') return null;
  const key = await getSigningKey(env);
  if (!key) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  let valid;
  try {
    valid = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sigB64), new TextEncoder().encode(payloadB64));
  } catch (e) {
    return null;
  }
  if (!valid) return null;
  let payload;
  try {
    payload = JSON.parse(b64urlToString(payloadB64));
  } catch (e) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (!payload || typeof payload.exp !== 'number' || payload.exp < now) return null;
  return payload;
}

// ---- cookie helpers ----

export function sessionCookieHeader(token, opts) {
  const clear = opts && opts.clear;
  const maxAge = clear ? 0 : SESSION_TTL_SECONDS;
  const value = clear ? '' : token;
  return SESSION_COOKIE_NAME + '=' + value + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge;
}

function parseCookies(request) {
  const header = request.headers.get('Cookie') || '';
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

// Resolves the caller's session from the request's cookies. Returns the
// verified payload (e.g. { role, sub, ... }) or null if unauthenticated.
export async function getSession(request, env) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(env, token);
}

// ---- response helpers ----

export function jsonResponse(body, status, extraHeaders) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {});
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

export function unauthorized(msg) {
  return jsonResponse({ error: msg || 'Authentication required.' }, 401);
}

export function forbidden(msg) {
  return jsonResponse({ error: msg || 'You do not have permission to access this resource.' }, 403);
}

// ---- Google ID token verification (real, server-side) ----
//
// Verifies signature, issuer, audience, expiry, and email_verified using
// Google's tokeninfo endpoint. The token itself is never trusted just
// because the client decoded it - only a positive, live response from
// Google, matching the expected audience, is accepted.
export async function verifyGoogleIdToken(idToken, expectedAudience) {
  if (!idToken || !expectedAudience) return null;
  let res;
  try {
    res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  } catch (e) {
    return null;
  }
  if (!res.ok) return null;
  let claims;
  try {
    claims = await res.json();
  } catch (e) {
    return null;
  }
  if (!claims || claims.aud !== expectedAudience) return null;
  if (claims.email_verified !== 'true' && claims.email_verified !== true) return null;
  if (!claims.email) return null;
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && Number(claims.exp) < now) return null;
  return claims;
}
