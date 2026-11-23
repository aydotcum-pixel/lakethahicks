/* Laketha Hicks · site interactions. No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const live = $('[data-live]');
  const say = t => { if (live) { live.textContent = ''; setTimeout(() => (live.textContent = t), 30); } };

  // ---------------------------------------------------------------- mobile menu
  const toggle = $('.menu-toggle'), nav = $('#site-nav'), header = $('.site-header');
  if (toggle && nav) {
    const root = document.documentElement;
    const setTop = () => root.style.setProperty('--nav-top', Math.max(0, header.getBoundingClientRect().bottom) + 'px');
    const setOpen = open => {
      root.classList.toggle('menu-open', open);   // pins the header first, then measure
      setTop();
      toggle.setAttribute('aria-expanded', open);
      toggle.querySelector('.sr').textContent = open ? 'Close menu' : 'Menu';
      nav.classList.toggle('open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); toggle.focus(); } });
    addEventListener('resize', () => { if (nav.classList.contains('open')) { if (innerWidth > 1060) setOpen(false); else setTop(); } });
    addEventListener('pageshow', () => setOpen(false));
  }

  // ---------------------------------------------------------------- reveal on scroll
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.remove('pre'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    $$('.reveal').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top > innerHeight * .92) { el.classList.add('pre'); io.observe(el); }
    });
  }

  // ---------------------------------------------------------------- gentle parallax
  const par = $$('[data-parallax]');
  if (par.length && !reduce) {
    let ticking = false;
    const run = () => {
      ticking = false;
      for (const el of par) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const k = parseFloat(el.dataset.parallax) || -0.05;
        el.style.transform = `translateY(${((r.top + r.height / 2) - innerHeight / 2) * k}px) scale(1.08)`;
      }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  // ---------------------------------------------------------------- the butterfly garden
  // Released butterflies fly to a resting place on the page (a heading, a book,
  // a photo), settle with slow wingbeats, and lift off when the cursor comes close.
  const garden = document.createElement('div');
  garden.className = 'garden'; garden.setAttribute('aria-hidden', 'true');
  document.body.appendChild(garden);
  const PAL = [['#2451c7', '#9cc0ff'], ['#3b6fe0', '#dce6fb'], ['#1e3a8a', '#7fa7f5'], ['#4f86f7', '#ffffff'], ['#2a5bd7', '#e2c27a'], ['#5b8def', '#dce6fb']];
  const WL = ([a, b]) => `<svg viewBox="0 0 30 50"><path d="M30 25 C22 4 2 -1 2 13 C2 25 17 29 30 25Z" fill="${a}"/><path d="M30 24 C24 12 12 9 10 15 C9 21 19 24 30 24Z" fill="${b}" opacity=".55"/><path d="M30 26 C19 30 9 41 16 47 C23 51 29 38 30 27Z" fill="${a}" opacity=".88"/><circle cx="11" cy="12" r="2.4" fill="#e2c27a"/></svg>`;
  const WR = ([a, b]) => `<svg viewBox="30 0 30 50"><path d="M30 25 C38 4 58 -1 58 13 C58 25 43 29 30 25Z" fill="${a}"/><path d="M30 24 C36 12 48 9 50 15 C51 21 41 24 30 24Z" fill="${b}" opacity=".55"/><path d="M30 26 C41 30 51 41 44 47 C37 51 31 38 30 27Z" fill="${a}" opacity=".88"/><circle cx="49" cy="12" r="2.4" fill="#e2c27a"/></svg>`;
  const svgFor = (pal, size, flap) => `<span class="bf3d" style="--w:${size}px;--flap:${flap}s"><span class="wing wl">${WL(pal)}</span><span class="wing wr">${WR(pal)}</span><span class="body"></span></span>`;

  const flyers = [];
  const MAX_RESTING = 14;
  let rafOn = false;
  const pointer = { x: -999, y: -999 };

  function perchesInView() {
    const top = scrollY, bottom = scrollY + innerHeight;
    return $$('[data-perch], main .h2, .post-card-img, .arch, .shelf-title').filter(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || r.bottom < 40 || r.top > innerHeight - 40) return false;
      return getComputedStyle(el).visibility !== 'hidden';
    }).map(el => el.getBoundingClientRect()).map(r => ({ x: r.left + scrollX, y: r.top + scrollY, w: r.width })).filter(p => p.y > top && p.y < bottom);
  }
  function pickSpot(avoid) {
    const ps = perchesInView();
    if (!ps.length) return null;
    for (let tries = 0; tries < 14; tries++) {
      const p = ps[(Math.random() * ps.length) | 0];
      const x = p.x + p.w * (0.12 + Math.random() * 0.76);
      const crowded = flyers.some(f => (f.mode === 'rest' || (f.target && f.mode === 'fly')) && Math.hypot((f.target ? f.target.x : f.x) - x, (f.target ? f.target.y : f.y) - p.y) < 90);
      if (!crowded && (!avoid || Math.hypot(x - avoid.x, p.y - avoid.y) > 160)) return { x, y: p.y };
    }
    return null;
  }
  function make(x, y, size) {
    const el = document.createElement('div');
    el.className = 'flyer';
    el.innerHTML = svgFor(PAL[(Math.random() * PAL.length) | 0], size | 0, (0.15 + Math.random() * 0.08).toFixed(2));
    el.style.setProperty('--rest', (1.4 + Math.random() * 1.4).toFixed(2) + 's');
    garden.appendChild(el);
    return { el, x, y, vx: 0, vy: 0, size, t: 0, seed: Math.random() * 1000, mode: 'fly', target: null, life: 0, op: 1, rot: 0 };
  }
  function place(f) {
    f.el.style.opacity = f.op;
    f.el.style.transform = `translate3d(${f.x - f.size / 2}px,${f.y - f.size * .84}px,0) rotate(${f.rot}deg)`;
  }
  function release(px, py, burst) {
    const f = make(px, py, 30 + Math.random() * 22);
    const ang = -Math.PI / 2 + (Math.random() - .5) * (burst ? 2.4 : 1.2);
    f.vx = Math.cos(ang) * 4; f.vy = Math.sin(ang) * 4;
    f.target = pickSpot({ x: px, y: py });
    f.wander = 70 + Math.random() * 60; // frames of free flight before heading home
    if (!f.target) f.mode = 'away';
    flyers.push(f);
    const resting = flyers.filter(x => x.mode === 'rest');
    if (resting.length > MAX_RESTING) liftOff(resting[0], true);
    wake();
  }
  function liftOff(f, leave) {
    f.mode = leave ? 'away' : 'fly';
    f.el.classList.remove('resting');
    const dx = f.x - pointer.x, dy = f.y - pointer.y, d = Math.hypot(dx, dy) || 1;
    f.vx = dx / d * 4 + (Math.random() - .5) * 2; f.vy = -3.5 - Math.random() * 2;
    f.t = 0; f.wander = 40 + Math.random() * 40;
    f.target = leave ? null : pickSpot(pointer);
    if (!f.target) f.mode = 'away';
    wake();
  }
  function wake() { if (!rafOn) { rafOn = true; requestAnimationFrame(step); } }
  function step() {
    let active = 0;
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i];
      if (f.mode === 'rest') continue;
      active++; f.t++;
      const flutterX = Math.sin(f.t * .09 + f.seed) * .35, flutterY = Math.sin(f.t * .23 + f.seed) * .55;
      if (f.mode === 'fly' && f.target && f.t > f.wander) {
        const dx = f.target.x - f.x, dy = f.target.y - f.y, d = Math.hypot(dx, dy);
        const want = Math.min(3.2, d / 18 + .4);
        f.vx += ((dx / (d || 1)) * want - f.vx) * .06;
        f.vy += ((dy / (d || 1)) * want - f.vy) * .06;
        if (d < 3) {
          f.mode = 'rest'; f.x = f.target.x; f.y = f.target.y; f.rot = (Math.random() - .5) * 24;
          f.el.classList.add('resting'); place(f); continue;
        }
      } else {
        f.vx += Math.sin(f.t * .045 + f.seed) * .12; f.vy += Math.cos(f.t * .06 + f.seed) * .06 - .02;
        f.vx *= .985; f.vy *= .985;
      }
      f.x += f.vx + flutterX; f.y += f.vy + flutterY;
      f.rot = Math.max(-30, Math.min(30, f.vx * 8));
      if (f.mode === 'away') {
        f.life++;
        if (f.life > 200) f.op = Math.max(0, 1 - (f.life - 200) / 60);
        if (f.op <= 0 || f.y < scrollY - 140) { f.el.remove(); flyers.splice(i, 1); continue; }
      } else if (f.t > 900) { f.mode = 'away'; }
      place(f);
    }
    if (active) requestAnimationFrame(step); else rafOn = false;
  }
  // a hand coming close makes resting butterflies lift off
  addEventListener('pointermove', e => {
    pointer.x = e.pageX; pointer.y = e.pageY;
    for (const f of flyers) if (f.mode === 'rest' && Math.hypot(f.x - pointer.x, f.y - f.size * .4 - pointer.y) < 70) liftOff(f, false);
  }, { passive: true });
  addEventListener('pointerdown', e => {
    pointer.x = e.pageX; pointer.y = e.pageY;
    for (const f of flyers) if (f.mode === 'rest' && Math.hypot(f.x - pointer.x, f.y - pointer.y) < 90) liftOff(f, false);
  }, { passive: true });

  // a few butterflies are already resting when the page opens
  if (!reduce) setTimeout(() => {
    const n = $('.hero') ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const spot = pickSpot(); if (!spot) break;
      const f = make(spot.x, spot.y, 26 + Math.random() * 14);
      f.mode = 'rest'; f.rot = (Math.random() - .5) * 24; f.el.classList.add('resting'); f.op = 0; place(f);
      flyers.push(f);
      setTimeout(() => { f.el.style.transition = 'opacity 1.2s ease'; f.op = 1; place(f); }, 200 + i * 450);
    }
  }, 1400);

  function setTotals(n) {
    $$('[data-bf-total]').forEach(el => {
      el.textContent = Number(n).toLocaleString('en-US');
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    });
  }
  const spawn = (cx, cy, burst) => { if (!reduce) release(cx + scrollX, cy + scrollY, burst); };
  window.LH = Object.assign(window.LH || {}, { spawn: (x, y) => { for (let i = 0; i < 5; i++) setTimeout(() => spawn(x + (Math.random() - .5) * 80, y, true), i * 90); } });
  $$('[data-release]').forEach(b => b.addEventListener('click', async e => {
    const r = b.getBoundingClientRect();
    const x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top + r.height / 2;
    spawn(x, y, false);
    try {
      const res = await fetch('/api/butterfly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const { count } = await res.json();
      if (res.ok) {
        setTotals(count);
        if (count % 10 === 0) { for (let i = 0; i < 9; i++) setTimeout(() => spawn(x + (Math.random() - .5) * 60, y, true), i * 70); say(`A flutter of butterflies! ${count} released by readers.`); }
        else say(`Butterfly released. ${count} released by readers.`);
      } else say('Butterfly released.');
    } catch { say('Butterfly released.'); }
  }));

  // ---------------------------------------------------------------- 3D books follow the pointer
  if (!reduce && matchMedia('(hover: hover)').matches) $$('[data-tilt]').forEach(book => {
    const host = book.closest('a, .book-cover, .shelf-cover, .page-head-art, .devo-book') || book;
    host.addEventListener('pointermove', e => {
      const r = book.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      book.style.setProperty('--ry', (-14 + dx * 22).toFixed(1) + 'deg');
      book.style.setProperty('--rx', (2 - dy * 10).toFixed(1) + 'deg');
    });
    host.addEventListener('pointerleave', () => { book.style.removeProperty('--ry'); book.style.removeProperty('--rx'); });
  });

  // ---------------------------------------------------------------- a vine climbs her portrait frame and blooms
  $$('[data-arch-vine]').forEach(svg => {
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    const stem = svg.querySelector('.vine-stem');
    const len = stem.getTotalLength();
    const DUR = 2600, DELAY = 900;
    stem.style.strokeDasharray = len; stem.style.strokeDashoffset = reduce ? 0 : len;
    const cols = ['#2451c7', '#3b6fe0', '#5b8def', '#9cc0ff'];
    for (let s = 26, i = 0; s < len - 10; s += 30 + (i * 13) % 22, i++) {
      const p = stem.getPointAtLength(s), q = stem.getPointAtLength(Math.min(len, s + 1));
      const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI, out = i % 2 ? 1 : -1;
      const g = mk('g', { class: 'vine-node', transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(1)})` });
      g.appendChild(mk('path', { class: 'thorn', d: `M0 0 L${out * 2} ${out * -7} L${out * -2} 0Z` }));
      g.appendChild(mk('path', { class: 'leaf', d: 'M0 0 C6 -5 15 -5 21 0 C15 5 6 5 0 0Z', transform: `rotate(${out * 58})` }));
      if (i % 3 !== 1) {
        const b = mk('g', { class: 'bloom', transform: `translate(${out * 7} ${out * -9}) scale(${(0.9 + (i % 4) * .18).toFixed(2)})` });
        for (let k = 0; k < 5; k++) { const a = k * 72 * Math.PI / 180; b.appendChild(mk('ellipse', { cx: (Math.cos(a) * 4.6).toFixed(2), cy: (Math.sin(a) * 4.6).toFixed(2), rx: 4, ry: 3, fill: cols[(i + k) % 4], transform: `rotate(${k * 72} ${(Math.cos(a) * 4.6).toFixed(2)} ${(Math.sin(a) * 4.6).toFixed(2)})` })); }
        b.appendChild(mk('circle', { r: 2.2, fill: '#e2c27a' }));
        g.appendChild(b);
      }
      svg.appendChild(g);
      const at = reduce ? 0 : DELAY + (s / len) * DUR;
      setTimeout(() => g.classList.add('reached'), at);
      setTimeout(() => g.classList.add('open'), at + (reduce ? 0 : 500));
    }
    if (!reduce) requestAnimationFrame(() => { stem.style.transition = `stroke-dashoffset ${DUR}ms cubic-bezier(.45,.05,.3,1) ${DELAY}ms`; stem.style.strokeDashoffset = 0; });
  });

  // ---------------------------------------------------------------- the vine: thorns become blossoms as you read
  const vineSvg = $('[data-vine]');
  if (vineSvg) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
    let stem, len = 0, nodes = [];
    const PETALS = ['#2451c7', '#3b6fe0', '#5b8def', '#9cc0ff'];
    function blossom(c) {
      const g = el('g', { class: 'bloom' });
      for (let i = 0; i < 5; i++) {
        const a = i * 72 * Math.PI / 180;
        g.appendChild(el('ellipse', { cx: (Math.cos(a) * 5.2).toFixed(2), cy: (Math.sin(a) * 5.2).toFixed(2), rx: 4.6, ry: 3.4, fill: c, transform: `rotate(${i * 72} ${(Math.cos(a) * 5.2).toFixed(2)} ${(Math.sin(a) * 5.2).toFixed(2)})` }));
      }
      g.appendChild(el('circle', { r: 2.6, fill: '#e2c27a' }));
      return g;
    }
    function build() {
      vineSvg.innerHTML = '';
      const host = vineSvg.parentElement, W = host.clientWidth, H = host.scrollHeight;
      const wrap = $('.wrap', host.parentElement) || host;
      const gutter = Math.max(28, (W - Math.min(W, 1320)) / 2 + 8);
      const left = Math.max(22, gutter * .42), right = W - left;
      vineSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      // a gentle S-curve that travels down the left margin, crosses once, and finishes on the right
      let d = `M${left} 0`, y = 0, side = 0;
      const seg = 340;
      while (y < H - seg) {
        const x0 = side ? right : left;
        const swing = (side ? -1 : 1) * Math.min(26, gutter * .35);
        d += ` C${x0 + swing} ${y + seg * .33}, ${x0 - swing} ${y + seg * .66}, ${x0} ${y + seg}`;
        y += seg;
      }
      stem = el('path', { d, class: 'vine-stem' });
      vineSvg.appendChild(stem);
      len = stem.getTotalLength();
      stem.style.strokeDasharray = len; stem.style.strokeDashoffset = len;
      nodes = [];
      const step = 120;
      for (let s = 140, i = 0; s < len - 40; s += step + ((i * 37) % 50), i++) {
        const p = stem.getPointAtLength(s), q = stem.getPointAtLength(Math.min(len, s + 2));
        const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
        const out = i % 3 === 2 ? 1 : -1; const reach = out > 0 ? 10 : 16;
        const g = el('g', { class: 'vine-node', transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` });
        g.appendChild(el('path', { class: 'thorn', d: 'M0 -1.6 L9 0 L0 1.6Z', transform: `rotate(${ang + 90 * out})` }));
        g.appendChild(el('path', { class: 'vine-tendril', d: `M0 0 q ${out * reach * .6} -6 ${out * reach} -18` }));
        const leaf = el('path', { class: 'leaf', d: 'M0 0 C8 -7 19 -7 27 0 C19 7 8 7 0 0Z', transform: `rotate(${ang + 90 * -out + (out * 30)})` });
        g.appendChild(leaf);
        if (i % 2 === 0 || i % 5 === 1) { const b = blossom(PETALS[i % PETALS.length]); b.setAttribute('transform', `translate(${out * reach} -18) scale(${(out > 0 ? 1.05 : 1.3 + (i % 3) * .22).toFixed(2)})`); g.appendChild(b); }
        vineSvg.appendChild(g);
        nodes.push({ g, s });
      }
      draw();
    }
    function draw() {
      if (!stem) return;
      const host = vineSvg.parentElement;
      const r = host.getBoundingClientRect();
      const progress = reduce ? 1 : Math.max(0, Math.min(1, (innerHeight * .78 - r.top) / r.height));
      const drawn = len * progress;
      stem.style.strokeDashoffset = (len - drawn).toFixed(1);
      for (const n of nodes) { n.g.classList.toggle('reached', n.s < drawn); n.g.classList.toggle('open', n.s < drawn - 170); }
    }
    let vt = false;
    addEventListener('scroll', () => { if (!vt) { vt = true; requestAnimationFrame(() => { vt = false; draw(); }); } }, { passive: true });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
    if (document.readyState === 'complete') build(); else addEventListener('load', build);
  }

  // ---------------------------------------------------------------- tabs (books)
  $$('[data-tabs]').forEach(list => {
    const tabs = $$('[role=tab]', list);
    const select = (t, focus) => {
      tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; const p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
      if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    const want = { '#book-three': 2, '#devotional': 3 }[location.hash];
    if (want !== undefined && tabs[want]) { select(tabs[want]); setTimeout(() => list.scrollIntoView({ block: 'start' }), 60); }
  });

  // ---------------------------------------------------------------- journal filter
  const filter = $('[data-filter]'), fgrid = $('[data-filter-grid]');
  if (filter && fgrid) filter.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', filter).forEach(x => x.setAttribute('aria-pressed', x === b));
    const tag = b.dataset.tag; let n = 0;
    $$('.post-card', fgrid).forEach(c => { const show = tag === 'All' || c.dataset.tag === tag; c.classList.toggle('is-hidden', !show); if (show) { n++; c.classList.remove('pre'); } });
    say(`${n} ${n === 1 ? 'entry' : 'entries'} shown.`);
  });

  // ---------------------------------------------------------------- devotional explorer
  const dataEl = $('#days-data');
  if (dataEl) {
    const days = JSON.parse(dataEl.textContent);
    const moves = $$('[data-moves] button'), grid = $('[data-days]'), card = $('[data-day-card]');
    const names = ['Faith', 'Resilience', 'Healing', 'Purpose'];
    let cur = 1;
    const mvOf = n => moves.findIndex(m => n >= +m.dataset.from && n <= +m.dataset.to);
    function drawGrid(mi) {
      const m = moves[mi];
      grid.innerHTML = '';
      for (let n = +m.dataset.from; n <= +m.dataset.to; n++) {
        const d = days[n - 1];
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = n; b.setAttribute('aria-label', `Day ${n}: ${d.t}`); b.setAttribute('aria-pressed', n === cur);
        b.addEventListener('click', () => show(n));
        grid.appendChild(b);
      }
    }
    function show(n, fromMove) {
      if (n < 1) n = 30; if (n > 30) n = 1;
      cur = n;
      const mi = mvOf(n), d = days[n - 1];
      moves.forEach((m, i) => m.setAttribute('aria-selected', i === mi));
      drawGrid(mi);
      const f = { n, mv: names[mi], t: d.t, v: d.v, r: d.r, o: d.o, w: d.w };
      $$('[data-f]', card).forEach(el => (el.textContent = f[el.dataset.f]));
      $('[data-progress]', card).style.width = (n / 30 * 100) + '%';
      card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    }
    moves.forEach(m => m.addEventListener('click', () => show(+m.dataset.from, true)));
    $('[data-prev]', card).addEventListener('click', () => show(cur - 1));
    $('[data-next]', card).addEventListener('click', () => show(cur + 1));
    const hash = location.hash.match(/day-(\d+)/);
    show(hash ? +hash[1] : 1);
  }

  // ---------------------------------------------------------------- portrait gallery
  const gal = $('[data-gallery]');
  if (gal) {
    const img = $('[data-g-img]', gal), btns = $$('.gallery-thumbs button', gal);
    btns.forEach((b, i) => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', x === b));
      img.classList.add('fading');
      setTimeout(() => {
        img.src = b.dataset.src; img.alt = b.dataset.title; img.style.objectPosition = b.dataset.pos;
        $('[data-g-title]', gal).textContent = b.dataset.title; $('[data-g-cap]', gal).textContent = b.dataset.cap;
        $('[data-g-num]', gal).textContent = `${i + 1} / ${btns.length}`;
        img.onload = () => img.classList.remove('fading'); if (img.complete) img.classList.remove('fading');
      }, reduce ? 0 : 220);
    }));
  }

  // ---------------------------------------------------------------- contact reason hints
  const reasons = $('[data-reasons]');
  if (reasons) reasons.addEventListener('change', e => {
    if (e.target.name !== 'type') return;
    $('[data-hint-box]', reasons).textContent = e.target.dataset.hint;
    $('[data-ph-target]', reasons).placeholder = e.target.dataset.ph;
  });

  // ---------------------------------------------------------------- forms
  $$('.js-form').forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    $('.form-err', form)?.remove();
    const data = Object.fromEntries(new FormData(form));
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Something went wrong. Please try again.');
      const ok = document.createElement('div');
      ok.className = 'form-ok'; ok.setAttribute('role', 'status'); ok.tabIndex = -1;
      ok.innerHTML = '<i aria-hidden="true">✓</i><span></span>';
      ok.lastChild.textContent = form.dataset.success || 'Thank you.';
      form.replaceWith(ok); ok.focus();
      const r = ok.getBoundingClientRect(); spawn(r.left + 24, r.top + 24, false);
    } catch (err) {
      const p = document.createElement('p'); p.className = 'form-err'; p.setAttribute('role', 'alert'); p.textContent = err.message;
      form.appendChild(p); btn.disabled = false; btn.textContent = label;
    }
  }));

  // ---------------------------------------------------------------- copy link
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Link copied'; } catch { b.textContent = b.dataset.copy; }
  }));
})();

// ---------------------------------------------------------------- weekly study: mark days read (kept on this device)
(function () {
  const plan = document.querySelector('[data-plan]');
  if (!plan) return;
  const key = 'lh-study-' + plan.dataset.plan;
  let done = [];
  try { done = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { done = []; }
  const boxes = [...plan.querySelectorAll('[data-plan-check]')];
  const prog = document.querySelector('[data-plan-progress]');
  const update = () => {
    const n = boxes.filter(b => b.checked).length;
    boxes.forEach(b => b.closest('.plan-day').classList.toggle('done', b.checked));
    if (prog) {
      prog.querySelector('.pp-bar span').style.width = (n / boxes.length * 100) + '%';
      prog.querySelector('.pp-text').textContent = n === boxes.length ? 'All ' + n + ' days read. Well done.' : n + ' of ' + boxes.length + ' read';
      prog.classList.toggle('complete', n === boxes.length);
    }
  };
  boxes.forEach(b => {
    b.checked = done.includes(+b.dataset.planCheck);
    b.addEventListener('change', () => {
      const d = boxes.filter(x => x.checked).map(x => +x.dataset.planCheck);
      try { localStorage.setItem(key, JSON.stringify(d)); } catch (e) { /* private mode */ }
      update();
      if (b.checked && boxes.every(x => x.checked) && window.LH && window.LH.spawn) {
        const r = b.getBoundingClientRect(); window.LH.spawn(r.left + r.width / 2, r.top);
      }
    });
  });
  update();
})();
