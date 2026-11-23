'use strict';
const { esc, render } = require('./markdown');
const store = require('./store');
const { fmtDate, BF, A, MONO, MONO_BOLD } = require('./views');

const ICON = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  posts: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  inbox: '<path d="M4 4h16v12H4z"/><path d="M4 13h4l2 3h4l2-3h4"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15c3 0 6 1.5 6 5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6"/>',
  out: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h11"/>',
};
const icon = n => `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

function head(title) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>${esc(title)} · Laketha’s studio</title><link rel="icon" type="image/svg+xml" href="/assets/monogram-bold.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700;800&family=Pinyon+Script&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/admin.css?v=${require('./bundle').assetVersion}"></head>`;
}

function shell({ title, active, csrf, body, flash }) {
  const unread = store.messages().filter(m => !m.read).length;
  const items = [['/admin', 'Dashboard', 'home', 'dash'], ['/admin/posts', 'Journal entries', 'posts', 'posts'], ['/admin/posts/new', 'Write a new entry', 'plus', 'new'], ['/admin/studies', 'Weekly studies', 'book', 'studies'], ['/admin/inbox', 'Inbox', 'inbox', 'inbox'], ['/admin/readers', 'Reader circle', 'people', 'readers'], ['/admin/settings', 'Settings', 'gear', 'settings']];
  return `${head(title)}<body class="admin" data-csrf="${esc(csrf)}">
<a class="skip" href="#main">Skip to content</a>
<aside class="side">
  <a class="side-brand" href="/admin"><span class="side-mark">${MONO_BOLD}</span><span><span class="script">Laketha</span><span class="side-sub">Writing studio</span></span></a>
  <nav aria-label="Studio">${items.map(([h, l, ic, k]) => `<a href="${h}" class="${k === active ? 'active' : ''}"${k === active ? ' aria-current="page"' : ''}>${icon(ic)}<span>${l}</span>${k === 'inbox' && unread ? `<b class="badge-n">${unread}</b>` : ''}</a>`).join('')}</nav>
  <div class="side-foot">
    <a href="/" target="_blank" rel="noopener">${icon('eye')}<span>View the website</span></a>
    <form method="post" action="/admin/logout"><input type="hidden" name="csrf" value="${esc(csrf)}"><button type="submit">${icon('out')}<span>Log out</span></button></form>
  </div>
</aside>
<main id="main" class="main">
${flash ? `<div class="flash" role="status">${esc(flash)}</div>` : ''}
${body}
</main>
<script src="/js/admin.js?v=${require('./bundle').assetVersion}" defer></script>
</body></html>`;
}

function login({ error, email = '', configured = true, next = '/admin' }) {
  return `${head('Sign in')}<body class="login-page">
<main class="login">
  <section class="login-art" aria-hidden="true">
    <img src="${A.book}" alt="">
    <div class="login-quote"><p>“It is never too late to start again.”</p><span class="script">Laketha</span></div>
  </section>
  <section class="login-panel">
    <div class="login-card">
      <div class="login-brand"><span class="login-mark">${MONO}</span><span class="login-name">Laketha Hicks</span></div>
      <h1>Welcome back</h1>
      <p class="muted">Sign in to your writing studio to post a new journal entry.</p>
      ${!configured ? `<div class="alert">The studio password hasn’t been set yet. On the computer that runs the website, run <code>npm run set-password</code>.</div>` : ''}
      ${error ? `<div class="alert" role="alert">${esc(error)}</div>` : ''}
      <form method="post" action="/admin/login" class="stack-form">
        <input type="hidden" name="next" value="${esc(next)}">
        <label>Email<input type="email" name="email" value="${esc(email)}" required autocomplete="username" autofocus></label>
        <label>Password<span class="pw"><input type="password" name="password" required autocomplete="current-password" id="pw"><button type="button" class="pw-toggle" data-toggle-pw aria-controls="pw" aria-pressed="false">Show</button></span></label>
        <button class="btn" type="submit">Sign in</button>
      </form>
      <p class="fine"><a href="/">← Back to lakethahicks.com</a></p>
    </div>
  </section>
</main>
<script src="/js/admin.js?v=${require('./bundle').assetVersion}" defer></script>
</body></html>`;
}

function statusPill(p) { return p.status === 'published' ? '<span class="pill pill-live">Published</span>' : '<span class="pill pill-draft">Draft</span>'; }

function dashboard({ csrf, flash }) {
  const posts = store.allPosts().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const msgs = store.messages();
  const stats = [['Published entries', posts.filter(p => p.status === 'published').length, '/admin/posts'], ['Drafts', posts.filter(p => p.status !== 'published').length, '/admin/posts'], ['Unread messages', msgs.filter(m => !m.read).length, '/admin/inbox'], ['Reader circle', store.subscribers().length, '/admin/readers'], ['Butterflies released', store.butterflyCount(), '/']];
  const hour = +new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: require('./config').config.SITE_TZ }) % 24;
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const body = `<header class="page-top"><div><p class="eyebrow">Writing studio</p><h1>${greet}, Laketha.</h1><p class="muted">What would you like to share today?</p></div><a class="btn" href="/admin/posts/new">${icon('plus')} Write a new entry</a></header>
<section class="stats">${stats.map(([l, n, h]) => `<a class="stat" href="${h}"><b>${Number(n).toLocaleString('en-US')}</b><span>${l}</span></a>`).join('')}</section>
<div class="cols">
  <section class="card"><div class="card-head"><h2>Recent entries</h2><a href="/admin/posts">See all</a></div>
    ${posts.length ? `<ul class="list">${posts.slice(0, 5).map(p => `<li><a href="/admin/posts/${p.id}"><b>${esc(p.title)}</b><span class="muted">${p.status === 'published' ? 'Published ' + fmtDate(p.publishedAt) : 'Edited ' + fmtDate(p.updatedAt)}</span></a>${statusPill(p)}</li>`).join('')}</ul>` : '<p class="empty">No entries yet. Your first one is waiting.</p>'}
  </section>
  <section class="card"><div class="card-head"><h2>Latest messages</h2><a href="/admin/inbox">Open inbox</a></div>
    ${msgs.length ? `<ul class="list">${msgs.slice(0, 5).map(m => `<li><a href="/admin/inbox#m-${m.id}"><b>${esc(m.name || m.email)}</b><span class="muted">${esc(m.type || 'Message')} · ${fmtDate(m.at)}</span></a>${m.read ? '' : '<span class="pill pill-new">New</span>'}</li>`).join('')}</ul>` : '<p class="empty">No messages yet.</p>'}
  </section>
</div>
<section class="card tips"><h2>How to post a journal entry</h2><ol><li>Choose <b>Write a new entry</b>.</li><li>Give it a title, choose a theme, and write in the large box. The preview on the right shows how it will look.</li><li>Add a cover photo if you like.</li><li>Choose <b>Save draft</b> to keep working later, or <b>Publish</b> to share it on your website.</li></ol></section>`;
  return shell({ title: 'Dashboard', active: 'dash', csrf, flash, body });
}

function postsList({ csrf, flash }) {
  const posts = store.allPosts().sort((a, b) => (b.publishedAt || b.updatedAt || '').localeCompare(a.publishedAt || a.updatedAt || ''));
  const body = `<header class="page-top"><div><p class="eyebrow">Journal</p><h1>Your entries</h1></div><a class="btn" href="/admin/posts/new">${icon('plus')} Write a new entry</a></header>
<section class="card"><table class="table"><thead><tr><th scope="col">Title</th><th scope="col">Theme</th><th scope="col">Status</th><th scope="col">Date</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>
${posts.map(p => `<tr><td><a class="t-title" href="/admin/posts/${p.id}">${esc(p.title)}</a></td><td>${esc(p.tag)}</td><td>${statusPill(p)}</td><td>${fmtDate(p.publishedAt || p.updatedAt)}</td><td class="actions"><a href="/admin/posts/${p.id}">Edit</a>${p.status === 'published' ? `<a href="/journal/${esc(p.slug)}" target="_blank" rel="noopener">View</a>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No entries yet.</td></tr>'}
</tbody></table></section>`;
  return shell({ title: 'Journal entries', active: 'posts', csrf, flash, body });
}

const THEMES = ['Faith', 'Beginning again', 'The books', 'Healing', 'Purpose', 'Resilience', 'Reflections'];

function editor({ csrf, post, flash, error }) {
  const p = post || { title: '', slug: '', tag: 'Faith', excerpt: '', cover: '', pullQuote: '', body: '', status: 'draft' };
  const isNew = !p.id;
  const tags = [...new Set([...THEMES, ...store.allPosts().map(x => x.tag)])];
  const body = `<form method="post" action="/admin/posts/save" class="editor" data-editor>
<input type="hidden" name="csrf" value="${esc(csrf)}">
<input type="hidden" name="id" value="${esc(p.id || '')}">
<header class="page-top sticky-top">
  <div><p class="eyebrow"><a href="/admin/posts">Journal</a> / ${isNew ? 'New entry' : 'Edit entry'}</p><h1>${isNew ? 'Write a new entry' : esc(p.title)}</h1><p class="muted" data-save-state>${isNew ? 'Not saved yet' : (p.status === 'published' ? 'Published ' + fmtDate(p.publishedAt) : 'Draft') + ' · last saved ' + fmtDate(p.updatedAt)}</p></div>
  <div class="top-actions">
    ${!isNew && p.status === 'published' ? `<a class="btn btn-ghost" href="/journal/${esc(p.slug)}" target="_blank" rel="noopener">${icon('eye')} View</a>` : ''}
    <button class="btn btn-ghost" type="submit" name="status" value="draft">${p.status === 'published' ? 'Unpublish to draft' : 'Save draft'}</button>
    <button class="btn" type="submit" name="status" value="published">${p.status === 'published' ? 'Update' : 'Publish'}</button>
  </div>
</header>
${error ? `<div class="alert" role="alert">${esc(error)}</div>` : ''}
<div class="editor-grid">
  <div class="editor-main">
    <label class="title-field"><span class="sr">Title</span><input type="text" name="title" value="${esc(p.title)}" placeholder="Title of your entry" required maxlength="200" data-title></label>
    <div class="toolbar" role="toolbar" aria-label="Formatting">
      <button type="button" data-md="bold" title="Bold"><b>B</b></button>
      <button type="button" data-md="italic" title="Italic"><i>I</i></button>
      <button type="button" data-md="h2" title="Heading">H</button>
      <button type="button" data-md="quote" title="Quote">“ ”</button>
      <button type="button" data-md="list" title="Bulleted list">• List</button>
      <button type="button" data-md="link" title="Link">Link</button>
      <label class="tool-upload" title="Add a photo">Photo<input type="file" accept="image/jpeg,image/png,image/webp" data-insert-image hidden></label>
      <span class="tool-sep"></span>
      <button type="button" data-view="write" aria-pressed="true" class="view-btn">Write</button>
      <button type="button" data-view="preview" aria-pressed="false" class="view-btn">Preview</button>
    </div>
    <div class="write-preview" data-panes>
      <label class="body-field"><span class="sr">Your entry</span><textarea name="body" data-body placeholder="Begin writing here. Leave an empty line between paragraphs.">${esc(p.body)}</textarea></label>
      <div class="preview prose" data-preview aria-live="polite">${render(p.body) || '<p class="empty">Your preview will appear here as you write.</p>'}</div>
    </div>
    <p class="muted small">Tip: leave an empty line between paragraphs. Select words and press <b>B</b> or <i>I</i> to style them.</p>
  </div>
  <aside class="editor-side">
    <div class="card">
      <h2>Cover photo</h2>
      <div class="cover-drop" data-cover-drop>
        <img data-cover-img src="${esc(p.cover)}" alt=""${p.cover ? '' : ' hidden'}>
        <span class="cover-empty"${p.cover ? ' hidden' : ''}>${BF(40, '#9cc0ff', '#2451c7')}<span>Add a photo</span></span>
        <input type="file" accept="image/jpeg,image/png,image/webp" data-cover-file aria-label="Upload cover photo">
      </div>
      <input type="hidden" name="cover" value="${esc(p.cover)}" data-cover>
      <div class="cover-actions"><button type="button" class="link" data-cover-remove${p.cover ? '' : ' hidden'}>Remove photo</button></div>
      <p class="muted small">Or choose one of yours:</p>
      <div class="cover-picks">${[A.head, A.book, A.street, A.selfie, A.cov1, A.cov2].map(src => `<button type="button" data-pick="${src}" aria-label="Use this photo"><img src="${src}" alt=""></button>`).join('')}</div>
    </div>
    <div class="card">
      <h2>Details</h2>
      <label>Theme<input type="text" name="tag" list="themes" value="${esc(p.tag)}" maxlength="40"><datalist id="themes">${tags.map(t => `<option value="${esc(t)}">`).join('')}</datalist></label>
      <label>Short summary<textarea name="excerpt" rows="3" maxlength="400" placeholder="One or two sentences shown on the journal page.">${esc(p.excerpt)}</textarea></label>
      <label><span>Pull quote <span class="muted">(optional)</span></span><input type="text" name="pullQuote" value="${esc(p.pullQuote)}" maxlength="300" placeholder="A line to feature large in the middle"></label>
      <details><summary>Advanced</summary>
        <label>Web address<span class="prefix"><span>/journal/</span><input type="text" name="slug" value="${esc(p.slug)}" maxlength="80" placeholder="made from the title"></span></label>
        <label>Publish date<input type="date" name="publishedAt" value="${p.publishedAt ? esc(p.publishedAt.slice(0, 10)) : ''}"></label>
      </details>
    </div>
</aside>
</div>
</form>
${!isNew ? `<form method="post" action="/admin/posts/delete" class="danger-zone" data-confirm="Delete “${esc(p.title)}”? This cannot be undone."><input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="id" value="${esc(p.id)}"><button type="submit" class="btn btn-danger">Delete this entry</button></form>` : ''}`;
  return shell({ title: isNew ? 'New entry' : 'Edit entry', active: isNew ? 'new' : 'posts', csrf, flash, body });
}

// ---------------------------------------------------------------- weekly studies
function studiesList({ csrf, flash }) {
  const list = store.allStudies().sort((a, b) => (b.publishedAt || b.updatedAt || '').localeCompare(a.publishedAt || a.updatedAt || ''));
  // newest first
  const body = `<header class="page-top"><div><p class="eyebrow">Weekly studies</p><h1>Your studies</h1><p class="muted">Your lessons of the week: a subject, what it means, five days of Scripture and a thought to ponder.</p></div><a class="btn" href="/admin/studies/new">${icon('plus')} New study</a></header>
<section class="card"><table class="table"><thead><tr><th scope="col">Word</th><th scope="col">Readings</th><th scope="col">Status</th><th scope="col">Date</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>
${list.map(x => `<tr><td><a class="t-title" href="/admin/studies/${x.id}">${esc(x.word)}</a></td><td>${x.readings.length} days</td><td>${statusPill(x)}</td><td>${x.approxDate ? '2023' : fmtDate(x.publishedAt || x.updatedAt)}</td><td class="actions"><a href="/admin/studies/${x.id}">Edit</a>${x.status === 'published' ? `<a href="/studies/${esc(x.slug)}" target="_blank" rel="noopener">View</a>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No studies yet.</td></tr>'}
</tbody></table></section>`;
  return shell({ title: 'Weekly studies', active: 'studies', csrf, flash, body });
}

function studyEditor({ csrf, study, flash, error }) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const x = study || { word: '', subtitle: '', slug: '', definitions: [], readings: [], thought: '', thoughtCite: '', note: '', status: 'draft' };
  const isNew = !x.id;
  const defs = (x.definitions || []).map(d => Array.isArray(d) ? (d[0] ? d[0] + ' * ' + d[1] : d[1]) : d).join('\n');
  const kv = x.keyVerse || {}, cv = x.closingVerse || {}, st2 = x.secondThought || {};
  const ph = ['e.g. Jeremiah 1', 'e.g. Matthew 22:1-14', 'e.g. Luke 19:1-10', 'e.g. Luke 6:12-26', 'e.g. Isaiah 43:1-13', 'optional', 'optional'];
  const rows = DAYS.map((d, i) => { const r = x.readings[i] || [d, '', '']; return `<div class="day-row${i > 4 ? ' optional' : ''}"><input type="text" name="day${i}" value="${esc(r[0] || d)}" aria-label="Day ${i + 1}" maxlength="20"><input type="text" name="ref${i}" value="${esc(r[1] || '')}" placeholder="${ph[i]}" aria-label="Scripture for day ${i + 1}" maxlength="120"><input type="text" name="label${i}" value="${esc(r[2] || '')}" placeholder="theme (optional)" aria-label="Theme for day ${i + 1}" maxlength="120"></div>`; }).join('');
  const body = `<form method="post" action="/admin/studies/save" class="study-form">
<input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="id" value="${esc(x.id || '')}">
<header class="page-top sticky-top">
  <div><p class="eyebrow"><a href="/admin/studies">Weekly studies</a> / ${isNew ? 'New study' : 'Edit study'}</p><h1>${isNew ? 'A new lesson of the week' : esc(x.word)}</h1><p class="muted">${isNew ? 'Not saved yet' : (x.status === 'published' ? 'Published' : 'Draft') + (x.approxDate ? ' · from 2023' : ' · last saved ' + fmtDate(x.updatedAt))}</p></div>
  <div class="top-actions">
    ${!isNew && x.status === 'published' ? `<a class="btn btn-ghost" href="/studies/${esc(x.slug)}" target="_blank" rel="noopener">${icon('eye')} View</a>` : ''}
    <button class="btn btn-ghost" type="submit" name="status" value="draft">${x.status === 'published' ? 'Unpublish to draft' : 'Save draft'}</button>
    <button class="btn" type="submit" name="status" value="published">${x.status === 'published' ? 'Update' : 'Publish'}</button>
  </div>
</header>
${error ? `<div class="alert" role="alert">${esc(error)}</div>` : ''}
<div class="cols">
  <div class="card">
    <h2>The lesson</h2>
    <label>Title<input type="text" name="word" value="${esc(x.word)}" placeholder="e.g. Chosen" maxlength="120" required class="big-input"></label>
    <label><span>Subtitle <span class="muted">(optional)</span></span><input type="text" name="subtitle" value="${esc(x.subtitle || '')}" placeholder="e.g. The God Who Sees Me" maxlength="160"></label>
    <label><span>What the words mean <span class="muted">(one per line, like your texts: <b>Word * meaning</b>)</span></span><textarea name="definitions" rows="5" placeholder="Chosen * selected from several">${esc(defs)}</textarea></label>
    <label>Thought to ponder<textarea name="thought" rows="4" maxlength="1500" placeholder="When God has selected you…">${esc(x.thought)}</textarea></label>
    <label><span>Who said it, or the verse <span class="muted">(optional)</span></span><input type="text" name="thoughtCite" value="${esc(x.thoughtCite || '')}" placeholder="e.g. Rick Warren, or Luke 18:27 (KJV)" maxlength="80"></label>
  </div>
  <div class="card">
    <h2>Five days in the Word</h2>
    <p class="muted small">Write the Scripture for each day, like <b>Luke 19:1-10</b> or <b>Ruth 3 &amp; Ruth 4:1-16</b>. Readers tap it to read the passage. The theme is optional. Saturday and Sunday are optional.</p>
    <div class="day-rows">${rows}</div>
  </div>
</div>
<div class="card">
  <h2>Extras <span class="muted">(all optional)</span></h2>
  <div class="cols tight">
    <div><h3>Key verse at the top</h3><label>Reference<input type="text" name="kvRef" value="${esc(kv.ref || '')}" placeholder="e.g. Genesis 16:13-14" maxlength="80"></label><label>Version<input type="text" name="kvVer" value="${esc(kv.version || '')}" placeholder="KJV" maxlength="12"></label><label>Verse text<textarea name="kvText" rows="3">${esc(kv.text || '')}</textarea></label></div>
    <div><h3>Verse after the thought</h3><label>Reference<input type="text" name="cvRef" value="${esc(cv.ref || '')}" placeholder="e.g. Romans 8:28" maxlength="80"></label><label>Version<input type="text" name="cvVer" value="${esc(cv.version || '')}" placeholder="AMP" maxlength="12"></label><label>Verse text<textarea name="cvText" rows="3">${esc(cv.text || '')}</textarea></label></div>
  </div>
  <label><span>A second quote <span class="muted">(optional)</span></span><input type="text" name="q2" value="${esc(st2.text || '')}" maxlength="600" placeholder="e.g. Love recognizes no barriers."></label>
  <label><span>Second quote by</span><input type="text" name="q2By" value="${esc(st2.cite || '')}" maxlength="80" placeholder="e.g. Maya Angelou"></label>
  <label><span>A note from you</span><textarea name="note" rows="4" placeholder="Anything you’d like to add for readers this week.">${esc(x.note || '')}</textarea></label>
  <details><summary>Advanced</summary>
    <label>Web address<span class="prefix"><span>/studies/</span><input type="text" name="slug" value="${esc(x.slug)}" maxlength="80" placeholder="made from the title"></span></label>
  </details>
</div>
</form>
${!isNew ? `<form method="post" action="/admin/studies/delete" class="danger-zone" data-confirm="Delete the study “${esc(x.word)}”? This cannot be undone."><input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="id" value="${esc(x.id)}"><button type="submit" class="btn btn-danger">Delete this study</button></form>` : ''}`;
  return shell({ title: isNew ? 'New study' : 'Edit study', active: 'studies', csrf, flash, body });
}

function inbox({ csrf, flash }) {
  const msgs = store.messages();
  const body = `<header class="page-top"><div><p class="eyebrow">Inbox</p><h1>Messages from readers</h1><p class="muted">Notes from the contact and speaking forms. Reply by email.</p></div></header>
${msgs.length ? msgs.map(m => `<article class="card msg${m.read ? '' : ' unread'}" id="m-${m.id}">
  <header><div><b>${esc(m.name || 'Someone')}</b> <span class="muted">&lt;${esc(m.email)}&gt;</span></div><span class="muted">${esc(m.type || 'Message')} · ${fmtDate(m.at)}</span></header>
  ${['gathering', 'group', 'date'].filter(k => m[k]).map(k => `<p class="muted small">${k === 'gathering' ? 'Gathering' : k === 'group' ? 'Group and town' : 'Date in mind'}: ${esc(m[k])}</p>`).join('')}
  <p class="msg-body">${esc(m.message).replace(/\n/g, '<br>')}</p>
  <div class="msg-actions">
    <a class="btn btn-sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.type || 'your note'))}">Reply by email</a>
    <form method="post" action="/admin/inbox/mark"><input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="id" value="${m.id}"><input type="hidden" name="read" value="${m.read ? '0' : '1'}"><button class="btn btn-ghost btn-sm" type="submit">Mark as ${m.read ? 'unread' : 'read'}</button></form>
    <form method="post" action="/admin/inbox/delete" data-confirm="Delete this message?"><input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="id" value="${m.id}"><button class="link danger" type="submit">Delete</button></form>
  </div>
</article>`).join('') : '<section class="card"><p class="empty">No messages yet. They’ll appear here when readers write to you.</p></section>'}`;
  return shell({ title: 'Inbox', active: 'inbox', csrf, flash, body });
}

function readers({ csrf, flash }) {
  const subs = store.subscribers();
  const body = `<header class="page-top"><div><p class="eyebrow">Reader circle</p><h1>${subs.length.toLocaleString('en-US')} ${subs.length === 1 ? 'reader' : 'readers'}</h1><p class="muted">People who joined your reader list or asked for Day 1 of the devotional.</p></div>${subs.length ? '<a class="btn btn-ghost" href="/admin/readers.csv">Download as spreadsheet (CSV)</a>' : ''}</header>
<section class="card"><table class="table"><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Joined from</th><th scope="col">Date</th></tr></thead><tbody>
${subs.map(s => `<tr><td>${esc(s.name || '—')}</td><td>${esc(s.email)}</td><td>${esc(s.source || '')}</td><td>${fmtDate(s.at)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No one yet.</td></tr>'}
</tbody></table></section>`;
  return shell({ title: 'Reader circle', active: 'readers', csrf, flash, body });
}

function settings({ csrf, flash, error }) {
  const admin = store.read('admin', {});
  const body = `<header class="page-top"><div><p class="eyebrow">Settings</p><h1>Your account</h1><p class="muted">Signed in as ${esc(admin.email || '')}</p></div></header>
<section class="card narrow"><h2>Change your password</h2>
${error ? `<div class="alert" role="alert">${esc(error)}</div>` : ''}
<form method="post" action="/admin/settings/password" class="stack-form">
  <input type="hidden" name="csrf" value="${esc(csrf)}">
  <label>Current password<input type="password" name="current" required autocomplete="current-password"></label>
  <label><span>New password <span class="muted">(at least 10 characters)</span></span><input type="password" name="next" required minlength="10" autocomplete="new-password"></label>
  <label>Confirm new password<input type="password" name="confirm" required minlength="10" autocomplete="new-password"></label>
  <button class="btn" type="submit">Update password</button>
</form></section>`;
  return shell({ title: 'Settings', active: 'settings', csrf, flash, body });
}

module.exports = { studiesList, studyEditor, login, dashboard, postsList, editor, inbox, readers, settings };
