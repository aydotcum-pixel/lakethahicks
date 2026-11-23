/* Laketha's writing studio · editor interactions. No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const csrf = document.body.dataset.csrf;

  // show / hide password
  $$('[data-toggle-pw]').forEach(b => b.addEventListener('click', () => {
    const i = document.getElementById(b.getAttribute('aria-controls'));
    const show = i.type === 'password'; i.type = show ? 'text' : 'password';
    b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-pressed', show);
  }));

  // confirm destructive actions
  $$('form[data-confirm]').forEach(f => f.addEventListener('submit', e => { if (!confirm(f.dataset.confirm)) e.preventDefault(); }));

  const ed = $('[data-editor]');
  if (!ed) return;
  const body = $('[data-body]', ed), preview = $('[data-preview]', ed), panes = $('[data-panes]', ed);
  const state = $('[data-save-state]', ed);
  let dirty = false;
  const markDirty = () => { if (!dirty) { dirty = true; if (state) state.textContent = 'Unsaved changes'; } };
  ed.addEventListener('input', markDirty);
  ed.addEventListener('submit', () => { dirty = false; });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // keyboard: Cmd/Ctrl+S saves
  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const live = $('button[value="published"]', ed);
      (live && /Update/.test(live.textContent) ? live : $('button[value="draft"]', ed)).click();
    }
  });

  // ---------------------------------------------------------------- live preview
  let timer;
  const refresh = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const res = await fetch('/admin/preview', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ body: body.value }) });
        const { html } = await res.json();
        preview.innerHTML = html || '<p class="empty">Your preview will appear here as you write.</p>';
      } catch { /* offline: keep last preview */ }
    }, 280);
  };
  body.addEventListener('input', refresh);

  // grow the writing box with its content
  const grow = () => { body.style.height = 'auto'; body.style.height = Math.max(460, body.scrollHeight + 4) + 'px'; };
  body.addEventListener('input', grow); grow();

  // ---------------------------------------------------------------- toolbar
  function wrapSel(before, after = before, placeholder = 'text') {
    const s = body.selectionStart, e = body.selectionEnd, v = body.value;
    const sel = v.slice(s, e) || placeholder;
    body.setRangeText(before + sel + after, s, e, 'end');
    body.selectionStart = s + before.length; body.selectionEnd = s + before.length + sel.length;
    body.focus(); body.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function prefixLines(prefix) {
    const v = body.value; let s = body.selectionStart, e = body.selectionEnd;
    s = v.lastIndexOf('\n', s - 1) + 1;
    const block = v.slice(s, e) || 'Your text';
    const out = block.split('\n').map(l => l ? prefix + l.replace(/^(#+\s|>\s|-\s)/, '') : l).join('\n');
    body.setRangeText(out, s, e, 'end'); body.focus(); body.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const tools = {
    bold: () => wrapSel('**'),
    italic: () => wrapSel('*'),
    h2: () => prefixLines('## '),
    quote: () => prefixLines('> '),
    list: () => prefixLines('- '),
    link: () => { const url = prompt('Paste the web address for this link:', 'https://'); if (url && url !== 'https://') wrapSel('[', `](${url.trim()})`, 'link text'); },
  };
  $$('[data-md]', ed).forEach(b => b.addEventListener('click', () => tools[b.dataset.md]()));
  body.addEventListener('keydown', e => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key.toLowerCase() === 'b') { e.preventDefault(); tools.bold(); }
    if (e.key.toLowerCase() === 'i') { e.preventDefault(); tools.italic(); }
  });

  // write / preview switch (mainly for phones and narrow windows)
  $$('[data-view]', ed).forEach(b => b.addEventListener('click', () => {
    $$('[data-view]', ed).forEach(x => x.setAttribute('aria-pressed', x === b));
    panes.dataset.mode = b.dataset.view;
    if (b.dataset.view === 'preview') refresh();
  }));

  // ---------------------------------------------------------------- photos
  // Photos are resized in the browser so each stays under ~1.3 MB (the site keeps
  // them in its database, which holds up to 2 MB per photo).
  function shrink(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Please choose a JPG, PNG or WebP photo.'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const LIMIT = 1.75e6;   // characters of base64 (about 1.3 MB of photo)
        let max = 2000, q = .86, out = '';
        for (let i = 0; i < 8; i++) {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          const g = c.getContext('2d');
          const keepPng = file.type === 'image/png' && file.size < 900e3;
          if (!keepPng) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
          g.drawImage(img, 0, 0, c.width, c.height);
          out = keepPng ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', q);
          if (out.length <= LIMIT) return resolve(out);
          if (q > .66) q -= .08; else max = Math.round(max * .8);
        }
        reject(new Error('That photo is too large. Please choose a smaller one.'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That photo could not be read.')); };
      img.src = url;
    });
  }
  async function upload(file) {
    const data = await shrink(file);
    const res = await fetch('/admin/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ data }) });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || 'Upload failed.');
    return out.url;
  }

  const cover = $('[data-cover]', ed), coverImg = $('[data-cover-img]', ed), coverEmpty = $('.cover-empty', ed), coverRemove = $('[data-cover-remove]', ed), drop = $('[data-cover-drop]', ed);
  const setCover = url => {
    cover.value = url || ''; coverImg.src = url || ''; coverImg.hidden = !url; coverEmpty.hidden = !!url; coverRemove.hidden = !url; markDirty();
  };
  $('[data-cover-file]', ed).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    drop.classList.add('busy');
    try { setCover(await upload(f)); } catch (err) { alert(err.message); }
    drop.classList.remove('busy'); e.target.value = '';
  });
  coverRemove.addEventListener('click', () => setCover(''));
  $$('[data-pick]', ed).forEach(b => b.addEventListener('click', () => setCover(b.dataset.pick)));
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('over')));
  drop.addEventListener('drop', async e => {
    e.preventDefault(); const f = e.dataTransfer.files[0]; if (!f) return;
    drop.classList.add('busy'); try { setCover(await upload(f)); } catch (err) { alert(err.message); } drop.classList.remove('busy');
  });

  $('[data-insert-image]', ed).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const url = await upload(f);
      const at = body.selectionEnd;
      body.setRangeText(`\n\n![Photo](${url})\n\n`, at, at, 'end');
      body.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (err) { alert(err.message); }
    e.target.value = '';
  });
})();
