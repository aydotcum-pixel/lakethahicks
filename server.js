'use strict';
// Local development server (Node 22+): the same site as the Cloudflare Worker,
// with a local SQLite file standing in for D1.   npm start  ->  http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { AsyncLocalStorage } = require('node:async_hooks');
const store = require('./lib/store');
const app = require('./lib/app');
const { D1Local } = require('./lib/d1-sqlite');

store.useAsyncLocalStorage(AsyncLocalStorage);

const PORT = +process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB = new D1Local(path.join(DATA_DIR, 'site.db'));
const env = { DB, SITE_URL: process.env.SITE_URL, SITE_TZ: process.env.SITE_TZ, ADMIN_EMAIL: process.env.ADMIN_EMAIL, ADMIN_PASSWORD: process.env.ADMIN_PASSWORD };

const MIME = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };

function serveStatic(req, res, pathname) {
  if (!/^\/(css|js|assets)\//.test(pathname)) return false;
  let rel; try { rel = decodeURIComponent(pathname.slice(1)); } catch { return false; }
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return false;
  let stat; try { stat = fs.statSync(file); } catch { return false; }
  if (!stat.isFile()) return false;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'HEAD') return res.end(), true;
  fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if ((req.method === 'GET' || req.method === 'HEAD') && serveStatic(req, res, url.pathname)) return;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    const body = hasBody ? await new Promise((ok, bad) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', bad); }) : undefined;
    const response = await app.handle(new Request(url, { method: req.method, headers, body }), env);
    const out = {}; response.headers.forEach((v, k) => { out[k] = v; });
    res.writeHead(response.status, out);
    res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Something went wrong.');
  }
});

if (require.main === module) server.listen(PORT, () => console.log(`Laketha Hicks site running at http://localhost:${PORT}  ·  studio: http://localhost:${PORT}/admin`));
module.exports = { server, env, DB };
