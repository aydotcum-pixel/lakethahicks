'use strict';
// Data store backed by Cloudflare D1 (SQLite). Locally the Node server passes a
// D1-compatible wrapper around node:sqlite, so both run the same code.
//
// Each request opens a snapshot: small collections (posts, studio login, sessions,
// messages, reader circle) are loaded once, read synchronously by the page views,
// and any changes are written back in one batch by commit() before the response.
// Counters and rate limits that many readers hit at once use atomic SQL instead.

let ALS = null;                       // AsyncLocalStorage instance, injected at start-up
function useAsyncLocalStorage(Ctor) { ALS = new Ctor(); }

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS docs (name TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, at TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, name TEXT, source TEXT, at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, n INTEGER NOT NULL, reset INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS uploads (name TEXT PRIMARY KEY, type TEXT NOT NULL, data TEXT NOT NULL, at TEXT NOT NULL)`,
];

function ctx() {
  const c = ALS && ALS.getStore();
  if (!c) throw new Error('store used outside a request');
  return c;
}

const now = () => new Date().toISOString();

// Run fn with a fresh per-request snapshot of the database.
async function withStore(db, fn) {
  const c = { db, docs: new Map(), dirty: new Set(), ops: [], messages: [], subscribers: [], butterflies: 0, loaded: false };
  return ALS.run(c, async () => { await open(); return fn(); });
}

let schemaReady = new WeakSet();
async function ensureSchema(db) {
  if (schemaReady.has(db)) return;
  await db.batch(SCHEMA.map(s => db.prepare(s)));
  schemaReady.add(db);
}

async function open() {
  const c = ctx();
  await ensureSchema(c.db);
  const [docs, bf, msgs, subs] = await c.db.batch([
    c.db.prepare('SELECT name, value FROM docs'),
    c.db.prepare("SELECT n FROM counters WHERE name = 'butterflies'"),
    c.db.prepare('SELECT id, at, read, data FROM messages ORDER BY at DESC LIMIT 5000'),
    c.db.prepare('SELECT email, name, source, at FROM subscribers ORDER BY at DESC'),
  ]);
  for (const r of docs.results) { try { c.docs.set(r.name, JSON.parse(r.value)); } catch { /* skip corrupt */ } }
  c.butterflies = (bf.results[0] && bf.results[0].n) || 0;
  c.messages = msgs.results.map(r => ({ ...JSON.parse(r.data), id: r.id, at: r.at, read: !!r.read }));
  c.subscribers = subs.results.map(r => ({ email: r.email, name: r.name || '', source: r.source || '', at: r.at }));
  c.loaded = true;
}

// Write every change made during this request.
async function commit() {
  const c = ctx();
  const stmts = [];
  for (const name of c.dirty) {
    stmts.push(c.db.prepare('INSERT INTO docs (name, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(name) DO UPDATE SET value = ?2, updated_at = ?3')
      .bind(name, JSON.stringify(c.docs.get(name)), now()));
  }
  for (const [sql, ...args] of c.ops) stmts.push(c.db.prepare(sql).bind(...args));
  c.dirty.clear(); c.ops = [];
  if (stmts.length) await c.db.batch(stmts);
}

function read(name, fallback) { const c = ctx(); return c.docs.has(name) ? structuredClone(c.docs.get(name)) : fallback; }
function write(name, value) { const c = ctx(); c.docs.set(name, structuredClone(value)); c.dirty.add(name); }

function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'entry';
}

// ---------------------------------------------------------------- posts
function allPosts() { return read('posts', []); }
function publishedPosts() {
  return allPosts().filter(p => p.status === 'published')
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}
function getPostBySlug(slug) { return publishedPosts().find(p => p.slug === slug); }
function getPost(id) { return allPosts().find(p => p.id === id); }

function uniqueSlug(base, ignoreId) {
  const posts = allPosts();
  let slug = slugify(base), n = 2;
  while (posts.some(p => p.slug === slug && p.id !== ignoreId)) slug = slugify(base) + '-' + n++;
  return slug;
}

function savePost(input) {
  const posts = allPosts();
  const t = now();
  let post = input.id ? posts.find(p => p.id === input.id) : null;
  if (!post) { post = { id: crypto.randomUUID(), createdAt: t }; posts.push(post); }
  const wasPublished = post.status === 'published';
  Object.assign(post, {
    title: String(input.title || '').trim().slice(0, 200) || 'Untitled entry',
    excerpt: String(input.excerpt || '').trim().slice(0, 400),
    tag: String(input.tag || '').trim().slice(0, 40) || 'Reflections',
    cover: String(input.cover || '').trim().slice(0, 300),
    pullQuote: String(input.pullQuote || '').trim().slice(0, 300),
    body: String(input.body || '').slice(0, 200000),
    status: input.status === 'published' ? 'published' : 'draft',
    updatedAt: t,
  });
  post.slug = uniqueSlug(input.slug || post.title, post.id);
  if (post.status === 'published' && !wasPublished) post.publishedAt = input.publishedAt || t;
  if (input.publishedAt) post.publishedAt = input.publishedAt;
  write('posts', posts);
  return post;
}
function deletePost(id) { write('posts', allPosts().filter(p => p.id !== id)); }

// ---------------------------------------------------------------- butterflies (atomic)
function butterflyCount() { return ctx().butterflies; }
async function addButterfly() {
  const c = ctx();
  const r = await c.db.prepare("INSERT INTO counters (name, n, updated_at) VALUES ('butterflies', 1, ?1) ON CONFLICT(name) DO UPDATE SET n = n + 1, updated_at = ?1 RETURNING n").bind(now()).first();
  c.butterflies = r ? r.n : c.butterflies + 1;
  return c.butterflies;
}

// ---------------------------------------------------------------- inbox
function addMessage(msg) {
  const c = ctx();
  const m = { ...msg, id: crypto.randomUUID(), at: now(), read: false };
  c.messages.unshift(m);
  const { id, at, read: r, ...data } = m;
  c.ops.push(['INSERT INTO messages (id, at, read, data) VALUES (?1, ?2, 0, ?3)', id, at, JSON.stringify(data)]);
}
function messages() { return ctx().messages.map(m => ({ ...m })); }
function markMessage(id, readFlag) {
  const c = ctx(); const m = c.messages.find(x => x.id === id); if (m) m.read = !!readFlag;
  c.ops.push(['UPDATE messages SET read = ?2 WHERE id = ?1', String(id || ''), readFlag ? 1 : 0]);
}
function deleteMessage(id) {
  const c = ctx(); c.messages = c.messages.filter(m => m.id !== id);
  c.ops.push(['DELETE FROM messages WHERE id = ?1', String(id || '')]);
}

// ---------------------------------------------------------------- reader circle
function addSubscriber(sub) {
  const c = ctx();
  const email = String(sub.email).toLowerCase();
  if (c.subscribers.some(s => s.email === email)) return false;
  const s = { email, name: sub.name || '', source: sub.source || '', at: now() };
  c.subscribers.unshift(s);
  c.ops.push(['INSERT OR IGNORE INTO subscribers (email, name, source, at) VALUES (?1, ?2, ?3, ?4)', s.email, s.name, s.source, s.at]);
  return true;
}
function subscribers() { return ctx().subscribers.map(s => ({ ...s })); }

// ---------------------------------------------------------------- rate limits (atomic)
async function hit(key, windowMs) {
  const t = Date.now();
  const r = await ctx().db.prepare(
    'INSERT INTO rate_limits (key, n, reset) VALUES (?1, 1, ?3) ON CONFLICT(key) DO UPDATE SET n = CASE WHEN reset < ?2 THEN 1 ELSE n + 1 END, reset = CASE WHEN reset < ?2 THEN ?3 ELSE reset END RETURNING n'
  ).bind(key, t, t + windowMs).first();
  return r ? r.n : 1;
}
async function clearHits(key) { await ctx().db.prepare('DELETE FROM rate_limits WHERE key = ?1').bind(key).run(); }

// ---------------------------------------------------------------- photos
async function saveUpload(name, type, base64) {
  await ctx().db.prepare('INSERT INTO uploads (name, type, data, at) VALUES (?1, ?2, ?3, ?4)').bind(name, type, base64, now()).run();
}
async function getUpload(name) {
  return ctx().db.prepare('SELECT type, data FROM uploads WHERE name = ?1').bind(name).first();
}

module.exports = {
  SCHEMA, useAsyncLocalStorage, withStore, commit, read, write, slugify,
  allPosts, publishedPosts, getPost, getPostBySlug, savePost, deletePost,
  butterflyCount, addButterfly, addMessage, messages, markMessage, deleteMessage, addSubscriber, subscribers,
  hit, clearHits, saveUpload, getUpload,
};
