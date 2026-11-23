/* Lifelike butterflies for lakethahicks.com.
 *
 * Blue Morphos (her blue) and Monarchs (the butterflies on the Book One cover),
 * painted wing textures folded in real 3D. Flight in bursts and glides, body bob
 * on each downstroke, banking into turns, a shadow that follows altitude.
 * They rest on headings, photos and book covers: wings closed showing the
 * eye-spotted undersides, then slowly opening to flash the colour.
 *
 * Interaction
 *   - hold the cursor still: one comes and lands on it, and follows gentle moves
 *   - quick movement nearby startles them
 *   - tap or click an empty spot: one flies to you and settles there
 *   - tap or click a resting butterfly: it takes off
 *   - scrolling stirs the air for the ones in flight
 * Everything is transform-only and pauses when the tab is hidden.
 */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const small = innerWidth < 760;
  const V = (document.querySelector('script[src*="butterflies.js"]') || {}).src || '';
  const ver = (V.split('?')[1] || '');
  const A = n => '/assets/butterflies/' + n + '.webp' + (ver ? '?' + ver : '');
  const SPECIES = {
    morpho: { top: A('morpho-dorsal'), topR: A('morpho-dorsal-r'), under: A('morpho-ventral-r'), underR: A('morpho-ventral'), body: A('morpho-body'), span: [70, 94], hz: 5.2, glide: .35, weight: .68, sheen: true },
    monarch: { top: A('monarch-dorsal'), topR: A('monarch-dorsal-r'), under: A('monarch-ventral-r'), underR: A('monarch-ventral'), body: A('monarch-body'), span: [60, 78], hz: 6.4, glide: .45, weight: .32, sheen: false },
  };
  if (small) { SPECIES.morpho.span = [54, 68]; SPECIES.monarch.span = [46, 58]; }
  const MAX = small ? 6 : 9;
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

  // preload textures so the first flight is crisp
  Object.values(SPECIES).forEach(s => [s.top, s.topR, s.under, s.underR, s.body].forEach(src => { const i = new Image(); i.decoding = 'async'; i.src = src; }));

  // ------------------------------------------------------------------ the layer
  let garden = document.querySelector('.garden');
  if (!garden) {
    garden = document.createElement('div');
    garden.className = 'garden';
    garden.setAttribute('aria-hidden', 'true');
    document.body.appendChild(garden);
  }
  if (reduce) { window.Butterflies = { release() {}, flutter() {}, count: () => 0 }; return; }

  // the layer covers the whole page but clips, so a butterfly off the edge never widens it
  let sizeT = 0;
  const sizeGarden = () => { garden.style.height = document.documentElement.scrollHeight + 'px'; };
  sizeGarden(); addEventListener('resize', sizeGarden);
  const flock = [];
  const pointer = { x: -9999, y: -9999, cx: 0, cy: 0, vx: 0, vy: 0, t: 0, still: 0, inside: false, onUI: false };
  let last = performance.now(), running = false, lastScrollY = scrollY, wind = 0;

  // ------------------------------------------------------------------ perches
  const PERCH_SEL = '[data-perch], main .h2, main .display, .post-card-img, .arch, .shelf-title, .book3d, .word-card, .review, .study-card, .def-card';
  const FLOWERS = '.arch-vine .vine-node.open .bloom, [data-vine] .vine-node.open .bloom';
  function perches() {
    const out = [];
    for (const el of document.querySelectorAll(FLOWERS)) {   // flowers first: they love the vine
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.bottom < 80 || r.top > innerHeight - 30) continue;
      out.push({ x: r.left + r.width / 2 + scrollX, y: r.top + r.height * .35 + scrollY, w: 0, el, flower: true });
    }
    for (const el of document.querySelectorAll(PERCH_SEL)) {
      const r = el.getBoundingClientRect();
      if (r.width < 60 || r.bottom < 70 || r.top > innerHeight - 30) continue;
      if (el.closest('.site-nav, header')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      out.push({ x: r.left + scrollX, y: r.top + scrollY, w: r.width });
    }
    return out;
  }
  function pickPerch(avoid) {
    const ps = perches();
    for (let k = 0; k < 18 && ps.length; k++) {
      const p = ps[(Math.random() * ps.length) | 0];
      if (!p.flower && ps.some(q => q.flower) && Math.random() < .45) continue;   // favour flowers when there are some
      const x = p.x + p.w * rnd(.1, .9), y = p.y + (p.flower ? 0 : 2);
      if (y - scrollY < 90) continue;
      const crowded = flock.some(b => {
        const t = b.goal || b;
        return Math.hypot(t.x - x, t.y - y) < 110;
      });
      if (crowded) continue;
      if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < 180) continue;
      return { x, y, kind: p.flower ? 'flower' : 'perch', el: p.el };
    }
    return null;
  }

  // ------------------------------------------------------------------ one butterfly
  function make(species, x, y) {
    const S = SPECIES[species];
    const span = rnd(S.span[0], S.span[1]);
    const el = document.createElement('div');
    el.className = 'rb rb-' + species;
    el.style.setProperty('--span', span.toFixed(1) + 'px');
    const sheen = src => S.sheen ? `<span class="rb-sheen" style="-webkit-mask-image:url(${src});mask-image:url(${src})"></span>` : '';
    el.innerHTML =
      '<span class="rb-shadow"></span>' +
      '<span class="rb-tilt">' +
        `<span class="rb-wing rb-l"><img class="rb-top" src="${S.top}" alt="" draggable="false">${sheen(S.top)}<img class="rb-under" src="${S.under}" alt="" draggable="false"></span>` +
        `<span class="rb-wing rb-r"><img class="rb-top" src="${S.topR}" alt="" draggable="false">${sheen(S.topR)}<img class="rb-under" src="${S.underR}" alt="" draggable="false"></span>` +
        `<img class="rb-body" src="${S.body}" alt="" draggable="false">` +
      '</span>';
    garden.appendChild(el);
    const b = {
      el, tilt: el.querySelector('.rb-tilt'), wl: el.querySelector('.rb-l'), wr: el.querySelector('.rb-r'), shadow: el.querySelector('.rb-shadow'),
      species, S, span, x, y, vx: 0, vy: 0, heading: rnd(-.4, .4), bank: 0, roll: 0, pitch: 0, alt: 1,
      phase: Math.random() * TAU, hz: S.hz * rnd(.9, 1.12), flapping: true, burst: rnd(.5, 1.2), glideT: 0,
      wingAngle: 20, mode: 'wander', goal: null, t: 0, life: 0, op: 0, jitterT: 0, jx: 0, jy: 0,
      restPhase: 'closed', restT: 0, restDur: rnd(1.6, 3.4), openAmt: 0, closeTarget: 1, seed: Math.random() * 100,
    };
    flock.push(b);
    return b;
  }

  function remove(b) { b.el.remove(); flock.splice(flock.indexOf(b), 1); }

  function setGoal(b, goal, mode) {
    b.goal = goal; b.mode = mode || 'travel'; b.t = 0;
  }
  function nodFlower(el) {
    if (!el) return;
    el.classList.remove('visited'); void el.getBoundingClientRect(); el.classList.add('visited');
    setTimeout(() => el.classList.remove('visited'), 1200);
  }
  function takeOff(b, from, flee) {
    if (b.flowerEl) { nodFlower(b.flowerEl); b.flowerEl = null; }
    b.mode = flee ? 'flee' : 'wander';
    b.goal = null; b.t = 0; b.flapping = true; b.burst = rnd(.6, 1.2);
    const ang = from ? Math.atan2(b.y - from.y, b.x - from.x) : rnd(-Math.PI * .9, -Math.PI * .1);
    const sp = flee ? rnd(360, 480) : rnd(160, 240);
    b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp - (flee ? 140 : 60);
    b.closeTarget = 0;
    b.el.classList.remove('resting');
    wake();
  }

  // ------------------------------------------------------------------ motion
  function step(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (document.hidden) { running = false; return; }
    // scroll gives the air a push
    const dS = scrollY - lastScrollY; lastScrollY = scrollY;
    wind = lerp(wind, clamp(dS / Math.max(dt, .001), -1600, 1600) * .12, .2);
    pointer.still += dt;
    if ((sizeT -= dt) <= 0) { sizeT = 2; sizeGarden(); }
    // a still cursor invites one to land on it
    if (fine && pointer.inside && !pointer.onUI && pointer.still > 1.1 && !flock.some(b => b.goal && b.goal.kind === 'pointer')) {
      const cand = flock.filter(b => b.mode !== 'flee' && b.mode !== 'leave').sort((a, c) => dist(a, pointer) - dist(c, pointer))[0];
      if (cand && dist(cand, pointer) < Math.max(innerWidth, innerHeight)) {
        if (cand.mode === 'rest') takeOff(cand, null, false);
        setGoal(cand, { x: pointer.x, y: pointer.y + 4, kind: 'pointer' }, 'travel');
      }
      pointer.still = -4;   // do not ask again for a while
    }

    for (let i = flock.length - 1; i >= 0; i--) {
      const b = flock[i];
      b.t += dt; b.life += dt;
      if (b.op < 1 && b.mode !== 'leave') b.op = Math.min(1, b.op + dt * 2.2);

      if (b.mode === 'rest') { rest(b, dt); render(b); continue; }

      // ---- steering
      let tx = 0, ty = 0, speed = 150;
      if (b.goal && b.goal.kind === 'pointer') { b.goal.x = pointer.x; b.goal.y = pointer.y + 4; }
      if (b.goal) {
        const dx = b.goal.x - b.x, dy = b.goal.y - b.y, d = Math.hypot(dx, dy) || 1;
        speed = clamp(d * 1.4, 34, b.mode === 'travel' ? 230 : 180);
        tx = dx / d * speed; ty = dy / d * speed;
        if (d < 120) b.mode = 'land';
        if (d < 5 && Math.hypot(b.vx, b.vy) < 90) { settle(b); render(b); continue; }
      } else if (b.mode === 'flee') {
        speed = 360; tx = b.vx; ty = b.vy - 40;
        if (b.t > 1.2) { const g = pickPerch(pointer); g ? setGoal(b, g, 'travel') : (b.mode = 'leave'); }
      } else if (b.mode === 'leave') {
        tx = b.vx * 1.02 + (b.x < scrollX + innerWidth / 2 ? -40 : 40); ty = -140;
        b.op -= dt * .35;
        if (b.op <= 0 || b.y < scrollY - 160 || b.x < -200 || b.x > scrollX + innerWidth + 200) { remove(b); continue; }
      } else {   // wander, then look for somewhere to rest
        tx = Math.cos(b.seed + b.life * .7) * 120; ty = Math.sin(b.seed * 1.7 + b.life * .9) * 70 - 20;
        if (b.t > rnd(2.2, 3.6)) { const g = pickPerch(); g ? setGoal(b, g, 'travel') : (b.t > 8 && (b.mode = 'leave')); }
      }
      // erratic little zig-zags, the signature of butterfly flight
      b.jitterT -= dt;
      if (b.jitterT <= 0) { b.jitterT = rnd(.18, .55); const a = rnd(0, TAU), m = b.mode === 'land' ? 25 : rnd(40, 95); b.jx = Math.cos(a) * m; b.jy = Math.sin(a) * m; }
      tx += b.jx; ty += b.jy;
      const k = b.mode === 'land' ? 4.2 : 2.4;
      b.vx += (tx - b.vx) * clamp(k * dt, 0, 1);
      b.vy += (ty - b.vy) * clamp(k * dt, 0, 1);
      b.vy += wind * dt * (b.mode === 'land' ? .2 : 1);

      // ---- wings: bursts of beats, then a glide
      if (b.flapping) {
        b.phase += TAU * b.hz * (b.mode === 'flee' ? 1.35 : b.mode === 'land' ? 1.15 : 1) * dt;
        b.burst -= dt;
        if (b.burst <= 0 && b.mode !== 'land' && b.mode !== 'flee' && Math.random() < b.S.glide) { b.flapping = false; b.glideT = rnd(.25, .6); }
        else if (b.burst <= 0) b.burst = rnd(.4, 1.1);
      } else {
        b.glideT -= dt; b.vy += 22 * dt;   // gentle sink while gliding
        if (b.glideT <= 0) { b.flapping = true; b.burst = rnd(.5, 1.2); }
      }
      // wing angle: fast downstroke, slower upstroke; held slightly raised in a glide
      const s = Math.sin(b.phase), s2 = Math.sin(2 * b.phase);
      const target = b.flapping ? 34 + 50 * (s + .22 * s2) : 18 + Math.sin(b.life * 3) * 4;
      b.wingAngle = clamp(lerp(b.wingAngle, target, b.flapping ? 1 : clamp(6 * dt, 0, 1)), -22, 84);
      // each downstroke lifts the body a little
      const bob = b.flapping ? Math.cos(b.phase) * b.span * .06 : 0;

      b.x += b.vx * dt; b.y += b.vy * dt;
      b.drawY = b.y + bob;
      // face the direction of travel, bank into turns
      const want = Math.atan2(b.vx, -b.vy);
      const turn = angDiff(b.heading, want);
      b.heading += turn * clamp(5 * dt, 0, 1);
      b.bank = lerp(b.bank, clamp(turn * 70, -38, 38), clamp(6 * dt, 0, 1));
      b.pitch = lerp(b.pitch, clamp(-b.vy * .05, -18, 22), clamp(4 * dt, 0, 1));
      b.alt = lerp(b.alt, b.mode === 'land' ? 1.02 : 1.12, clamp(2 * dt, 0, 1));
      b.roll = lerp(b.roll, 0, clamp(5 * dt, 0, 1));
      b.openAmt = lerp(b.openAmt, 0, clamp(6 * dt, 0, 1));
      // keep inside the page horizontally
      const minX = scrollX + 20, maxX = scrollX + innerWidth - 20;
      if (b.mode !== 'leave' && (b.x < minX || b.x > maxX)) { b.vx += (b.x < minX ? 1 : -1) * 600 * dt; }
      render(b);
    }
    // gentle population: a new visitor now and then while the page is quiet
    visitorT -= dt;
    if (visitorT <= 0) { visitorT = rnd(28, 46); if (flock.length < (small ? 3 : 4)) visit(); }
    if (flock.some(b => b.mode !== 'rest') || flock.length) requestAnimationFrame(step); else running = false;
  }
  let visitorT = rnd(16, 26);
  const dist = (a, p) => Math.hypot(a.x - p.x, a.y - p.y);

  function settle(b) {
    b.mode = 'rest'; b.vx = b.vy = 0;
    if (b.goal) { b.x = b.goal.x; b.y = b.goal.y; }
    b.onPointer = b.goal && b.goal.kind === 'pointer';
    b.flowerEl = b.goal && b.goal.el || null;
    nodFlower(b.flowerEl);
    b.goal = null; b.restPhase = 'closing'; b.restT = 0; b.restDur = rnd(.5, .8);
    b.restHeading = rnd(-.45, .45) + (b.onPointer ? 0 : 0);
    b.rollSign = Math.random() < .5 ? 1 : -1;
    b.el.classList.add('resting');
  }

  // resting: wings closed showing the undersides, then slowly opening to show the colour
  function rest(b, dt) {
    b.restT += dt;
    if (b.onPointer) {
      // ride on the cursor; a quick move shakes it off
      b.x = lerp(b.x, pointer.x, clamp(10 * dt, 0, 1)); b.y = lerp(b.y, pointer.y + 4, clamp(10 * dt, 0, 1));
    }
    b.heading += angDiff(b.heading, b.restHeading) * clamp(3 * dt, 0, 1);
    b.bank = lerp(b.bank, 0, clamp(4 * dt, 0, 1)); b.pitch = lerp(b.pitch, 0, clamp(4 * dt, 0, 1));
    b.alt = lerp(b.alt, 1, clamp(3 * dt, 0, 1));
    const P = b.restPhase, t = clamp(b.restT / b.restDur, 0, 1);
    if (P === 'closing') {           // fold up and turn to show the underside
      b.closeAmt = ease(t);
      if (t >= 1) { b.restPhase = 'closed'; b.restT = 0; b.restDur = rnd(2.2, 4.8); }
    } else if (P === 'closed') {     // tiny shifts while closed
      b.closeAmt = 1 - Math.max(0, Math.sin(b.restT * 2.2)) * .06;
      if (t >= 1) { b.restPhase = 'opening'; b.restT = 0; b.restDur = rnd(.9, 1.4); }
    } else if (P === 'opening') {    // slowly open flat: the flash of colour
      b.closeAmt = 1 - ease(t);
      if (t >= 1) { b.restPhase = 'open'; b.restT = 0; b.restDur = rnd(1.4, 3.2); }
    } else if (P === 'open') {       // basking, with a slow breath of the wings
      b.closeAmt = Math.max(0, Math.sin(b.restT * 1.6)) * .18;
      if (t >= 1) { b.restPhase = 'closing'; b.restT = 0; b.restDur = rnd(.7, 1.1); }
    }
    const c = b.closeAmt;
    b.wingAngle = lerp(-6, 84, c);     // flat (open) to closed together above the back
    b.roll = lerp(0, 75, c) * b.rollSign;          // closed wings seen side-on: the eye-spotted underside
    b.drawY = b.y;
  }

  function render(b) {
    const span = b.span * b.alt;
    const deg = b.heading * 180 / Math.PI;
    b.el.style.opacity = b.op.toFixed(3);
    b.el.style.transform = `translate3d(${(b.x).toFixed(1)}px,${(b.drawY ?? b.y).toFixed(1)}px,0)`;
    b.tilt.style.transform = `translate(-50%,-62%) rotate(${deg.toFixed(1)}deg) rotateX(${(b.pitch).toFixed(1)}deg) rotateY(${(b.bank + b.roll).toFixed(1)}deg) scale(${(b.alt).toFixed(3)})`;
    const a = b.wingAngle;
    b.wl.style.transform = `rotateY(${a.toFixed(1)}deg)`;
    b.wr.style.transform = `rotateY(${(-a).toFixed(1)}deg)`;
    // iridescence: the blue brightens as the wing tilts toward the light
    b.el.style.setProperty('--sheen', clamp(Math.cos((a - 25) * Math.PI / 180), 0, 1).toFixed(2));
    // shadow: tight and dark at rest, wider, softer and offset in flight
    const lift = b.mode === 'rest' ? 0 : 1;
    const open = Math.cos(clamp(a, 0, 90) * Math.PI / 180);
    b.shadow.style.transform = `translate(${(-50 + lift * 30).toFixed(0)}%, ${(-30 + lift * 120).toFixed(0)}%) rotate(${deg.toFixed(0)}deg) scale(${(.35 + .65 * open).toFixed(2)}, 1)`;
    b.shadow.style.opacity = (lift ? .12 : .28).toFixed(2);
    b.shadow.style.width = span + 'px';
  }

  function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

  // ------------------------------------------------------------------ arrivals
  function pickSpecies(force) { return force || (Math.random() < SPECIES.morpho.weight ? 'morpho' : 'monarch'); }
  function release(px, py, opts = {}) {
    if (flock.length >= MAX + 5) return null;
    if (flock.length >= MAX) { const r = flock.find(b => b.mode === 'rest' && !b.onPointer); r ? takeOff(r, null, false) || (r.mode = 'leave') : 0; }
    const b = make(pickSpecies(opts.species), px, py);
    const ang = -Math.PI / 2 + rnd(-.8, .8) * (opts.burst ? 1.8 : 1);
    const sp = opts.burst ? rnd(220, 360) : rnd(160, 220);
    b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.op = .2; b.mode = 'wander'; b.t = 0;
    wake();
    return b;
  }
  function visit() {   // drifts in from a side edge
    const left = Math.random() < .5;
    const b = make(pickSpecies(), scrollX + (left ? -40 : innerWidth + 40), scrollY + rnd(innerHeight * .2, innerHeight * .6));
    b.vx = left ? rnd(120, 180) : -rnd(120, 180); b.vy = rnd(-40, 20); b.op = 1; b.mode = 'wander'; b.t = 0;
    wake();
  }
  function seedResting(n) {
    for (let i = 0; i < n; i++) {
      const g = pickPerch(); if (!g) break;
      const b = make(pickSpecies(i === 0 ? 'morpho' : undefined), g.x, g.y);
      b.goal = g; settle(b); b.restPhase = Math.random() < .5 ? 'closed' : 'open'; b.closeAmt = b.restPhase === 'closed' ? 1 : 0; b.restT = 0;
      b.op = 0; setTimeout(() => wake(), 0);
    }
    wake();
  }

  // ------------------------------------------------------------------ input
  const UI = 'a, button, input, textarea, select, label, summary, [role="tab"], [role="button"], .btn, .site-nav, .fab, video, iframe';
  addEventListener('pointermove', e => {
    const now = performance.now(), dtm = Math.max(1, now - pointer.t) / 1000;
    const vx = (e.pageX - pointer.x) / dtm, vy = (e.pageY - pointer.y) / dtm;
    pointer.vx = vx; pointer.vy = vy; pointer.t = now;
    pointer.x = e.pageX; pointer.y = e.pageY; pointer.inside = true;
    pointer.onUI = !!(e.target.closest && e.target.closest(UI));
    const speed = Math.hypot(vx, vy);
    if (speed > 60) pointer.still = 0;
    for (const b of flock) {
      const d = dist(b, pointer);
      if (b.onPointer && b.mode === 'rest') { if (speed > 900) { b.onPointer = false; takeOff(b, { x: pointer.x - vx * .02, y: pointer.y - vy * .02 }, true); } continue; }
      if (b.mode === 'rest' && d < 80 && speed > 320) takeOff(b, pointer, true);
      else if (b.mode !== 'rest' && d < 110 && speed > 1100 && !(b.goal && b.goal.kind === 'pointer')) takeOff(b, pointer, true);
    }
    wake();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.inside = false; for (const b of flock) if (b.onPointer) { b.onPointer = false; takeOff(b, null, false); } });
  addEventListener('blur', () => { pointer.inside = false; });

  addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.target.closest && e.target.closest(UI)) return;
    if (getSelection && String(getSelection()).length) return;
    const p = { x: e.pageX, y: e.pageY };
    // tapping a resting butterfly sends it off
    const near = flock.filter(b => b.mode === 'rest').sort((a, c) => dist(a, p) - dist(c, p))[0];
    if (near && dist(near, p) < near.span * .7 + 14) { near.onPointer = false; takeOff(near, p, true); return; }
    // otherwise, one comes to you
    let b = flock.filter(x => x.mode !== 'leave' && !(x.goal && x.goal.kind === 'tap')).sort((a, c) => dist(a, p) - dist(c, p))[0];
    if (!b || dist(b, p) > Math.max(innerWidth, innerHeight) * 1.2) {
      const left = e.clientX > innerWidth / 2 ? false : true;
      b = make(pickSpecies(), scrollX + (left ? -30 : innerWidth + 30), p.y - rnd(60, 160));
      b.op = 1;
    }
    if (b.mode === 'rest') takeOff(b, null, false);
    setGoal(b, { x: p.x, y: p.y, kind: 'tap' }, 'travel');
    wake();
  });

  // ------------------------------------------------------------------ start
  window.Butterflies = {
    release: (cx, cy, opts) => release(cx + scrollX, cy + scrollY, opts),
    flutter: (cx, cy, n = 9) => { for (let i = 0; i < n; i++) setTimeout(() => release(cx + scrollX + rnd(-40, 40), cy + scrollY, { burst: true }), i * 80); },
    count: () => flock.length,
    wind: () => wind,
    positions: () => flock.map(b => ({ x: b.x - scrollX, y: (b.drawY ?? b.y) - scrollY, vx: b.vx, vy: b.vy, flying: b.mode !== 'rest' })),
  };
  const start = () => setTimeout(() => seedResting(document.querySelector('.hero') ? (small ? 2 : 3) : (small ? 1 : 2)), 1200);
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
