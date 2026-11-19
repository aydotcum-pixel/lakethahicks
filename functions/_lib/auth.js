// Shared auth helpers for the Laketha Hicks admin API.
// Server side only. No password, hash or salt ever leaves this file
// or the D1 database. Nothing here is served to a browser.

export const PBKDF2_ITERATIONS = 15000;
export const SESSION_COOKIE = '__Host-laketha_session';
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_LOGIN_FAILURES = 5;
export const LOCKOUT_BASE_MS = 15 * 60 * 1000; // 15 minutes, doubling

const enc = new TextEncoder();

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

export function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Byte-wise compare so a wrong password does not fail faster than a right one.
export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, saltHex, expectedHex) {
  const got = await hashPassword(password, saltHex);
  return constantTimeEqual(got, expectedHex);
}

export function parseCookies(request) {
  const out = {};
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export function sessionCookieHeader(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function createSession(env, userId) {
  const token = randomHex(32);
  const csrfToken = randomHex(16);
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(await sha256Hex(token), userId, csrfToken, now + SESSION_TTL_MS, now)
    .run();
  return { token, csrfToken };
}

export async function validateSession(env, request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?')
    .bind(await sha256Hex(token), Date.now())
    .first();
  if (!row) return null;
  const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?')
    .bind(row.user_id)
    .first();
  if (!user) return null;
  return { user, session: row, csrfToken: row.csrf_token, token };
}

export async function deleteSession(env, request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return;
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(token)).run();
}

export async function deleteAllSessions(env, userId) {
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

// Returns { user, csrfToken } or a 401 Response.
export async function requireAuth(env, request) {
  const session = await validateSession(env, request);
  if (!session) return json({ ok: false, error: 'Not logged in.' }, 401);
  return { user: session.user, csrfToken: session.csrfToken, session };
}

// CSRF: the per-session token must be sent as X-CSRF-Token, and if the
// browser sends an Origin it must be one of our own hosts.
export function checkCsrf(request, csrfToken) {
  const origin = request.headers.get('Origin');
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch { return false; }
    const allowed = ['lakethahicks.com', 'www.lakethahicks.com', 'lakethahicks.pages.dev'];
    if (!allowed.includes(host) && !host.endsWith('.lakethahicks.pages.dev')) return false;
  }
  const sent = request.headers.get('X-CSRF-Token') || '';
  return sent.length > 0 && constantTimeEqual(sent, csrfToken);
}

// ---- Login rate limiting (D1 table login_attempts) ----

export async function getAttempt(env, email, ipHash) {
  return env.DB.prepare('SELECT * FROM login_attempts WHERE email = ? AND ip_hash = ?')
    .bind(email, ipHash)
    .first();
}

export async function recordLoginFailure(env, email, ipHash) {
  const now = Date.now();
  const row = await getAttempt(env, email, ipHash);
  const attempts = (row ? row.attempts : 0) + 1;
  let lockedUntil = 0;
  if (attempts >= MAX_LOGIN_FAILURES) {
    const doublings = attempts - MAX_LOGIN_FAILURES;
    const minutes = 15 * Math.pow(2, doublings);
    lockedUntil = now + Math.min(minutes, 24 * 60) * 60 * 1000;
  }
  await env.DB.prepare(
    `INSERT INTO login_attempts (email, ip_hash, attempts, locked_until, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email, ip_hash) DO UPDATE SET attempts = ?, locked_until = ?, updated_at = ?`
  )
    .bind(email, ipHash, attempts, lockedUntil, now, attempts, lockedUntil, now)
    .run();
  return { attempts, lockedUntil };
}

export async function clearLoginAttempts(env, email, ipHash) {
  await env.DB.prepare('DELETE FROM login_attempts WHERE email = ? AND ip_hash = ?')
    .bind(email, ipHash)
    .run();
}

// ---- Posts ----

export function slugify(title) {
  const slug = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'post';
}

export async function uniqueSlug(env, base) {
  let slug = base;
  let n = 2;
  for (;;) {
    const row = await env.DB.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first();
    if (!row) return slug;
    slug = `${base}-${n++}`;
  }
}

export function validatePostInput(input) {
  const title = String(input?.title || '').trim();
  const body = String(input?.body || '').trim();
  const date = String(input?.date || '').trim();
  if (!title || title.length > 200) return { error: 'Please add a title of 1 to 200 characters.' };
  if (!body || body.length > 20000) return { error: 'Please write your post, up to 20000 characters.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Please choose a valid date.' };
  const d = new Date(date + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return { error: 'Please choose a valid date.' };
  return { title, body, date };
}

export function publicPost(row) {
  return { id: row.id, slug: row.slug, title: row.title, body: row.body, post_date: row.post_date };
}
