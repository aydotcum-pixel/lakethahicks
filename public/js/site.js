/* Laketha Hicks · site interactions. No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still\b/.test(location.search);
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

  // ---------------------------------------------------------------- butterflies: see butterflies.js
  function setTotals(n) {
    $$('[data-bf-total]').forEach(el => {
      el.textContent = Number(n).toLocaleString('en-US');
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    });
  }
  const spawn = (cx, cy, burst) => { if (!reduce && window.Butterflies) window.Butterflies.release(cx, cy, { burst }); };
  window.LH = Object.assign(window.LH || {}, { spawn: (x, y) => { if (window.Butterflies) window.Butterflies.flutter(x, y, 5); } });
  $$('[data-release]').forEach(b => b.addEventListener('click', async e => {
    const r = b.getBoundingClientRect();
    const x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top + r.height / 2;
    spawn(x, y, false);
    try {
      const res = await fetch('/api/butterfly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const { count } = await res.json();
      if (res.ok) {
        setTotals(count);
        if (count % 10 === 0) { if (window.Butterflies) window.Butterflies.flutter(x, y, 7); say(`A flutter of butterflies! ${count} released by readers.`); }
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
        const sw = mk('g', { class: 'sway', style: `--bz:${(5.8 + (i % 5) * .55).toFixed(1)}s;--bd:${(-(s / len) * 2.4).toFixed(2)}s` }); b.appendChild(sw);
        for (let k = 0; k < 5; k++) { const a = k * 72 * Math.PI / 180; sw.appendChild(mk('ellipse', { cx: (Math.cos(a) * 4.6).toFixed(2), cy: (Math.sin(a) * 4.6).toFixed(2), rx: 4, ry: 3, fill: cols[(i + k) % 4], transform: `rotate(${k * 72} ${(Math.cos(a) * 4.6).toFixed(2)} ${(Math.sin(a) * 4.6).toFixed(2)})` })); }
        sw.appendChild(mk('circle', { r: 2.2, fill: '#e2c27a' }));
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
      const outer = el('g', { class: 'bloom' }), g = el('g', { class: 'sway', style: `--bz:${(5.5 + Math.random() * 3).toFixed(1)}s;--bd:${(-Math.random() * 8).toFixed(1)}s` });
      outer.appendChild(g);
      for (let i = 0; i < 5; i++) {
        const a = i * 72 * Math.PI / 180;
        g.appendChild(el('ellipse', { cx: (Math.cos(a) * 5.2).toFixed(2), cy: (Math.sin(a) * 5.2).toFixed(2), rx: 4.6, ry: 3.4, fill: c, transform: `rotate(${i * 72} ${(Math.cos(a) * 5.2).toFixed(2)} ${(Math.sin(a) * 5.2).toFixed(2)})` }));
      }
      g.appendChild(el('circle', { r: 2.6, fill: '#e2c27a' }));
      return outer;
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
  $$('[data-copy-text]').forEach(b => b.addEventListener('click', async () => {
    const el = document.getElementById(b.dataset.copyText); if (!el) return;
    const t = [...el.querySelectorAll('p')].map(p => p.textContent).join('\n\n') || el.textContent;
    try { await navigator.clipboard.writeText(t); b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 2000); } catch { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
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
