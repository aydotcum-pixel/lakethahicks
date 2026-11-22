// GET /journal/rss.xml — Journal RSS feed from D1 posts + the 3 starters.
// Pages Functions file routing: functions/journal/rss.xml.js serves
// /journal/rss.xml. Also mirrored at /api/rss (functions/api/rss.js).
import { publicPost } from '../_lib/auth.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    "SELECT id, slug, title, body, post_date, tag, excerpt, pullQuote FROM posts WHERE status = 'published' ORDER BY post_date DESC, id DESC LIMIT 20"
  ).all();
  const posts = (results || []).map(publicPost);
  const items = posts.map((p) => {
    const link = `https://lakethahicks.com/journal/${p.slug}`;
    const desc = p.excerpt || String(p.body || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    return `<item><title>${esc(p.title)}</title><link>${link}</link><guid>${link}</guid><pubDate>${new Date(p.post_date + 'T12:00:00Z').toUTCString()}</pubDate><description>${esc(desc)}</description></item>`;
  }).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Laketha Hicks Journal</title><link>https://lakethahicks.com/journal</link><description>Reflections on faith and beginning again, from Laketha Hicks.</description>${items}</channel></rss>`;
  return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
