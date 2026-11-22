// GET /api/admin/subscribers — auth required, reader list newest first.
import { json, requireAuth } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const auth = await requireAuth(context.env, context.request);
  if (auth instanceof Response) return auth;
  const { results } = await context.env.DB.prepare(
    'SELECT email, name, source, created_at FROM subscribers ORDER BY created_at DESC'
  ).all();
  return json({ subscribers: results || [] });
}
