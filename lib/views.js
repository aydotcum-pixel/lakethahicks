'use strict';
const { esc, render, plainText } = require('./markdown');
const { site, days } = require('./content');
const store = require('./store');

const { config } = require('./config');
const bundle = require('./bundle');
const BOOKS = site.books;
const A = {
  street: '/assets/street.jpg', book: '/assets/holding-book.jpg', head: '/assets/headshot.jpg', selfie: '/assets/selfie.jpg',
  cov1: '/assets/cover-redemption.jpg', cov2: '/assets/cover-redemptions-journey.jpg', bloom: '/assets/cover-bloom-where-you-were-bound.png',
  logo: '/assets/logo-full-navy-transparent.png', mono: '/assets/logo-monogram-navy-transparent.png', light: '/assets/logo-full-cream-transparent.png',
};

const svgFile = f => bundle.svg[f]
  .replace(/role="img" aria-label="[^"]*"/, 'aria-hidden="true" focusable="false"');
const MONO = svgFile('monogram');
const MONO_BOLD = svgFile('monogramBold');

// A butterfly whose two wings fold in 3D (each wing hinges at the body).
const WING_L = (c1, c2) => `<svg viewBox="0 0 30 50" aria-hidden="true"><path d="M30 25 C22 4 2 -1 2 13 C2 25 17 29 30 25Z" fill="${c1}"/><path d="M30 24 C24 12 12 9 10 15 C9 21 19 24 30 24Z" fill="${c2}" opacity=".55"/><path d="M30 26 C19 30 9 41 16 47 C23 51 29 38 30 27Z" fill="${c1}" opacity=".88"/><circle cx="11" cy="12" r="2.4" fill="#e2c27a"/></svg>`;
const WING_R = (c1, c2) => `<svg viewBox="30 0 30 50" aria-hidden="true"><path d="M30 25 C38 4 58 -1 58 13 C58 25 43 29 30 25Z" fill="${c1}"/><path d="M30 24 C36 12 48 9 50 15 C51 21 41 24 30 24Z" fill="${c2}" opacity=".55"/><path d="M30 26 C41 30 51 41 44 47 C37 51 31 38 30 27Z" fill="${c1}" opacity=".88"/><circle cx="49" cy="12" r="2.4" fill="#e2c27a"/></svg>`;
const BF3D = (w = 40, c1 = '#2451c7', c2 = '#9cc0ff', speed = .34) =>
  `<span class="bf3d" style="--w:${w}px;--flap:${speed}s" aria-hidden="true"><span class="wing wl">${WING_L(c1, c2)}</span><span class="wing wr">${WING_R(c1, c2)}</span><span class="body"></span></span>`;

// A real 3D book: front cover, spine, page edges and back.
const BOOK3D = (src, alt, { w = 210, spine = '#111', eager = false } = {}) =>
  `<span class="book3d" style="--bw:${w}px;--spine:${spine}" data-tilt data-perch><span class="b-face b-front"><img src="${src}" alt="${esc(alt)}"${eager ? '' : ' loading="lazy"'}></span><span class="b-face b-back"></span><span class="b-face b-spine"></span><span class="b-face b-pages"></span><span class="b-face b-top"></span></span>`;
const SPINE = { cov1: '#0e0e0e', cov2: '#14241c', bloom: '#0f1d4a' };

// Today's devotional day, chosen by the calendar in Laketha's time zone.
function today() {
  const tz = config.SITE_TZ;
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const d = new Date(ymd + 'T12:00:00Z');
  const doy = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
  return { day: days[(doy - 1) % 30], label: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }) };
}

const FLOURISH = `<svg class="flourish" viewBox="0 0 240 28" aria-hidden="true"><path d="M0 16 H92" stroke="#b8913a" stroke-width="1"/><path d="M148 16 H240" stroke="#b8913a" stroke-width="1"/><path d="M92 16 C100 16 104 9 112 8" stroke="#2f6b52" stroke-width="1.2" fill="none"/><path d="M100 14 C103 9 109 8 112 11 C108 14 103 15 100 14Z" fill="#3f7d60"/><g transform="translate(120 15)"><ellipse cx="0" cy="-5" rx="3.6" ry="5" fill="#2451c7"/><ellipse cx="4.8" cy="-1.5" rx="3.6" ry="5" transform="rotate(72 4.8 -1.5)" fill="#3b6fe0"/><ellipse cx="3" cy="4" rx="3.6" ry="5" transform="rotate(144 3 4)" fill="#5b8def"/><ellipse cx="-3" cy="4" rx="3.6" ry="5" transform="rotate(216 -3 4)" fill="#3b6fe0"/><ellipse cx="-4.8" cy="-1.5" rx="3.6" ry="5" transform="rotate(288 -4.8 -1.5)" fill="#2451c7"/><circle r="2.2" fill="#e2c27a"/></g><path d="M128 16 C136 16 140 22 148 16" stroke="#2f6b52" stroke-width="1.2" fill="none"/></svg>`;
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
const readMins = md => Math.max(1, Math.round(plainText(md).split(' ').length / 200));

// ---------------------------------------------------------------- icons
const BF = (w = 24, c1 = '#2451c7', c2 = '#1e3a8a') =>
  `<svg aria-hidden="true" width="${w}" height="${Math.round(w * .84)}" viewBox="0 0 60 50" class="bf"><path d="M30 25 C22 6 4 2 3 14 C2 24 16 28 30 25Z" fill="${c1}"/><path d="M30 25 C38 6 56 2 57 14 C58 24 44 28 30 25Z" fill="${c1}"/><path d="M30 26 C20 30 10 40 16 46 C22 50 28 38 30 27Z" fill="${c2}"/><path d="M30 26 C40 30 50 40 44 46 C38 50 32 38 30 27Z" fill="${c2}"/><circle cx="13" cy="14" r="2.6" fill="#e2c27a"/><circle cx="47" cy="14" r="2.6" fill="#e2c27a"/><rect x="29" y="14" width="2" height="22" rx="1" fill="#101b3f"/></svg>`;
const ARROW = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
const PLUS = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
const SPARK = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><path d="M7 0 L8.6 5.4 L14 7 L8.6 8.6 L7 14 L5.4 8.6 L0 7 L5.4 5.4Z" fill="#e2c27a"/></svg>';

const drifters = () => '';

const kicker = (t, cls = '') => `<p class="kicker ${cls}">${t}</p>`;
const btn = (href, label, kind = 'dark', extra = '') => `<a class="btn btn-${kind}" href="${href}"${extra}>${label}</a>`;

// ---------------------------------------------------------------- layout
const NAV = [['/books', 'Books', 'books'], ['/devotional', 'The 30 Days', 'devotional'], ['/about', 'Her Story', 'about'], ['/speaking', 'Speaking', 'speaking'], ['/journal', 'Journal', 'journal']];

function layout({ title, description, active, body, image, path = '/', type = 'website', jsonld }) {
  const full = title ? `${title} · Laketha Hicks` : 'Laketha Hicks · Author of Redemption and Redemptions Journey';
  const desc = description || 'Faith-filled books for every woman who has had to begin again, from Laketha Hicks, author of Redemption and Redemptions Journey.';
  const img = config.SITE_URL + (image || A.book);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${config.SITE_URL}${esc(path)}">
<meta property="og:type" content="${type}"><meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(img)}"><meta property="og:url" content="${config.SITE_URL}${esc(path)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#101b3f">
<link rel="icon" type="image/svg+xml" href="/assets/monogram-bold.svg"><link rel="icon" type="image/png" sizes="64x64" href="/assets/favicon-64.png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Laketha Hicks · Journal" href="/journal/rss.xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Manrope:wght@400;500;600;700;800&family=Pinyon+Script&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<a class="announce" href="/devotional"><span class="announce-tag">New</span>Bloom Where You Were Bound, a 30-day devotional, is on its way. <u>Read Day 1 free</u></a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/" aria-label="Laketha Hicks, home"><span class="brand-mark">${MONO_BOLD}</span><span class="brand-text"><span class="brand-name">Laketha Hicks</span><span class="brand-sub">Author &amp; Speaker</span></span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="sr">Menu</span><span class="bars" aria-hidden="true"></span></button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      ${NAV.map(([h, l, k]) => `<a class="navlink${k === active ? ' active' : ''}" href="${h}"${k === active ? ' aria-current="page"' : ''}>${l}</a>`).join('')}
      <a class="btn btn-dark btn-sm${active === 'contact' ? ' is-current' : ''}" href="/contact">Let’s connect</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-circle" id="letter">
    <div class="fc-copy"><p class="kicker gold">The reader circle</p><p class="fc-title">A letter, now and then, for the road.</p><p class="fc-text">New writing, reading-circle guides and first word on the devotional. Never more than you want.</p></div>
    <form class="js-form inline-form dark-form fc-form" action="/api/subscribe" method="post" data-success="You are in. The first letter will find you soon.">
      <input type="hidden" name="source" value="footer"><label class="hp" aria-hidden="true">Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      <label>Email<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>
      <button class="btn btn-gold" type="submit">Join the circle</button>
    </form>
  </div>
  <div class="wrap footer-top">
    <div class="footer-brand"><span class="footer-mark">${MONO}</span><p class="footer-name">Laketha Hicks</p><p class="footer-tag">Rooted in faith, written with purpose.</p><a class="footer-mail" href="mailto:${site.author.email}">${site.author.email}</a></div>
    <nav class="footer-nav" aria-label="Footer">
      <div><p class="kicker gold">Read</p><a href="/books/redemption">Redemption</a><a href="/books/redemptions-journey">Redemptions Journey</a><a href="/devotional">The 30-day devotional</a></div>
      <div><p class="kicker gold">Gather</p><a href="/books#circle">Reading circles</a><a href="/speaking">Speaking</a><a href="/contact">Contact</a></div>
      <div><p class="kicker gold">Know her</p><a href="/about">Her story</a><a href="/journal">Journal</a><a href="/contact#faq">FAQ</a></div>
    </nav>
  </div>
  <div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} Laketha Hicks · Write by Faith Publications</span><span><span data-bf-total>${store.butterflyCount().toLocaleString('en-US')}</span> butterflies released by readers</span></div>
</footer>
<button type="button" class="fab" data-release aria-label="Release a butterfly"><span class="fab-bf">${BF3D(30, '#2451c7', '#9cc0ff', .3)}</span><span class="fab-label">Release a butterfly</span><span class="fab-count" data-bf-total>${store.butterflyCount().toLocaleString('en-US')}</span></button>
<div class="sr" role="status" aria-live="polite" data-live></div>
<script src="/js/site.js" defer></script>
</body>
</html>`;
}

function pageHeader({ kicker: k, title, lede, crumb, right = '' }) {
  return `<section class="page-head">
  <div class="glow" aria-hidden="true"></div>${drifters()}
  <div class="wrap page-head-inner">
    <div class="page-head-copy">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">${crumb}</span></nav>
      ${kicker(k, 'reveal-in')}
      <h1 class="display reveal-in" style="--d:.1s">${title}</h1>
      <p class="lede reveal-in" style="--d:.2s">${lede}</p>
      <div class="reveal-in" style="--d:.3s">${FLOURISH}</div>
    </div>
    ${right ? `<div class="page-head-art reveal-in" style="--d:.3s">${right}</div>` : ''}
  </div>
</section>`;
}

function releasePanel(note = '') {
  const n = store.butterflyCount();
  return `<div class="release">
  <button type="button" class="release-btn" data-release>${BF3D(30, '#2451c7', '#9cc0ff', .5)}<span class="release-label">Release a butterfly</span></button>
  <p class="release-note"><span class="count" data-bf-total>${n.toLocaleString('en-US')}</span> released by readers so far. ${note}</p>
</div>`;
}

function signup(source, { dark = false, title = 'A letter, now and then, <em>for the road.</em>', text = 'New writing, reading-circle guides, speaking dates, and first word on the devotional. Never more than you want.', cta = 'Join the circle' } = {}) {
  return `<section class="letter ${dark ? 'letter-dark' : ''}" id="letter">
  <div class="wrap"><div class="letter-card reveal">
    <div class="letter-avatar"><img src="${A.selfie}" alt="Laketha Hicks smiling" width="150" height="150" loading="lazy"><span class="script">with love, Laketha</span></div>
    <div class="letter-copy">
      ${kicker('The reader circle')}
      <h2 class="h2">${title}</h2>
      <p>${text}</p>
      <form class="js-form inline-form" action="/api/subscribe" method="post" data-success="You are in. The first letter will find you soon.">
        <input type="hidden" name="source" value="${esc(source)}">
        <label class="hp" aria-hidden="true">Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
        <label>First name<input type="text" name="name" autocomplete="given-name" placeholder="Your first name"></label>
        <label>Email<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>
        <button class="btn btn-dark" type="submit">${cta}</button>
      </form>
      <p class="fine">Your email is used only for Laketha’s reader circle and is never shared.</p>
    </div>
  </div></div>
</section>`;
}

function postCard(p, big = false) {
  return `<a class="post-card lift reveal${big ? ' post-card-big' : ''}" href="/journal/${esc(p.slug)}" data-tag="${esc(p.tag)}">
  <span class="post-card-img zoom">${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : `<span class="post-card-fallback">${BF(64, '#9cc0ff', '#2451c7')}</span>`}</span>
  <span class="post-card-body">
    <span class="meta">${big ? '<span class="pill">Latest</span>' : ''}<span>${esc(p.tag)}</span><span class="muted">${fmtDate(p.publishedAt)}</span></span>
    <span class="post-card-title">${esc(p.title)}</span>
    <span class="post-card-dek">${esc(p.excerpt || plainText(p.body).slice(0, 160) + '…')}</span>
    <span class="more">Read the entry ${ARROW}</span>
  </span>
</a>`;
}

// ================================================================ HOME
function home() {
  const posts = store.publishedPosts().slice(0, 3);
  const t = today();
  const words = ['Faith', 'Resilience', 'Healing', 'Purpose', 'New beginnings', 'Grace for the road', 'Beauty for ashes', 'Bloom'];
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-copy">
      ${kicker('Faith · Resilience · New beginnings', 'reveal-in')}
      <h1 class="hero-title" data-perch aria-label="There is more to your story."><span class="line"><span class="w" style="--d:.15s">There</span> <span class="w" style="--d:.27s">is</span> <span class="w" style="--d:.39s">more</span></span><span class="line"><span class="w" style="--d:.51s">to</span> <em class="w" style="--d:.65s">your story.</em></span></h1>
      <p class="lede reveal-in" style="--d:.85s">For every woman who has had to begin again: stories of redemption, told plainly, walked out by faith.</p>
      <div class="btn-row reveal-in" style="--d:1s">${btn('/books', 'Discover the books', 'accent')}${btn('/about', 'Meet Laketha', 'line')}</div>
      <div class="reveal-in" style="--d:1.1s">${releasePanel('Each one is a prayer for a woman beginning again.')}</div>
    </div>
    <div class="hero-art">
      <div class="arch-frame" aria-hidden="true"></div>
      <svg class="arch-vine" viewBox="0 0 300 425" aria-hidden="true" data-arch-vine><path class="vine-stem" d="M300 440 C305 390 295 340 300 290 C305 240 295 195 300 150 A150 150 0 0 0 150 0 A150 150 0 0 0 46 42"/></svg>
      <div class="arch zoom"><img src="${A.book}" alt="Laketha Hicks smiling against a white brick wall, holding Redemptions Journey" width="440" height="620" fetchpriority="high" data-parallax="-0.06"></div>
      ${drifters()}
    </div>
  </div>
</section>

<div class="home-flow"><div class="vine-layer" aria-hidden="true"><svg data-vine></svg></div>
<section class="today" aria-labelledby="today-h">
  <div class="wrap today-inner">
    <div class="today-meta reveal"><h2 id="today-h" class="kicker">Today’s word</h2><p class="today-date">${t.label}</p><p class="today-day">Day ${t.day.n} of 30 · from <i>Bloom Where You Were Bound</i></p></div>
    <span class="today-ghost" aria-hidden="true">${t.day.n}</span>
    <figure class="today-verse reveal" data-perch><blockquote><p>${esc(t.day.v)}</p></blockquote><figcaption>${esc(t.day.r)} · KJV</figcaption></figure>
    <div class="today-walk reveal"><p class="kicker blue">Walk it out today</p><p>${esc(t.day.w)}</p><a class="more" href="/devotional#day-${t.day.n}">Read today’s reflection ${ARROW}</a></div>
  </div>
</section>
<section class="wrap section" aria-labelledby="shelf-h">
  <div class="section-head reveal">
    <div>${kicker('The library')}<h2 id="shelf-h" class="h2">One story, told <em>in three volumes.</em></h2></div>
    <p>Read the story, walk the journey, then take thirty days with the devotional companion.</p>
  </div>
  <div class="grid-3 rail" data-rail>
    ${[[A.cov1, 'Book One · 2020', BOOKS[0].title, BOOKS[0].line, '/books/redemption', 'ivory'], [A.cov2, 'Book Two · 2022', BOOKS[1].title, BOOKS[1].line, '/books/redemptions-journey', 'sage'], [A.bloom, 'Coming soon · Devotional', BOOKS[2].title, 'You were bound. Now bloom.', '/devotional', 'mist']]
      .map(([c, k, t, l, h, tone], i) => `<a class="shelf-card ${tone} reveal" style="--d:${i * .08}s" href="${h}"><span class="shelf-cover">${BOOK3D(c, 'Cover of ' + t, { w: 196, spine: [SPINE.cov1, SPINE.cov2, SPINE.bloom][i] })}</span><span class="kicker">${k}</span><span class="shelf-title">${esc(t)}</span><span class="shelf-line">“${esc(l)}”</span><span class="more">Discover ${ARROW}</span></a>`).join('')}
  </div>
</section>





<section class="chapter-blue" aria-labelledby="ab-h">
  <div class="chapter-photo" aria-hidden="true"><img src="${A.head}" alt="" loading="lazy" data-parallax="-0.04"></div>
  <div class="wrap chapter-inner">
    <div class="chapter-copy reveal">
      ${kicker('Her story', 'gold')}
      <p class="chapter-quote" data-perch>“Redemption is not just a moment. It is a journey, walked by faith, one honest step at a time.”</p>
      <p class="chapter-sig" aria-hidden="true">Laketha</p>
      <h2 id="ab-h" class="h2 light">A leader who writes, a writer who leads.</h2>
      <p class="on-dark">Laketha’s authority on the page comes from a full life off it: family and faith, two master’s degrees earned with honours, and nearly two decades of operations leadership at Huntsville Hospital, the second largest hospital in Alabama.</p>
      <div class="btn-row">${btn('/about', 'Read her story', 'gold')}${btn('/speaking', 'Invite her to speak', 'line-light')}</div>
    </div>
  </div>
</section>
<section class="band-paper" aria-labelledby="jt-h">
  <div class="wrap section">
    <div class="section-head reveal"><div>${kicker('The journal')}<h2 id="jt-h" class="h2">Words from <em>her heart.</em></h2></div>${btn('/journal', 'All journal entries', 'line')}</div>
    <div class="grid-3 rail" data-rail>${posts.map(p => postCard(p)).join('')}</div>
  </div>
</section>



</div>`;
  return layout({ active: 'home', body, path: '/', jsonld: { '@context': 'https://schema.org', '@type': 'Person', name: 'Laketha Hicks', jobTitle: 'Author', url: config.SITE_URL, image: config.SITE_URL + A.head, homeLocation: 'Harvest, Alabama', alumniOf: ['Florida Institute of Technology', 'Alabama A&M University'] } });
}

// ================================================================ BOOKS
function symbolsList(sym) { return `<ul class="symbols">${sym.map(([a, b]) => `<li><span>${esc(a)}</span><span>${esc(b)}</span></li>`).join('')}</ul>`; }

function books() {
  const data = [
    { b: BOOKS[0], cover: A.cov1, spine: SPINE.cov1, kick: 'Book One · The Story', theme: 'ivory', desc: 'A woman’s story, told plainly and without flinching: the seasons that undo us, the losses and detours, and the grace that meets a woman precisely there. Redemption here is not a slogan or a sudden rescue. It is real, costly and deeply personal.', cta: [[BOOKS[0].buyUrl, 'Buy on Amazon'], ['/contact?reason=signed', 'Request a signed copy']], order: 'Read first' },
    { b: BOOKS[1], cover: A.cov2, spine: SPINE.cov2, kick: 'Book Two · The Journey', theme: 'emerald', desc: 'If the first book is about the moment, this one is about everything that comes after: the daily, deliberate work of healing, growing and becoming. What does a redeemed life actually look like on an ordinary Tuesday?', cta: [[BOOKS[1].buyUrl, 'Buy on Amazon'], ['/contact?reason=signed', 'Request a signed copy']], order: 'Read second' },
    { b: BOOKS[2], cover: A.bloom, spine: SPINE.bloom, kick: 'The companion · Devotional', theme: 'navy', desc: 'Thirty days in four movements, faith, resilience, healing and purpose, each with Scripture, reflection, a small daily practice, journal prompts and prayer. Written for women walking the road after the rescue.', cta: [['/devotional', 'Read Day 1 free'], ['/#letter', 'Get launch news']], order: 'Companion', line: 'You were bound. Now bloom.' },
  ];
  const tabs = data.map((d, i) => `<button type="button" role="tab" id="bt-${i}" aria-controls="bp-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${['Book One', 'Book Two', 'Coming soon'][i]}</button>`).join('');
  const panels = data.map((d, i) => `<div class="book-panel theme-${d.theme}" role="tabpanel" id="bp-${i}" aria-labelledby="bt-${i}"${i ? ' hidden' : ''}>
    <div class="book-cover">${BOOK3D(d.cover, 'Cover of ' + d.b.title, { w: 250, spine: d.spine })}</div>
    <div class="book-copy">
      ${kicker(d.kick)}
      <h3>${esc(d.b.title)}</h3>
      <p class="book-line">“${esc(d.line || d.b.line)}”</p>
      <p>${esc(d.desc)}</p>
      <dl class="book-facts"><div><dt>Published</dt><dd>${d.b.year || 'Soon'}</dd></div><div><dt>In the series</dt><dd>${d.order}</dd></div><div><dt>Formats</dt><dd>${d.b.formats ? d.b.formats.join(' · ') : 'Print · Ebook'}</dd></div></dl>
      <div class="btn-row">${btn(d.cta[0][0], d.cta[0][1], d.theme === 'ivory' ? 'accent' : 'gold', /^https/.test(d.cta[0][0]) ? ' target="_blank" rel="noopener"' : '')}${btn(d.cta[1][0], d.cta[1][1], d.theme === 'ivory' ? 'line' : 'line-light')}</div>
    </div>
  </div>`).join('');

  const body = pageHeader({ kicker: 'The books', title: 'One story, <em>three volumes.</em>', lede: 'First the story of a woman brought low and lifted up, then the longer, quieter work of walking it out, and now thirty days to carry it with you.', crumb: 'The books',
    right: `<div class="fan"><img class="tilt" src="${A.cov1}" alt=""><img class="tilt" src="${A.cov2}" alt=""><img class="tilt" src="${A.bloom}" alt=""></div>` }) + `
<section class="wrap section" aria-labelledby="pick-h">
  <div class="section-head reveal"><div>${kicker('Choose a volume')}<h2 id="pick-h" class="h2">Begin where <em>you are.</em></h2></div><div class="tabs" role="tablist" aria-label="Choose a book" data-tabs>${tabs}</div></div>
  <div class="book-stage reveal">${panels}</div>
</section>
<section class="band-paper" id="covers" aria-labelledby="cv-h">
  <div class="wrap section">
    <div class="narrow reveal">${kicker('The covers')}<h2 id="cv-h" class="h2">Art that tells <em>the story first.</em></h2><p>Before a single page is turned, the two covers preach the sermon. Read side by side, they form a diptych: bondage and bloom, thorn and blossom.</p></div>
    <div class="grid-2 gap-xl">
      <article class="reveal"><div class="cover-head"><img class="tilt" src="${A.cov1}" alt="Cover of Redemption" loading="lazy"><div>${kicker('Book One')}<h3>Black, white, and one defiant yellow.</h3></div></div>${symbolsList(BOOKS[0].coverSymbols)}</article>
      <article class="reveal"><div class="cover-head"><img class="tilt" src="${A.cov2}" alt="Cover of Redemptions Journey" loading="lazy"><div>${kicker('Book Two')}<h3>Standing now, and the vines in flower.</h3></div></div>${symbolsList(BOOKS[1].coverSymbols)}</article>
    </div>
  </div>
</section>
<section class="wrap section split top" id="circle" aria-labelledby="rc-h">
  <div class="sticky stack reveal">
    ${kicker('For reading circles')}
    <h2 id="rc-h" class="h2">Books that ask <em>to be discussed.</em></h2>
    <p>Read Book One together, then take up the Journey a month later. These six questions open naturally into conversation for book clubs, women’s groups and faith communities.</p>
    <ol class="steps"><li><span><b>Read</b> <i>Redemption</i> together</span></li><li><span><b>A month later,</b> take up <i>Redemptions Journey</i></span></li><li><span><b>Then walk</b> the thirty days as a circle</span></li></ol>
    <div class="btn-row">${btn('/contact?reason=circle', 'Invite Laketha to your circle', 'dark')}</div>
  </div>
  <div class="q-list">${site.readingCircleQuestions.map(([k, q], i) => `<div class="q-card lift reveal"><span class="q-num">0${i + 1}</span><span><span class="kicker blue">${esc(k)}</span><span class="q-text">${esc(q)}</span></span></div>`).join('')}</div>
</section>
<section class="wrap section-sm">
  <div class="cta-navy reveal">
    <div>${kicker('Signed copies', 'gold')}<h2 class="h2 light">A copy signed <em>by her hand.</em></h2><p class="on-dark">For a gift, a reading circle or your own shelf. Signed copies are available by request; Laketha will reply by email with details.</p></div>
    <div class="btn-row">${btn('/contact?reason=signed', 'Request a signed copy', 'gold')}${btn(BOOKS[0].buyUrl, 'Shop on Amazon', 'line-light', ' target="_blank" rel="noopener"')}</div>
  </div>
</section>`;
  return layout({ title: 'The books', description: 'Redemption: The Story of a Woman, Redemptions Journey, and the coming 30-day devotional Bloom Where You Were Bound.', active: 'books', body, path: '/books', image: A.cov1 });
}

function bookDetail(slug) {
  const b = BOOKS.find(x => x.slug === slug && x.buyUrl);
  if (!b) return null;
  const cover = slug === 'redemption' ? A.cov1 : A.cov2;
  const other = BOOKS.find(x => x.buyUrl && x.slug !== slug);
  const body = pageHeader({ kicker: `${b.order} · ${b.year}`, title: b.title.includes(':') ? `${esc(b.title.split(':')[0])}:<br><em>${esc(b.title.split(':').slice(1).join(':').trim())}</em>` : `<em>${esc(b.title)}</em>`, lede: `“${esc(b.line)}”`, crumb: esc(b.title),
    right: BOOK3D(cover, 'Cover of ' + b.title, { w: 230, spine: slug === 'redemption' ? SPINE.cov1 : SPINE.cov2, eager: true }) }) + `
<section class="wrap section split top">
  <div class="stack reveal">
    ${kicker('About the book')}
    <h2 class="h2">${esc(b.summary)}</h2>
    <dl class="book-facts light-facts"><div><dt>Publisher</dt><dd>${esc(b.publisher)}</dd></div><div><dt>Published</dt><dd>${b.year}</dd></div><div><dt>Formats</dt><dd>${b.formats.join(' · ')}</dd></div></dl>
    <div class="btn-row">${btn(b.buyUrl, 'Buy on Amazon', 'accent', ' target="_blank" rel="noopener"')}${btn('/contact?reason=signed', 'Request a signed copy', 'line')}</div>
  </div>
  <div class="reveal">${kicker('Read the cover')}${symbolsList(b.coverSymbols)}</div>
</section>
<section class="wrap section-sm"><a class="next-book lift reveal" href="/books/${other.slug}"><img src="${other.slug === 'redemption' ? A.cov1 : A.cov2}" alt=""><span>${kicker(other.order)}<span class="next-title">${esc(other.title)}</span><span class="more">Continue the story ${ARROW}</span></span></a></section>`;
  return layout({ title: b.title, description: b.summary, active: 'books', body, path: '/books/' + slug, image: cover, type: 'book',
    jsonld: { '@context': 'https://schema.org', '@type': 'Book', name: b.title, author: { '@type': 'Person', name: 'Laketha Hicks' }, publisher: b.publisher, datePublished: String(b.year), image: config.SITE_URL + cover, url: config.SITE_URL + '/books/' + slug } });
}

// ================================================================ DEVOTIONAL
function devotional() {
  const parts = [['The Word', 'A passage of Scripture to read slowly, twice if you can.'], ['The Reflection', 'A short meditation for a woman rebuilding her life with intention.'], ['Walk It Out', 'One small, practical step. Redemption is something we practise.'], ['Journal', 'Two or three honest questions to answer on the page.'], ['Prayer', 'A closing prayer to pray as written, or to begin your own.']];
  const moves = [['Days 1–8', 'Faith', 'An anchor, not an ornament', 1, 8], ['Days 9–15', 'Resilience', 'Strength that bends', 9, 15], ['Days 16–22', 'Healing', 'Honest room for grief and growth', 16, 22], ['Days 23–30', 'Purpose', 'What was survived becomes offered', 23, 30]];
  const weeks = [['Week One', 'Faith', 'Share the hope you wrote down on Day 2. Discuss honest faith and performed faith.'], ['Week Two', 'Resilience', 'Ruth, Joseph or Elijah: whose story spoke most? Talk about resting versus quitting.'], ['Week Three', 'Healing', 'The tender week. Move slowly, and close by praying for one another by name.'], ['Week Four', 'Purpose', 'Read your written visions aloud. Close with Song of Solomon 2:11–12, and bring flowers.']];
  const body = pageHeader({ kicker: 'Coming soon · A 30-day devotional', title: 'Bloom where <em>you were bound.</em>', lede: 'A devotional companion to Redemption and Redemptions Journey: thirty days from redemption to purpose.', crumb: 'The 30 days',
    right: BOOK3D(A.bloom, 'Cover of Bloom Where You Were Bound', { w: 230, spine: SPINE.bloom, eager: true }) }) + `
<section class="wrap section" aria-labelledby="how-h">
  <div class="section-head reveal"><div>${kicker('How each day unfolds')}<h2 id="how-h" class="h2">Five parts, <em>one honest step.</em></h2></div><p>Short enough to read with your morning coffee, deep enough to carry until evening.</p></div>
  <ol class="grid-5">${parts.map(([a, b], i) => `<li class="tile lift reveal" style="--d:${i * .06}s"><span class="tile-num">0${i + 1}</span><span class="tile-title">${a}</span><span>${b}</span></li>`).join('')}</ol>
</section>
<section class="band-navy explorer" id="explore" aria-labelledby="ex-h">
  <div class="glow" aria-hidden="true"></div><div class="twinkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
  <div class="wrap section">
    <div class="reveal">${kicker('Walk the thirty days', 'gold')}<h2 id="ex-h" class="h2 light">Choose a movement, <em>then a day.</em></h2></div>
    <div class="moves" role="tablist" aria-label="Movements" data-moves>${moves.map((m, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-from="${m[3]}" data-to="${m[4]}"><span class="kicker">${m[0]}</span><span class="move-name">${m[1]}</span><span class="move-sub">${m[2]}</span></button>`).join('')}</div>
    <div class="explorer-grid">
      <div><div class="day-grid" data-days aria-label="Days"></div><p class="hint">Choose a day to read its passage, opening and practice.</p></div>
      <article class="day-card" data-day-card aria-live="polite">
        <span class="day-ghost" data-f="n" aria-hidden="true"></span>
        <p class="kicker"><span class="rule"></span>Day <span data-f="n"></span> · <span data-f="mv"></span></p>
        <h3 data-f="t"></h3>
        <blockquote><p data-f="v"></p><footer><span data-f="r"></span> · KJV</footer></blockquote>
        <p data-f="o"></p>
        <div class="walk"><p class="kicker blue">Walk it out</p><p data-f="w"></p></div>
        <div class="day-nav"><div><button type="button" class="round" data-prev aria-label="Previous day">${ARROW}</button><button type="button" class="round solid" data-next aria-label="Next day">${ARROW}</button></div><span><span data-f="n"></span> of 30</span></div>
        <div class="progress"><span data-progress></span></div>
      </article>
    </div>
    <div class="inbox-strip reveal">
      <div><p class="strip-title">Receive Day 1 in your inbox.</p><p class="on-dark">Plus the reading-circle questions for both books, and first word when the devotional is released.</p></div>
      <form class="js-form inline-form dark-form" action="/api/subscribe" method="post" data-success="Day 1 is on its way. Welcome to the circle.">
        <input type="hidden" name="source" value="devotional-day1"><label class="hp" aria-hidden="true">Leave empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
        <label>Email address<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>
        <button class="btn btn-gold" type="submit">Send me Day 1</button>
      </form>
    </div>
  </div>
  <script type="application/json" id="days-data">${JSON.stringify(days).replace(/</g, '\\u003c')}</script>
</section>
<section class="band-mist" aria-labelledby="plan-h">
  <div class="wrap section split top">
    <div class="reveal stack">${kicker('For reading circles')}<h2 id="plan-h" class="h2">Four weeks, <em>walked together.</em></h2><p>Healing is often a solo walk, but it was never meant to be a lonely one. The book closes with a guide for circles: what stays in the room, what to bring, and what to ask.</p></div>
    <div class="grid-2">${weeks.map(([a, b, c]) => `<div class="week lift reveal"><span class="kicker blue">${a}</span><span class="week-title">${b}</span><span>${c}</span></div>`).join('')}</div>
  </div>
</section>`;
  return layout({ title: 'Bloom Where You Were Bound', description: 'A 30-day devotional journey from redemption to purpose, by Laketha Hicks. Read Day 1 free.', active: 'devotional', body, path: '/devotional', image: A.bloom });
}

// ================================================================ ABOUT
function about() {
  const a = site.author;
  const timeline = [['2006', 'B.S. in Accounting, Alabama A&M University', 'The numerical, disciplined foundation on which her operations career would be built.'], ['2007', 'Huntsville Hospital', 'Begins her tenure in Environmental Services and grows into operations leadership across the main campus, Women & Children, and affiliated hospitals in North Alabama.'], ['2011', 'MBA, Florida Institute of Technology', 'Magna cum laude, earned while continuing her hospital leadership.'], ['2012', 'MPA, Florida Institute of Technology', 'Magna cum laude: a second master’s, devoted to public service.'], ['2019–20', 'DBA coursework, Walden University', 'Doctoral study in business administration, in the same season her first book was prepared for the world.'], ['2020', 'Redemption: The Story of a Woman', 'Her debut, with Write by Faith Publications.'], ['2022', 'Redemptions Journey', 'The walk after the rescue, and the blossom after the thorn.'], ['Next', 'Bloom Where You Were Bound', 'A 30-day devotional companion, on its way.']];
  const gallery = [[A.head, '50% 30%', 'Laketha Hicks', 'Author of Redemption (2020) and Redemptions Journey (2022)'], [A.book, '50% 20%', 'With Redemptions Journey', 'Holding her second book, published in 2022'], [A.street, '50% 40%', 'In full colour', 'Before the red telephone box, in a chevron skirt'], [A.selfie, '50% 25%', 'Close and joyful', 'A smiling selfie in a white lace top']];
  const body = pageHeader({ kicker: 'Her story', title: 'The woman <em>behind the words.</em>', lede: 'Author, hospital leader and scholar, writing for every woman who has had to begin again.', crumb: 'Her story', right: `<div class="arch small"><img src="${A.book}" alt="Laketha Hicks holding Redemptions Journey"></div>` }) + `
<section class="wrap section split top" aria-labelledby="bio-h">
  <div class="stack reveal">
    ${kicker('From Harvest, Alabama, with purpose')}
    <h2 id="bio-h" class="h2">A leader who writes, <em>a writer who leads.</em></h2>
    <p class="dropcap big">Laketha Hicks makes her home in Harvest, Alabama, in the Huntsville and Madison community she has served for most of her professional life. Since 2007 she has served as Coordinator of Operations for Environmental Services at Huntsville Hospital, the second largest hospital in Alabama, supporting the main campus, Huntsville Hospital for Women &amp; Children, and affiliated hospitals across North Alabama.</p>
    <p class="big">It is work that happens largely out of sight and matters enormously: the cleanliness, safety and readiness of the spaces where patients heal and families wait. She has been recognised with Superior Performance Ratings for fifteen consecutive years.</p>
    <p class="big">That is why redemption, in her hands, is never an abstraction. It is daily work: showing up, telling the truth, extending grace, and beginning again, in a hospital corridor, in a classroom, and on the page.</p>
  </div>
  <aside class="stack">${[['No. I', 'The Writer', 'Two books, one testimony, written for women who have had to begin again, with candour about the breaking and confidence about the restoration.'], ['No. II', 'The Leader', 'Since 2007, operations leadership at Huntsville Hospital: leading teams, mentoring staff and holding exacting standards across multiple campuses.'], ['No. III', 'The Scholar', 'An accountant by first training, with an MBA and MPA earned magna cum laude and doctoral coursework completed.']].map(([n, t, d]) => `<div class="pillar lift reveal">${kicker(n)}<span class="pillar-title">${t}</span><span>${d}</span></div>`).join('')}</aside>
</section>
<section class="band-navy" aria-labelledby="tl-h">
  <div class="wrap section">
    <div class="narrow reveal">${kicker('Her journey', 'gold')}<h2 id="tl-h" class="h2 light">Education, service <em>&amp; the books.</em></h2><p class="on-dark">Notice the pattern: every credential was earned while the work of serving others continued.</p></div>
    <ol class="timeline">${timeline.map(([y, t, d]) => `<li class="reveal${['2020', '2022', 'Next'].includes(y) ? ' book' : ''}"><span class="sheen">${y}</span><span class="tl-title">${esc(t)}</span><span>${esc(d)}</span></li>`).join('')}</ol>
  </div>
</section>
<section class="band-paper" aria-labelledby="gal-h">
  <div class="wrap section">
    <div class="section-head reveal"><div>${kicker('In portrait')}<h2 id="gal-h" class="h2">As her readers <em>meet her.</em></h2></div><p>Warm, assured, and entirely herself. Choose a portrait.</p></div>
    <div class="gallery" data-gallery>
      <figure class="gallery-main"><img src="${gallery[0][0]}" alt="${esc(gallery[0][2])}" style="object-position:${gallery[0][1]}" data-g-img><figcaption><span><span class="g-title" data-g-title>${gallery[0][2]}</span><span data-g-cap>${gallery[0][3]}</span></span><span class="g-num" data-g-num>1 / ${gallery.length}</span></figcaption></figure>
      <div class="gallery-thumbs">${gallery.map((g, i) => `<button type="button" aria-pressed="${i === 0}" aria-label="Show portrait: ${esc(g[2])}" data-src="${g[0]}" data-pos="${g[1]}" data-title="${esc(g[2])}" data-cap="${esc(g[3])}"><img src="${g[0]}" alt="" style="object-position:${g[1]}" loading="lazy"></button>`).join('')}</div>
    </div>
  </div>
</section>
<section class="wrap section" aria-labelledby="cr-h">
  <div class="reveal">${kicker('Credentials')}<h2 id="cr-h" class="h2">Qualifications <em>&amp; recognition.</em></h2></div>
  <div class="grid-2">
    <div class="cred reveal"><h3>Education</h3><ul>${a.education.slice().reverse().map(e => `<li><b>${esc(e.school)}</b><span>${esc(e.credential)} · ${esc(e.year)}</span></li>`).join('')}</ul></div>
    <div class="cred reveal"><h3>Certifications</h3><ul>${a.certifications.map(c => `<li><b>${esc(c.split(',')[0])}</b><span>${esc(c.split(',').slice(1).join(',') || '')}</span></li>`).join('')}</ul></div>
  </div>
</section>
<section class="quote-band" aria-label="Her conviction"><div class="wrap narrow center"><span class="quote-mark" aria-hidden="true">“</span><p class="reveal">Redemption is not just a moment. It is a <em>journey,</em> walked by faith, one honest step at a time.</p><span class="script">Laketha</span></div></section>`;
  return layout({ title: 'Her story', description: 'Laketha Hicks: author, Huntsville Hospital operations leader since 2007, and scholar with two master’s degrees magna cum laude.', active: 'about', body, path: '/about', image: A.head });
}

// ================================================================ SPEAKING
function speaking() {
  const sp = site.speaking;
  const body = pageHeader({ kicker: 'Speaking &amp; gatherings', title: 'A voice for <em>churches and women’s groups.</em>', lede: 'Laketha speaks from a life of faith, leadership and writing: honest about the breaking, practical about the walk that follows.', crumb: 'Speaking', right: `<div class="circle-photo"><img src="${A.head}" alt="Laketha Hicks smiling with arms folded"></div>` }) + `
<section class="wrap section split top" aria-labelledby="tp-h">
  <div class="stack reveal">
    ${kicker('Topics')}<h2 id="tp-h" class="h2">What she <em>speaks about.</em></h2>
    <p>Drawn from her books, her journal and nearly two decades in hospital leadership.</p>
    <div class="accordion">${sp.topics.map(([t, d], i) => `<details${i === 0 ? ' open' : ''}><summary><span><span class="acc-num">0${i + 1}</span>${esc(t)}</span><span class="acc-icon">${PLUS}</span></summary><p>${esc(d)}</p></details>`).join('')}</div>
  </div>
  <div class="stack reveal">
    <div class="zoom tall-photo"><img src="${A.street}" alt="Laketha Hicks in a bright chevron skirt on a downtown street" loading="lazy" data-parallax="-0.05"></div>
    <div class="grid-2 tight">${[['Churches', 'Services, women’s days, conferences'], ['Women’s groups', 'Retreat sessions and gatherings'], ['Book clubs', 'In person or by video'], ['Community', 'Professional and civic events']].map(([a, b]) => `<div class="mini"><b>${a}</b><span>${b}</span></div>`).join('')}</div>
  </div>
</section>
<section class="band-paper"><div class="wrap section-sm split center-y">
  <div class="reveal">${kicker('Upcoming events')}<h2 class="h2">No dates announced <em>just yet.</em></h2><p>Join the reader circle to be first to hear when Laketha speaks near you.</p></div>
  <div class="reveal right">${btn('/#letter', 'Join the reader circle', 'dark')}</div>
</div></section>
<section class="wrap section" id="invite" aria-labelledby="inv-h">
  <div class="cta-navy form-card reveal">
    <div class="stack">${kicker('Invite Laketha', 'gold')}<h2 id="inv-h" class="h2 light">Tell her about <em>your gathering.</em></h2><p class="on-dark">Your group, your date and your place. Laketha replies personally by email.</p><div class="sig"><img src="${A.selfie}" alt="Laketha Hicks"><span class="script gold">Laketha</span></div></div>
    <form class="js-form grid-form dark-form" action="/api/contact" method="post" data-success="Thank you. Your invitation is on its way. Laketha will reply by email.">
      <input type="hidden" name="type" value="Speaking invitation"><label class="hp" aria-hidden="true">Leave empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      <fieldset class="full chips-field"><legend>Type of gathering</legend><div class="chips">${['Church service', 'Women’s gathering', 'Retreat', 'Book club', 'Community event'].map((e, i) => `<label class="chip"><input type="radio" name="gathering" value="${e}"${i === 1 ? ' checked' : ''}><span>${e}</span></label>`).join('')}</div></fieldset>
      <label>Your name<input type="text" name="name" required autocomplete="name"></label>
      <label>Email<input type="email" name="email" required autocomplete="email"></label>
      <label>Group and town<input type="text" name="group" placeholder="Church or group, and town"></label>
      <label>Date in mind<input type="text" name="date" placeholder="Month or exact date"></label>
      <label class="full">Your message<textarea name="message" rows="4" required placeholder="Tell Laketha about your event and your group."></textarea></label>
      <button class="btn btn-gold" type="submit">Send the invitation</button>
    </form>
  </div>
</section>`;
  return layout({ title: 'Speaking', description: 'Invite Laketha Hicks to speak at your church, women’s group, book club or community event.', active: 'speaking', body, path: '/speaking', image: A.head });
}

// ================================================================ JOURNAL
function journal() {
  const posts = store.publishedPosts();
  const tags = ['All', ...new Set(posts.map(p => p.tag))];
  const [feat, ...rest] = posts;
  const body = pageHeader({ kicker: 'The journal', title: 'Words from <em>her heart.</em>', lede: 'Reflections on faith, on beginning again, and on the journey behind her books.', crumb: 'Journal', right: `<div class="arch small"><img src="${A.selfie}" alt="Laketha Hicks smiling" style="object-position:50% 30%"></div>` }) +
    (feat ? `<section class="wrap section-sm">${postCard(feat, true)}</section>
<section class="wrap section" aria-labelledby="all-h">
  <div class="section-head"><h2 id="all-h" class="h3">Every entry</h2><div class="tabs filter" role="group" aria-label="Filter by theme" data-filter>${tags.map((t, i) => `<button type="button" aria-pressed="${i === 0}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
  <div class="grid-3" data-filter-grid>${posts.map(p => postCard(p)).join('')}</div>
  <p class="center muted">New entries arrive monthly, on faith and starting over. <a href="/journal/rss.xml">Subscribe by RSS</a>.</p>
</section>` : `<section class="wrap section center"><p class="lede">The first entry is on its way.</p></section>`);
  return layout({ title: 'Journal', description: 'Reflections from Laketha Hicks on faith, beginning again, and the journey behind her books.', active: 'journal', body, path: '/journal' });
}

function post(p) {
  const posts = store.publishedPosts();
  const i = posts.findIndex(x => x.id === p.id);
  const newer = posts[i - 1], older = posts[i + 1];
  let html = render(p.body);
  if (p.pullQuote) {
    const first = html.indexOf('</p>'), second = first >= 0 ? html.indexOf('</p>', first + 4) : -1;
    const at = second >= 0 ? second + 4 : (first >= 0 ? first + 4 : -1);
    if (at > 0) html = html.slice(0, at) + `\n<aside class="pullquote" aria-hidden="true"><p>“${esc(p.pullQuote)}”</p></aside>` + html.slice(at);
  }
  const url = config.SITE_URL + '/journal/' + p.slug;
  const body = `<article class="article">
<header class="article-head">
  <div class="wrap narrow center">
    <nav class="crumbs center" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/journal">Journal</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.tag)}</span></nav>
    <p class="kicker reveal-in">${esc(p.tag)} · <time datetime="${esc(p.publishedAt)}">${fmtDate(p.publishedAt)}</time> · ${readMins(p.body)} min read</p>
    <h1 class="display reveal-in" style="--d:.1s">${esc(p.title)}</h1>
    ${p.excerpt ? `<p class="lede reveal-in" style="--d:.2s">${esc(p.excerpt)}</p>` : ''}
    <div class="byline reveal-in" style="--d:.3s"><img src="${A.selfie}" alt="" width="48" height="48"><span><b>Laketha Hicks</b><span>Author of <i>Redemption</i> and <i>Redemptions Journey</i></span></span></div>
  </div>
  ${p.cover ? `<div class="wrap"><div class="article-hero zoom reveal-in" style="--d:.3s"><img src="${esc(p.cover)}" alt="" data-parallax="-0.05"></div></div>` : ''}
</header>
<div class="prose wrap narrow">
${html}
<p class="signature script">Laketha</p>
<div class="release-note">${releasePanel('If this entry met you where you are, let a butterfly go for someone walking the same road.')}</div>
<div class="share"><span>Share</span><a class="chip-link" href="mailto:?subject=${encodeURIComponent(p.title)}&body=${encodeURIComponent(url)}">Email</a><a class="chip-link" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">Facebook</a><button type="button" class="chip-link" data-copy="${esc(url)}">Copy link</button></div>
</div>
</article>
<section class="wrap section-sm grid-2">
  ${older ? `<a class="adj lift" href="/journal/${esc(older.slug)}"><span class="kicker">← Previous entry</span><span class="adj-title">${esc(older.title)}</span></a>` : '<span></span>'}
  ${newer ? `<a class="adj lift right" href="/journal/${esc(newer.slug)}"><span class="kicker">Next entry →</span><span class="adj-title">${esc(newer.title)}</span></a>` : ''}
</section>
<section class="wrap section-sm"><div class="cta-navy reveal"><div class="cta-books"><img src="${A.cov1}" alt=""><img src="${A.cov2}" alt=""><span><span class="cta-title">There is more to your story.</span><span class="on-dark">Read the books behind the journal.</span></span></div>${btn('/books', 'Discover the books', 'gold')}</div></section>`;
  return layout({ title: p.title, description: p.excerpt || plainText(p.body).slice(0, 155), active: 'journal', body, path: '/journal/' + p.slug, image: p.cover || A.book, type: 'article',
    jsonld: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, datePublished: p.publishedAt, dateModified: p.updatedAt, author: { '@type': 'Person', name: 'Laketha Hicks' }, image: config.SITE_URL + (p.cover || A.book), mainEntityOfPage: url } });
}

function rss() {
  const posts = store.publishedPosts().slice(0, 20);
  const x = s => esc(s);
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Laketha Hicks · Journal</title><link>${config.SITE_URL}/journal</link><description>Reflections on faith and beginning again.</description>${posts.map(p => `<item><title>${x(p.title)}</title><link>${config.SITE_URL}/journal/${x(p.slug)}</link><guid>${config.SITE_URL}/journal/${x(p.slug)}</guid><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate><description>${x(p.excerpt || plainText(p.body).slice(0, 300))}</description></item>`).join('')}</channel></rss>`;
}

function sitemap() {
  const urls = ['/', '/books', '/books/redemption', '/books/redemptions-journey', '/devotional', '/about', '/speaking', '/journal', '/contact', ...store.publishedPosts().map(p => '/journal/' + p.slug)];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${config.SITE_URL}${u}</loc></url>`).join('')}</urlset>`;
}

// ================================================================ CONTACT
function contact(query = {}) {
  const reasons = [['note', 'A reader note', 'Share what the books meant to you. With your permission, your words may appear on the site once Laketha has read them.', 'What did Redemption or Redemptions Journey mean to you?'], ['circle', 'Reading circle', 'Tell Laketha about your book club or group, and whether you would like a visit in person or by video.', 'Your group, how many readers, and which book you are reading.'], ['speaking', 'Speaking', 'Churches, women’s groups and community events are welcome. Include your date and your town.', 'Your event, your group, and the date you have in mind.'], ['signed', 'Signed copy', 'Signed copies are available by request. Laketha will reply with details.', 'Which book, how many copies, and who it is for.'], ['other', 'Something else', 'Media, partnerships, or anything on your heart.', 'How can Laketha help?']];
  const sel = Math.max(0, reasons.findIndex(r => r[0] === query.reason));
  const body = pageHeader({ kicker: 'Let’s connect', title: 'Write to <em>Laketha.</em>', lede: 'Reader notes, reading circles, speaking invitations and signed copies. Every message is read by Laketha herself.', crumb: 'Contact', right: `<div class="circle-photo"><img src="${A.book}" alt="Laketha Hicks holding Redemptions Journey" style="object-position:50% 18%"></div>` }) + `
<section class="wrap section split top" aria-labelledby="cf-h">
  <div class="form-panel reveal">
    <h2 id="cf-h" class="h3">Send a note</h2>
    <form class="js-form grid-form" action="/api/contact" method="post" data-success="Thank you. Your note is on its way to Laketha. She reads every message herself and replies by email." data-reasons>
      <label class="hp" aria-hidden="true">Leave empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      <fieldset class="full chips-field"><legend>I am writing about</legend><div class="chips light">${reasons.map((r, i) => `<label class="chip"><input type="radio" name="type" value="${r[1]}" data-hint="${esc(r[2])}" data-ph="${esc(r[3])}"${i === sel ? ' checked' : ''}><span>${r[1]}</span></label>`).join('')}</div><p class="hint-box" data-hint-box>${esc(reasons[sel][2])}</p></fieldset>
      <label>Your name<input type="text" name="name" required autocomplete="name"></label>
      <label>Email<input type="email" name="email" required autocomplete="email"></label>
      <label class="full">Your message<textarea name="message" rows="6" required placeholder="${esc(reasons[sel][3])}" data-ph-target></textarea></label>
      <button class="btn btn-dark" type="submit">Send to Laketha</button>
      <p class="fine full">Your details are used only to reply to you.</p>
    </form>
  </div>
  <aside class="stack reveal">
    <div class="zoom contact-photo"><img src="${A.selfie}" alt="Laketha Hicks smiling in a white lace top"></div>
    <div class="contact-card"><p class="kicker gold">Write directly</p><a href="mailto:${site.author.email}">${site.author.email}</a><p class="kicker gold">Based in</p><p>Harvest, Alabama · serving the Huntsville and Madison community</p></div>
  </aside>
</section>
<section class="band-paper" id="faq" aria-labelledby="faq-h"><div class="wrap section narrow">
  <div class="center reveal">${kicker('Reader questions')}<h2 id="faq-h" class="h2">Frequently <em>asked.</em></h2></div>
  <div class="accordion big">${site.faq.items.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary><span>${esc(q)}</span><span class="acc-icon">${PLUS}</span></summary><p>${esc(a)}</p></details>`).join('')}</div>
</div></section>`;
  return layout({ title: 'Contact', description: 'Write to Laketha Hicks: reader notes, reading circles, speaking invitations and signed copies.', active: 'contact', body, path: '/contact', image: A.selfie,
    jsonld: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: site.faq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) } });
}

function notFound() {
  const body = `<section class="lost"><div class="wrap center narrow">${drifters()}<div class="lost-bf float">${BF(120)}</div><p class="kicker">Page not found</p><h1 class="display">This butterfly <em>wandered off.</em></h1><p class="lede">The page you were looking for has flown somewhere else. Let’s get you back on the path.</p><div class="btn-row center">${btn('/', 'Return home', 'accent')}${btn('/journal', 'Read the journal', 'line')}</div></div></section>`;
  return layout({ title: 'Page not found', body, path: '/404' });
}

module.exports = { layout, home, books, bookDetail, devotional, about, speaking, journal, post, contact, notFound, rss, sitemap, fmtDate, BF, BF3D, A, esc, MONO, MONO_BOLD };
