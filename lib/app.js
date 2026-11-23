'use strict';
// The whole site as one fetch handler: (Request, env) -> Response.
// Used by the Cloudflare Worker (worker.js) and by the local Node server (server.js).
// Static files (/css, /js, /assets) are served before this runs, by Cloudflare's
// asset handling in production and by server.js locally.
const store = require('./store');
const auth = require('./auth');
const { seedPosts, seedStudies } = require('./content');
const { configure, config } = require('./config');
const views = require('./views');
const admin = require('./admin-views');
const { render } = require('./markdown');

const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data:", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join('; ');
const SECURITY = { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };

const send = (status, body, type = 'text/html; charset=utf-8', extra = {}) => new Response(body, { status, headers: { 'Content-Type': type, ...SECURITY, ...(config.NOINDEX ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}), ...extra } });
const json = (status, obj, extra) => send(status, JSON.stringify(obj), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store', ...extra });
const redirect = (to, extra = {}) => new Response(null, { status: 303, headers: { Location: to, ...extra } });
const httpError = (status, message) => Object.assign(new Error(message), { status });

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const clean = (v, n) => String(v ?? '').trim().slice(0, n);
const isSecure = (request, url) => url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
const ip = request => request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'local';

async function parseBody(request, limit = 200 * 1024) {
  const len = +request.headers.get('content-length') || 0;
  if (len > limit) throw httpError(413, 'Too large');
  const raw = await request.text();
  if (raw.length > limit) throw httpError(413, 'Too large');
  const ct = String(request.headers.get('content-type') || '');
  if (ct.includes('application/json')) { try { return JSON.parse(raw || '{}'); } catch { return {}; } }
  return Object.fromEntries(new URLSearchParams(raw));
}

// ---------------------------------------------------------------- photo upload
// Photos are kept in D1 as base64 (D1 rows hold up to 2 MB, so the studio
// resizes photos in the browser to stay well under that).
const MAX_B64 = 1900000;
const SIGS = [
  ['image/jpeg', '.jpg', b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/png', '.png', b => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)],
  ['image/webp', '.webp', b => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP'],
];
const TYPES = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

async function saveImage(dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw httpError(400, 'Please choose a JPG, PNG or WebP photo.');
  if (m[2].length > MAX_B64) throw httpError(413, 'That photo is too large. Please choose a smaller one.');
  const head = Uint8Array.from(atob(m[2].slice(0, 24)), ch => ch.charCodeAt(0));
  const sig = SIGS.find(([, , test]) => test(head));
  if (!sig) throw httpError(400, 'That file does not look like a photo.');
  const rand = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
  const name = new Date().toISOString().slice(0, 7) + '-' + rand + sig[1];
  await store.saveUpload(name, sig[0], m[2]);
  return '/uploads/' + name;
}

async function serveUpload(name) {
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return null;
  const row = await store.getUpload(name);
  if (!row) return null;
  const bin = atob(row.data); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { status: 200, headers: { 'Content-Type': row.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}

const flashText = { saved: 'Saved.', published: 'Published. Your entry is live on the website.', draft: 'Saved as a draft. Only you can see it.', deleted: 'Deleted.', password: 'Your password has been updated.', welcome: 'Welcome back.' };

// ---------------------------------------------------------------- entry point
async function handle(request, env = {}) {
  configure(env);
  if (!env.DB) return send(500, 'The site database is not connected (missing DB binding).', 'text/plain; charset=utf-8');
  return store.withStore(env.DB, async () => {
    try {
      if (seedPosts() | seedStudies()) await store.commit();
      if (!auth.adminExists() && env.ADMIN_EMAIL && env.ADMIN_PASSWORD) { await auth.setAdmin(env.ADMIN_EMAIL, env.ADMIN_PASSWORD); await store.commit(); }
      const res = await route(request, env);
      await store.commit();
      if (request.method === 'HEAD') return new Response(null, { status: res.status, headers: res.headers });
      return res;
    } catch (err) {
      if (!err.status || err.status >= 500) console.error(err);
      return send(err.status || 500, err.status === 413 ? 'That upload is too large.' : 'Something went wrong. Please try again.', 'text/plain; charset=utf-8');
    }
  });
}

async function route(request, env) {
  const url = new URL(request.url);
  const p = url.pathname;
  const method = request.method === 'HEAD' ? 'GET' : request.method;
  // one address for readers and search engines: www.lakethahicks.com
  const canon = new URL(config.SITE_URL).host;
  if ((method === 'GET') && (url.host === 'lakethahicks.com' || url.host === 'new.lakethahicks.com') && canon !== url.host)
    return new Response(null, { status: 301, headers: { Location: config.SITE_URL + p + url.search, 'Cache-Control': 'public, max-age=3600' } });
  if (p.length > 1 && p.endsWith('/')) return redirect(p.slice(0, -1) + url.search);

  if (method === 'GET' && p.startsWith('/uploads/')) { const r = await serveUpload(p.slice(9)); if (r) return r; return send(404, views.notFound()); }
  if (p === '/robots.txt') return send(200, `User-agent: *\n${config.NOINDEX ? 'Disallow: /' : 'Disallow: /admin'}\nSitemap: ${config.SITE_URL}/sitemap.xml\n`, 'text/plain; charset=utf-8');
  if (p === '/sitemap.xml') return send(200, views.sitemap(), 'application/xml; charset=utf-8');
  if (p === '/journal/rss.xml') return send(200, views.rss(), 'application/rss+xml; charset=utf-8');

  // ---------------- public API
  if (p === '/api/butterfly') {
    if (method === 'GET') return json(200, { count: store.butterflyCount() });
    if (method === 'POST') {
      if (!(await auth.rateLimit('bf:' + ip(request), 40, 60e3))) return json(429, { count: store.butterflyCount() });
      return json(200, { count: await store.addButterfly() });
    }
  }
  if (p === '/api/subscribe' && method === 'POST') {
    const b = await parseBody(request);
    if (b.website) return json(200, { ok: true });
    if (!(await auth.rateLimit('sub:' + ip(request), 8, 60 * 60e3))) return json(429, { error: 'Too many tries. Please wait a little and try again.' });
    const email = clean(b.email, 200);
    if (!EMAIL_RE.test(email)) return json(400, { error: 'Please enter a valid email address.' });
    store.addSubscriber({ email, name: clean(b.name, 80), source: clean(b.source, 40) });
    return json(200, { ok: true });
  }
  if (p === '/api/contact' && method === 'POST') {
    const b = await parseBody(request, 64 * 1024);
    if (b.website) return json(200, { ok: true });
    if (!(await auth.rateLimit('msg:' + ip(request), 6, 60 * 60e3))) return json(429, { error: 'Too many messages. Please wait a little and try again.' });
    const email = clean(b.email, 200), message = clean(b.message, 5000), name = clean(b.name, 120);
    if (!name) return json(400, { error: 'Please tell Laketha your name.' });
    if (!EMAIL_RE.test(email)) return json(400, { error: 'Please enter a valid email address.' });
    if (message.length < 2) return json(400, { error: 'Please write a short message.' });
    const msg = { type: clean(b.type, 60) || 'Message', name, email, message, gathering: clean(b.gathering, 60), group: clean(b.group, 160), date: clean(b.date, 80) };
    store.addMessage(msg);
    if (typeof env.notify === 'function') { try { env.notify(msg); } catch (err) { console.error(err); } }
    return json(200, { ok: true });
  }

  // ---------------- studio (admin)
  if (p === '/admin' || p.startsWith('/admin/')) return handleAdmin(request, url, p, method);

  // ---------------- public pages
  if (method !== 'GET') return send(405, 'Method not allowed', 'text/plain');
  const pages = { '/': views.home, '/books': views.books, '/devotional': views.devotional, '/about': views.about, '/speaking': views.speaking, '/journal': views.journal };
  if (pages[p]) return send(200, pages[p]());
  if (p === '/contact') return send(200, views.contact(Object.fromEntries(url.searchParams)));
  if (p === '/studies') return send(200, views.studies());
  if (p === '/blog') return redirect('/journal');
  const MOVED = { '/journal/why-i-wrote-redemption-and-redemptions-journey': '/journal/why-i-wrote-redemptions-journey' };
  if (MOVED[p]) return new Response(null, { status: 301, headers: { Location: MOVED[p] } });
  let m;
  if ((m = p.match(/^\/books\/([a-z0-9-]+)$/))) { const html = views.bookDetail(m[1]); if (html) return send(200, html); }
  if ((m = p.match(/^\/studies\/([a-z0-9-]+)$/))) { const st = store.getStudyBySlug(m[1]); if (st) return send(200, views.study(st)); }
  if ((m = p.match(/^\/(?:journal|blog)\/([a-z0-9-]+)$/))) {
    const post = store.getPostBySlug(m[1]);
    if (post) return p.startsWith('/blog') ? redirect('/journal/' + post.slug) : send(200, views.post(post));
  }
  return send(404, views.notFound());
}

async function handleAdmin(request, url, p, method) {
  const noStore = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  const secure = isSecure(request, url);
  if (p === '/admin/login') {
    if (method === 'GET') {
      if (await auth.getSession(request)) return redirect('/admin');
      return send(200, admin.login({ configured: auth.adminExists(), next: url.searchParams.get('next') || '/admin' }), undefined, noStore);
    }
    if (method === 'POST') {
      const b = await parseBody(request);
      const key = 'login:' + ip(request);
      const next = /^\/admin(\/[\w\-/]*)?$/.test(b.next || '') ? b.next : '/admin';
      if (!(await auth.rateLimit(key, 6, 15 * 60e3))) return send(429, admin.login({ error: 'Too many sign-in attempts. Please wait 15 minutes and try again.', email: b.email, next }), undefined, noStore);
      const ok = await auth.verify(b.email || '', b.password || '');
      if (!ok) return send(401, admin.login({ error: 'That email and password don’t match. Please try again.', email: b.email, configured: auth.adminExists(), next }), undefined, noStore);
      await auth.clearLimit(key);
      const token = await auth.createSession();
      return redirect(next + (next.includes('?') ? '&' : '?') + 'm=welcome', { 'Set-Cookie': auth.cookieHeader(token, secure) });
    }
  }

  const s = await auth.getSession(request);
  if (!s) return redirect('/admin/login?next=' + encodeURIComponent(p));
  const flash = flashText[url.searchParams.get('m')] || '';
  const csrf = s.csrf;

  if (method === 'POST') {
    const isJson = String(request.headers.get('content-type') || '').includes('application/json');
    const b = await parseBody(request, p === '/admin/upload' ? 2.5 * 1024 * 1024 : 512 * 1024);
    const token = isJson ? request.headers.get('x-csrf-token') : b.csrf;
    if (!auth.checkCsrf(s, token)) return isJson ? json(403, { error: 'Your session expired. Please reload the page.' }) : send(403, 'Your session expired. Please go back and reload the page.', 'text/plain; charset=utf-8');

    if (p === '/admin/logout') { await auth.destroySession(request); return redirect('/admin/login', { 'Set-Cookie': auth.cookieHeader('', secure) }); }
    if (p === '/admin/preview') return json(200, { html: render(b.body || '') });
    if (p === '/admin/upload') {
      try { return json(200, { url: await saveImage(b.data) }); }
      catch (e) { return json(e.status || 500, { error: e.status ? e.message : 'Upload failed.' }); }
    }
    if (p === '/admin/posts/save') {
      if (!clean(b.title, 200)) return send(400, admin.editor({ csrf, post: { ...b, id: b.id || undefined }, error: 'Please give your entry a title.' }), undefined, noStore);
      const coverOk = !b.cover || /^\/(uploads|assets)\/[\w.\-]+$/.test(b.cover);
      const post = store.savePost({ id: b.id || undefined, title: b.title, slug: b.slug, tag: b.tag, excerpt: b.excerpt, cover: coverOk ? b.cover : '', pullQuote: b.pullQuote, body: b.body, status: b.status, publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(b.publishedAt || '') ? new Date(b.publishedAt + 'T15:00:00Z').toISOString() : undefined });
      return redirect(`/admin/posts/${post.id}?m=${post.status === 'published' ? 'published' : 'draft'}`);
    }
    if (p === '/admin/studies/save') {
      if (!clean(b.word, 80)) return send(400, admin.studyEditor({ csrf, study: null, error: 'Please give the study its word for the week.' }), undefined, noStore);
      const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const readings = DAYS.map((d, i) => [clean(b['day' + i], 20) || d, clean(b['ref' + i], 120), clean(b['label' + i], 120)]).filter(([, r]) => r);
      const definitions = String(b.definitions || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.{1,60}?)\s*[*:]\s+(.+)$/); return m ? [m[1].trim(), m[2].trim()] : ['', l]; });
      const prev = b.id ? store.getStudy(b.id) : null;
      const st = store.saveStudy({ id: b.id || undefined, word: b.word, subtitle: b.subtitle, slug: b.slug, definitions, readings, thought: b.thought, thoughtCite: b.thoughtCite, note: b.note, status: b.status,
        keyVerse: { ref: b.kvRef, version: b.kvVer, text: b.kvText }, closingVerse: { ref: b.cvRef, version: b.cvVer, text: b.cvText }, secondThought: { text: b.q2, cite: b.q2By },
        publishedAt: prev ? prev.publishedAt : undefined });
      return redirect(`/admin/studies/${st.id}?m=${st.status === 'published' ? 'published' : 'draft'}`);
    }
    if (p === '/admin/studies/delete') { store.deleteStudy(b.id); return redirect('/admin/studies?m=deleted'); }
    if (p === '/admin/posts/delete') { store.deletePost(b.id); return redirect('/admin/posts?m=deleted'); }
    if (p === '/admin/inbox/mark') { store.markMessage(b.id, b.read === '1'); return redirect('/admin/inbox#m-' + encodeURIComponent(b.id)); }
    if (p === '/admin/inbox/delete') { store.deleteMessage(b.id); return redirect('/admin/inbox?m=deleted'); }
    if (p === '/admin/settings/password') {
      const a = store.read('admin', {});
      if (!(await auth.verify(a.email, b.current || ''))) return send(400, admin.settings({ csrf, error: 'Your current password isn’t right.' }), undefined, noStore);
      if ((b.next || '') !== (b.confirm || '')) return send(400, admin.settings({ csrf, error: 'The new passwords don’t match.' }), undefined, noStore);
      try { await auth.setAdmin(a.email, b.next, a.name); } catch (e) { return send(400, admin.settings({ csrf, error: e.message }), undefined, noStore); }
      return redirect('/admin/settings?m=password');
    }
    return send(404, 'Not found', 'text/plain');
  }

  if (p === '/admin') return send(200, admin.dashboard({ csrf, flash }), undefined, noStore);
  if (p === '/admin/posts') return send(200, admin.postsList({ csrf, flash }), undefined, noStore);
  if (p === '/admin/posts/new') return send(200, admin.editor({ csrf, flash }), undefined, noStore);
  let m;
  if ((m = p.match(/^\/admin\/posts\/([0-9a-f-]{36})$/))) {
    const post = store.getPost(m[1]);
    if (post) return send(200, admin.editor({ csrf, post, flash }), undefined, noStore);
  }
  if (p === '/admin/studies') return send(200, admin.studiesList({ csrf, flash }), undefined, noStore);
  if (p === '/admin/studies/new') return send(200, admin.studyEditor({ csrf, flash }), undefined, noStore);
  if ((m = p.match(/^\/admin\/studies\/([0-9a-f-]{36})$/))) {
    const st = store.getStudy(m[1]);
    if (st) return send(200, admin.studyEditor({ csrf, study: st, flash }), undefined, noStore);
  }
  if (p === '/admin/inbox') return send(200, admin.inbox({ csrf, flash }), undefined, noStore);
  if (p === '/admin/readers') return send(200, admin.readers({ csrf, flash }), undefined, noStore);
  if (p === '/admin/readers.csv') {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""').replace(/^[=+\-@]/, "'$&") + '"';
    const csv = 'name,email,source,joined\n' + store.subscribers().map(x => [x.name, x.email, x.source, x.at].map(q).join(',')).join('\n');
    return send(200, csv, 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="reader-circle.csv"', ...noStore });
  }
  if (p === '/admin/settings') return send(200, admin.settings({ csrf, flash }), undefined, noStore);
  return send(404, views.notFound());
}

module.exports = { handle, TYPES };
