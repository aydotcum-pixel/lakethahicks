#!/usr/bin/env node
'use strict';
// End-to-end smoke test: runs the server against a temporary data folder and
// checks public pages, the studio login, posting, security rules and APIs.
const fs = require('fs'), os = require('os'), path = require('path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-test-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.PORT = '0';
const auth = require('../lib/auth');
const store = require('../lib/store');
const { server, DB } = require('../server');

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name); } };

server.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (p, o = {}) => fetch(base + p, { redirect: 'manual', ...o });
  try {
    console.log('Public pages');
    for (const p of ['/', '/books', '/books/redemption', '/books/redemptions-journey', '/devotional', '/about', '/speaking', '/press', '/journal', '/contact', '/journal/faith-for-the-season-you-are-in', '/journal/the-story-behind-the-covers', '/studies', '/studies/chosen', '/journal/why-i-wrote-redemptions-journey', '/journal/rss.xml', '/sitemap.xml', '/robots.txt']) {
      const r = await get(p); ok(r.status === 200, `${p} → 200`);
    }
    ok((await get('/nope')).status === 404, '/nope → 404');
    ok((await get('/blog')).headers.get('location') === '/journal', '/blog redirects to /journal');
    ok((await get('/css/../../server.js')).status !== 200, 'path traversal blocked');
    const home = await (await get('/')).text();
    ok(home.includes('Release a butterfly') && home.includes('Faith for the Season You Are In'), 'home shows butterfly + latest posts');

    console.log('APIs');
    const b1 = await (await get('/api/butterfly', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
    ok(b1.count === 1, 'butterfly count increments');
    ok((await get('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'bad' }) })).status === 400, 'subscribe rejects bad email');
    ok((await get('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'reader@example.com', name: 'Ruth', source: 'test' }) })).status === 200, 'subscribe works');
    ok((await get('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ann', email: 'ann@example.com', message: 'Hello <script>alert(1)</script>', type: 'A reader note' }) })).status === 200, 'contact works');

    console.log('Studio security');
    ok((await get('/admin')).headers.get('location')?.startsWith('/admin/login'), '/admin requires login');
    ok((await get('/admin/posts/save', { method: 'POST' })).headers.get('location')?.startsWith('/admin/login'), 'POST without session is refused');
    await store.withStore(DB, async () => { await auth.setAdmin('laketha@example.com', 'butterfly-blue-2026'); await store.commit(); });
    const bad = await get('/admin/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=laketha@example.com&password=wrong-password' });
    ok(bad.status === 401, 'wrong password refused');
    const login = await get('/admin/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=Laketha@Example.com&password=butterfly-blue-2026&next=/admin' });
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    ok(login.status === 303 && /HttpOnly/.test(login.headers.get('set-cookie')), 'correct password signs in with HttpOnly cookie');
    const dash = await (await get('/admin', { headers: { cookie } })).text();
    ok(dash.includes('Laketha'), 'dashboard loads');
    const csrf = dash.match(/data-csrf="([a-f0-9]+)"/)[1];
    const noCsrf = await get('/admin/posts/save', { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: 'title=x&status=published' });
    ok(noCsrf.status === 403, 'missing CSRF token refused');

    console.log('Posting');
    const form = new URLSearchParams({ csrf, title: 'A Test of Grace', tag: 'Faith', excerpt: 'Short summary', body: 'First paragraph with **bold**.\n\nSecond paragraph.\n\n<script>alert(1)</script>', pullQuote: 'Grace is enough', status: 'published', cover: 'javascript:alert(1)' });
    const save = await get('/admin/posts/save', { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: form.toString() });
    ok(save.status === 303, 'publish redirects');
    const pub = await get('/journal/a-test-of-grace');
    const html = await pub.text();
    ok(pub.status === 200 && html.includes('<strong>bold</strong>'), 'published post is live with formatting');
    ok(!html.includes('<script>alert(1)</script>') && !html.includes('javascript:alert'), 'scripts and bad links are neutralised');
    ok(html.includes('Grace is enough'), 'pull quote rendered');
    const id = save.headers.get('location').match(/posts\/([0-9a-f-]{36})/)[1];
    const draft = new URLSearchParams({ csrf, id, title: 'A Test of Grace', body: 'Now a draft', status: 'draft' });
    await get('/admin/posts/save', { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: draft.toString() });
    ok((await get('/journal/a-test-of-grace')).status === 404, 'drafts are hidden from the public');
    const prev = await (await get('/admin/preview', { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ body: '## Hi' }) })).json();
    ok(prev.html === '<h2>Hi</h2>', 'live preview works');
    console.log('Weekly studies');
    const chosen = await (await get('/studies/chosen')).text();
    ok(chosen.includes('Thought to ponder') && chosen.includes('biblegateway.com/passage/?search=Luke%2019%3A1-10'), 'study page shows thought and Scripture links');
    ok((await get('/admin/studies', { headers: { cookie } })).status === 200, 'studies list in studio');
    const sf = new URLSearchParams({ csrf, word: 'Restored', definitions: 'Brought back\nMade new', day0: 'Monday', ref0: 'Joel 2:25-27', day1: 'Tuesday', ref1: 'Psalm 23', thought: 'God restores <b>more</b> than was lost.', status: 'published' });
    const ss = await get('/admin/studies/save', { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: sf.toString() });
    ok(ss.status === 303, 'new study saves');
    const rs = await (await get('/studies/restored')).text();
    ok(rs.includes('Joel 2:25-27') && !rs.includes('<b>more</b>'), 'new study is live and escaped');
    ok((await (await get('/studies')).text()).includes('Restored'), 'studies page lists the new study');
    const png = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64');
    const up = await (await get('/admin/upload', { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ data: png }) })).json();
    ok(/^\/uploads\/[\w-]+\.png$/.test(up.url || ''), 'photo upload works');
    const fake = await get('/admin/upload', { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ data: 'data:image/png;base64,' + Buffer.from('<svg onload=alert(1)>').toString('base64') }) });
    ok(fake.status === 400, 'non-image upload refused');
    ok((await get(up.url)).status === 200, 'uploaded photo is served');
    const inbox = await (await get('/admin/inbox', { headers: { cookie } })).text();
    ok(inbox.includes('Ann') && !inbox.includes('<script>alert(1)'), 'inbox shows messages safely');
    ok((await get('/admin/readers.csv', { headers: { cookie } })).status === 200, 'reader CSV downloads');
    const del = new URLSearchParams({ csrf, id });
    await get('/admin/posts/delete', { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: del.toString() });
    ok(!(await (await get('/admin/posts', { headers: { cookie } })).text()).includes('A Test of Grace'), 'delete works');
    const out = await get('/admin/logout', { method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: 'csrf=' + csrf });
    ok(out.status === 303, 'log out');
    ok((await get('/admin', { headers: { cookie } })).status === 303, 'old session no longer works');
    for (let i = 0; i < 7; i++) await get('/admin/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=x@y.z&password=nope-nope-nope' });
    ok((await get('/admin/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=x@y.z&password=nope' })).status === 429, 'login attempts are rate limited');
    console.log('Cloudflare port');
    const b2 = await (await get('/api/butterfly')).json();
    ok(b2.count === 1, 'butterfly count persists in the database');
    const big = 'data:image/jpeg;base64,/9j/' + 'A'.repeat(2000000);
    ok((await get('/admin/upload', { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify({ data: big }) })).status === 303, 'oversized upload needs a session');
    ok((await get('/uploads/../../x.png')).status === 404, 'upload path traversal blocked');
    ok((await get('/', { method: 'HEAD' })).status === 200, 'HEAD works');
  } catch (e) { fail++; console.error(e); }
  console.log(`\n${pass} passed, ${fail} failed`);
  server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(fail ? 1 : 0);
});
