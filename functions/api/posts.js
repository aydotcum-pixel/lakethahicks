import {
  json, requireAuth, checkCsrf, validatePostInput, slugify, uniqueSlug, publicPost,
} from '../_lib/auth.js';

// GET /api/posts — public, published posts, newest first.
export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    "SELECT id, slug, title, body, post_date, tag, excerpt, pullQuote FROM posts WHERE status = 'published' ORDER BY post_date DESC, id DESC"
  ).all();
  return new Response(JSON.stringify({ posts: (results || []).map(publicPost) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
}

// POST /api/posts — auth + CSRF required.
export async function onRequestPost(context) {
  const auth = await requireAuth(context.env, context.request);
  if (auth instanceof Response) return auth;
  if (!checkCsrf(context.request, auth.csrfToken)) {
    return json({ ok: false, error: 'Request could not be verified. Please log in again.' }, 403);
  }
  let input = {};
  try { input = await context.request.json(); } catch { return json({ ok: false, error: 'Invalid post.' }, 400); }
  const valid = validatePostInput(input);
  if (valid.error) return json({ ok: false, error: valid.error }, 400);
  const slug = await uniqueSlug(context.env, slugify(valid.title));
  const now = Date.now();
  const result = await context.env.DB.prepare(
    "INSERT INTO posts (slug, title, body, post_date, tag, excerpt, pullQuote, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)"
  ).bind(slug, valid.title, valid.body, valid.date, valid.tag, valid.excerpt, valid.pullQuote, now, now).run();
  const row = await context.env.DB.prepare('SELECT id, slug, title, body, post_date, tag, excerpt, pullQuote FROM posts WHERE id = ?')
    .bind(result.meta.last_row_id).first();
  return json({ ok: true, post: publicPost(row) }, 201);
}
