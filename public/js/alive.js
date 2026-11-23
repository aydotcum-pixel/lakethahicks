/* The page breathes: gusts of breeze through the vine, petals letting go and
 * tumbling down, motes of pollen drifting in the light at the top of the home
 * page and stirred by the cursor and by passing butterflies.
 * Transform-only, paused off screen and when the tab is hidden.
 */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const small = innerWidth < 760;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const BF = () => window.Butterflies;

  // ------------------------------------------------------------ breeze
  // A gust runs along the vine like a wave, strongest where it starts.
  function gust(from) {
    const nodes = [...document.querySelectorAll('.vine-node.open')].filter(n => {
      const r = n.getBoundingClientRect(); return r.bottom > -40 && r.top < innerHeight + 40;
    });
    if (!nodes.length) return;
    const y0 = from == null ? (Math.random() < .5 ? 0 : innerHeight) : from;
    nodes.forEach(n => {
      const r = n.getBoundingClientRect();
      const delay = Math.abs(r.top - y0) * 1.6 + rnd(0, 120);
      setTimeout(() => {
        n.classList.remove('gust'); void n.getBoundingClientRect(); n.classList.add('gust');
        setTimeout(() => n.classList.remove('gust'), 1700);
      }, delay);
    });
    if (Math.random() < .7) setTimeout(dropPetal, rnd(200, 700));
  }
  let lastGust = 0;
  addEventListener('scroll', () => {
    const w = BF() ? Math.abs(BF().wind()) : 0, now = performance.now();
    if (w > 90 && now - lastGust > 2600) { lastGust = now; gust(); }
  }, { passive: true });
  (function loop() { setTimeout(() => { if (!document.hidden) gust(); loop(); }, rnd(9000, 16000)); })();

  // ------------------------------------------------------------ petals
  let layer = document.querySelector('.garden');
  const petals = [];
  let petalRun = false;
  function dropPetal() {
    if (document.hidden || petals.length > (small ? 3 : 6)) return;
    layer = layer || document.querySelector('.garden');
    if (!layer) return;
    const blooms = [...document.querySelectorAll('.arch-vine .vine-node.open .bloom, [data-vine] .vine-node.open .bloom')].filter(b => {
      const r = b.getBoundingClientRect(); return r.width > 3 && r.top > 60 && r.bottom < innerHeight - 40;
    });
    if (!blooms.length) return;
    const bloom = blooms[(Math.random() * blooms.length) | 0];
    const r = bloom.getBoundingClientRect();
    const ell = bloom.querySelectorAll('ellipse');
    const col = ell.length ? ell[(Math.random() * ell.length) | 0].getAttribute('fill') : '#5b8def';
    const s = Math.max(.7, Math.min(1.5, r.width / 16));
    const el = document.createElement('span');
    el.className = 'petal';
    el.style.setProperty('--pc', col);
    el.style.setProperty('--pc2', 'color-mix(in srgb, ' + col + ' 55%, white)');
    el.innerHTML = '<i></i>';
    layer.appendChild(el);
    petals.push({
      el, i: el.firstChild, x: r.left + r.width / 2 + scrollX + rnd(-4, 4), y: r.top + r.height / 2 + scrollY,
      vx: rnd(-8, 8), vy: 0, s, t: 0, life: rnd(6, 9), rx: rnd(0, 6), ry: rnd(0, 6), rz: rnd(0, 360),
      wx: rnd(1.6, 2.6), wy: rnd(2.2, 3.4), wz: rnd(-90, 90), sway: rnd(14, 26), phase: rnd(0, 6),
    });
    if (!petalRun) { petalRun = true; last = performance.now(); requestAnimationFrame(fall); }
  }
  let last = 0;
  function fall(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const wind = BF() ? BF().wind() : 0;
    for (let k = petals.length - 1; k >= 0; k--) {
      const p = petals[k];
      p.t += dt;
      // a light petal falls slowly and side-slips as it tumbles
      const tumble = Math.sin(p.t * p.wx + p.phase);
      p.vy += (42 + 18 * Math.abs(tumble) - p.vy) * Math.min(1, 1.6 * dt) + wind * .02 * dt;
      p.vx += (tumble * p.sway + 14 - p.vx) * Math.min(1, 1.4 * dt);
      // butterflies flying close push the petal through the air
      if (BF()) for (const b of BF().positions()) {
        if (!b.flying) continue;
        const dx = p.x - scrollX - b.x, dy = p.y - scrollY - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 3600) { p.vx += b.vx * .9 * dt; p.vy += b.vy * .9 * dt; }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rx += p.wx * 60 * dt; p.ry += p.wy * 50 * dt; p.rz += p.wz * dt;
      const fade = Math.min(1, p.t * 3) * Math.min(1, (p.life - p.t) / 1.2);
      p.el.style.opacity = Math.max(0, fade).toFixed(3);
      p.el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      p.i.style.transform = `rotateZ(${p.rz.toFixed(0)}deg) rotateX(${p.rx.toFixed(0)}deg) rotateY(${p.ry.toFixed(0)}deg) scale(${p.s.toFixed(2)})`;
      if (p.t >= p.life || p.y - scrollY > innerHeight + 30) { p.el.remove(); petals.splice(k, 1); }
    }
    if (petals.length && !document.hidden) requestAnimationFrame(fall);
    else { petalRun = false; petals.forEach(p => p.el.remove()); petals.length = 0; }
  }
  setTimeout(dropPetal, 5200);

  // ------------------------------------------------------------ motes in the light
  const cv = document.querySelector('[data-motes]');
  if (!cv) return;
  const host = cv.parentElement, ctx = cv.getContext('2d');
  const DPR = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0, visible = true, running = false;
  const N = small ? 16 : 34;
  const motes = [];
  function size() {
    const r = host.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size(); addEventListener('resize', size);
  for (let i = 0; i < N; i++) motes.push({
    x: rnd(0, W), y: rnd(0, H), z: rnd(.35, 1), vx: rnd(-4, 4), vy: rnd(-3, 2), ph: rnd(0, 6.3), tw: rnd(.4, 1.1),
  });
  const ptr = { x: -999, y: -999, vx: 0, vy: 0, t: 0 };
  host.addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect(), now = performance.now(), d = Math.max(16, now - ptr.t) / 1000;
    const x = e.clientX - r.left, y = e.clientY - r.top;
    ptr.vx = (x - ptr.x) / d; ptr.vy = (y - ptr.y) / d; ptr.x = x; ptr.y = y; ptr.t = now;
  }, { passive: true });
  host.addEventListener('pointerleave', () => { ptr.x = ptr.y = -999; });

  let lt = 0;
  function draw(now) {
    const dt = Math.min(.05, (now - lt) / 1000); lt = now;
    ctx.clearRect(0, 0, W, H);
    const hr = host.getBoundingClientRect();
    const bfs = BF() ? BF().positions().filter(b => b.flying) : [];
    const T = now / 1000;
    for (const m of motes) {
      // brownian drift, a slow updraft, and the air pushed by the cursor and wings
      m.vx += rnd(-6, 6) * dt; m.vy += (rnd(-6, 6) - 1.2) * dt;
      const dx = m.x - ptr.x, dy = m.y - ptr.y, d2 = dx * dx + dy * dy;
      if (d2 < 9000) { const k = (1 - d2 / 9000) * dt; m.vx += ptr.vx * .25 * k + dx * 1.2 * k; m.vy += ptr.vy * .25 * k + dy * 1.2 * k; }
      for (const b of bfs) {
        const bx = m.x - (b.x - hr.left), by = m.y - (b.y - hr.top), e2 = bx * bx + by * by;
        if (e2 < 6400) { const k = (1 - e2 / 6400) * dt; m.vx += (bx * 3 + b.vx * .4) * k; m.vy += (by * 3 + b.vy * .4) * k; }
      }
      m.vx *= 1 - .9 * dt; m.vy *= 1 - .9 * dt;
      m.vx = Math.max(-60, Math.min(60, m.vx)); m.vy = Math.max(-60, Math.min(60, m.vy));
      m.x += m.vx * dt * m.z; m.y += m.vy * dt * m.z;
      if (m.x < -10) m.x = W + 10; if (m.x > W + 10) m.x = -10;
      if (m.y < -10) m.y = H + 10; if (m.y > H + 10) m.y = -10;
      // brighter where the sun falls (upper left), glinting as they turn
      const light = Math.max(0, 1 - (m.x / W * .7 + m.y / H * .8));
      const glint = .5 + .5 * Math.sin(T * m.tw * 2 + m.ph);
      const a = (.16 + .5 * light) * (.45 + .55 * glint) * m.z;
      const rad = (.7 + 1.5 * m.z) * (1 + .3 * glint);
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, rad * 3);
      g.addColorStop(0, `rgba(255,246,222,${Math.min(.95, a * 1.6).toFixed(3)})`);
      g.addColorStop(.35, `rgba(214,176,92,${a.toFixed(3)})`);
      g.addColorStop(1, 'rgba(214,176,92,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(m.x, m.y, rad * 3, 0, 6.283); ctx.fill();
    }
    if (visible && !document.hidden) requestAnimationFrame(draw); else running = false;
  }
  function go() { if (!running && visible && !document.hidden) { running = true; lt = performance.now(); requestAnimationFrame(draw); } }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; go(); }).observe(host);
  document.addEventListener('visibilitychange', go);
  go();
})();
