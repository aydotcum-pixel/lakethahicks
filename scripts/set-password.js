#!/usr/bin/env node
'use strict';
// Set (or reset) the login for Laketha's writing studio.
// Usage: npm run set-password            (asks questions)
//        node scripts/set-password.js email@example.com   (asks for the password only)
// Local site only. For the live Cloudflare site, use: npm run cf:password
const readline = require('readline');
const { AsyncLocalStorage } = require('node:async_hooks');
const path = require('path');
const store = require('../lib/store');
const auth = require('../lib/auth');
const { D1Local } = require('../lib/d1-sqlite');
store.useAsyncLocalStorage(AsyncLocalStorage);

function ask(q, hidden) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = s => { if (s.includes(q)) rl.output.write(q); else rl.output.write('*'); };
    }
    rl.question(q, a => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
  });
}

(async () => {
  const email = process.argv[2] || await ask('Email Laketha will sign in with: ');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error('That email does not look right.'); process.exit(1); }
  const pw = await ask('Choose a password (10+ characters): ', true);
  const again = await ask('Type it again: ', true);
  if (pw !== again) { console.error('The passwords did not match. Nothing was changed.'); process.exit(1); }
  const fs = require('fs'); const dir = process.env.DATA_DIR || path.join(__dirname, '..', 'data'); fs.mkdirSync(dir, { recursive: true });
  const DB = new D1Local(path.join(dir, 'site.db'));
  try { await store.withStore(DB, async () => { await auth.setAdmin(email, pw); await store.commit(); }); } catch (e) { console.error(e.message); process.exit(1); }
  console.log(`Done. Sign in at /admin/login with ${email}.`);
})();
