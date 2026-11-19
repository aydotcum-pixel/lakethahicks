import {
  json, requireAuth, checkCsrf, validatePostInput, slugify, uniqueSlug, publicPost,
} from '../../_lib/auth.js';

// PUT /api/posts/:id and DELETE /api/posts/:id — auth + CSRF required.
export async function onRequestPut(context) {
  const auth = await requireAuth(context.env, context.request);
  if (auth instanceof Response) return auth;
  if (!checkCsrf(context.request, auth.csrfToken)) {
    return json({ ok: false, error: 'Request could not be verified. Please log in again.' }, 403);
  }
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: 'Post not found.' }, 404);
  let input = {};
  try { input = await context.request.json(); } catch { return json({ ok: false, error: 'Invalid post.' }, 400); }
  const valid = validatePostInput(input);
  if (valid.error) return json({ ok: false, error: valid.error }, 400);
  const existing = await context.env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
  if (!existing) return json({ ok: false, error: 'Post not found.' }, 404);
  const slug = valid.title === existing.title ? existing.slug : await uniqueSlug(context.env, slugify(valid.title));
  await context.env.DB.prepare(
    'UPDATE posts SET slug = ?, title = ?, body = ?, post_date = ?, updated_at = ? WHERE id = ?'
  ).bind(slug, valid.title, valid.body, valid.date, Date.now(), id).run();
  const row = await context.env.DB.prepare('SELECT id, slug, title, body, post_date FROM posts WHERE id = ?')
    .bind(id).first();
  return json({ ok: true, post: publicPost(row) });
}

export async function onRequestDelete(context) {
  const auth = await requireAuth(context.env, context.request);
  if (auth instanceof Response) return auth;
  if (!checkCsrf(context.request, auth.csrfToken)) {
    return json({ ok: false, error: 'Request could not be verified. Please log in again.' }, 403);
  }
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: 'Post not found.' }, 404);
  await context.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
