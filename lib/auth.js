'use strict';
// Studio authentication using Web Crypto (works on Cloudflare Workers and Node 20+):
// PBKDF2-SHA256 password hashes, random session tokens stored server-side as
// SHA-256 hashes, HttpOnly cookies, per-session CSRF tokens, login rate limiting.
const store = require('./store');

const SESSION_DAYS = 14;
const COOKIE = 'lh_admin';
const ITER = 100000;               // Workers' PBKDF2 maximum
const enc = new TextEncoder();

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const randHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
async function sha(t) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(String(t)))); }

// Constant-time comparison of two strings.
function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function hashPassword(password, salt = randHex(16), iter = ITER) {
  const key = await crypto.subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: iter }, key, 256);
  return { salt, hash: hex(bits), iter };
}

async function setAdmin(email, password, name) {
  if (String(password).length < 10) throw new Error('Password must be at least 10 characters.');
  const { salt, hash, iter } = await hashPassword(password);
  store.write('admin', { email: String(email).trim().toLowerCase(), name: name || 'Laketha', salt, hash, iter, algo: 'pbkdf2-sha256', updatedAt: new Date().toISOString() });
}

function adminExists() { return !!store.read('admin', null); }

async function verify(email, password) {
  const admin = store.read('admin', null);
  // Always hash so the response time does not reveal whether a login exists.
  const { hash } = await hashPassword(password, admin ? admin.salt : 'no-admin-salt-padding', admin ? admin.iter || ITER : ITER);
  if (!admin) return null;
  const emailOk = safeEqual(await sha(String(email).trim().toLowerCase()), await sha(admin.email));
  return emailOk && safeEqual(hash, admin.hash) ? admin : null;
}

// ---------------------------------------------------------------- sessions
const sessions = () => store.read('sessions', {});

async function createSession() {
  const token = randHex(32);
  const all = sessions();
  const t = Date.now();
  for (const [k, v] of Object.entries(all)) if (v.expires < t) delete all[k];
  all[await sha(token)] = { csrf: randHex(24), expires: t + SESSION_DAYS * 864e5, created: t };
  store.write('sessions', all);
  return token;
}

async function getSession(request) {
  const token = parseCookies(request)[COOKIE];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const s = sessions()[await sha(token)];
  if (!s || s.expires < Date.now()) return null;
  return { ...s, token };
}

async function destroySession(request) {
  const token = parseCookies(request)[COOKIE];
  if (!token) return;
  const all = sessions(); delete all[await sha(token)]; store.write('sessions', all);
}

function cookieHeader(token, secure) {
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${token ? SESSION_DAYS * 86400 : 0}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function parseCookies(request) {
  const out = {};
  for (const part of String(request.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) { try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore bad cookie */ } }
  }
  return out;
}

function checkCsrf(session, token) { return !!(session && token) && safeEqual(session.csrf, token); }

// ---------------------------------------------------------------- rate limiting (stored in D1)
async function rateLimit(key, max, windowMs) { return (await store.hit(key, windowMs)) <= max; }
async function clearLimit(key) { await store.clearHits(key); }

module.exports = { setAdmin, adminExists, verify, createSession, getSession, destroySession, cookieHeader, checkCsrf, rateLimit, clearLimit, hashPassword, safeEqual };
