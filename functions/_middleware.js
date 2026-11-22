// Cloudflare Pages Function middleware: SPA fallback for the Laketha site.
//
// Root cause of the live routing failure (verified 2026-11-22 in the
// Cloudflare Dashboard): the Pages production deployment is current
// (commit c211236) and _redirects parsed 13 valid rules, including
// /books, /speaking, /blog and /admin each to 200 /index.html, yet a
// direct visit to /books, /speaking, /blog or /admin still loaded Home
// and the final URL showed the root. The client router is not the cause:
// routeFromPath() maps /books to Books correctly when the pathname it
// is given is /books, and no script in the page redirects to /. The
// server is therefore delivering index.html with the pathname already
// lost, so the router correctly shows Home for the / URL it was given.
// Trailing-slash visits (/books/) kept working, via Pages' built-in SPA
// fallback, which preserves the path.
//
// This middleware fixes the cause in code, without relying on _redirects
// alone: for every known single-page-app path it serves the static
// index.html from the asset binding, with the request URL unchanged, so
// the client router sees the real pathname. Everything else passes
// through untouched: /api/* (Pages Functions), /assets/*, /sitemap.xml,
// and any path with a file extension.
//
// Deploy note: this file must be added to the repo under functions/,
// next to api/. It runs on every request to the Pages project.
var SPA_PATHS = {
  '/': true,
  '/books': true,
  '/about': true,
  '/speaking': true,
  '/faq': true,
  '/blog': true,
  '/contact': true,
  '/admin': true,
  '/devotional': true,
  '/portraits': true,
  '/covers': true,
  '/journey': true,
  '/credentials': true,
};

function isSpaPath(pathname) {
  var p = String(pathname || '/').toLowerCase();
  if (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.replace(/\/+$/, '') || '/';
  if (SPA_PATHS[p]) return true;
  if (p === '/blog' || p.indexOf('/blog/') === 0) return true;
  return false;
}

export async function onRequest(context) {
  var url = new URL(context.request.url);
  if (!isSpaPath(url.pathname)) return context.next();
  if (!context.env || !context.env.ASSETS || !context.env.ASSETS.fetch) return context.next();
  var assetUrl = new URL('/index.html', url);
  return context.env.ASSETS.fetch(new Request(assetUrl, context.request));
}
