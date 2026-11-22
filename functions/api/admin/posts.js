import { json, requireAuth, publicPost } from '../../_lib/auth.js';

// GET /api/admin/posts — auth required, all posts (published and drafts).
export async function onRequestGet(context) {
  const auth = await requireAuth(context.env, context.request);
  if (auth instanceof Response) return auth;
  const { results } = await context.env.DB.prepare(
    'SELECT id, slug, title, body, post_date, tag, excerpt, pullQuote, status FROM posts ORDER BY post_date DESC, id DESC'
  ).all();
  return json({ posts: (results || []).map((r) => ({ ...publicPost(r), status: r.status })) });
}
