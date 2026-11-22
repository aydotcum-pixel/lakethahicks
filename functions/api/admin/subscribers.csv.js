// GET /api/admin/subscribers.csv — auth required, reader list as CSV.
import { requireAuth, json } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const auth = await requireAuth(context.env, context.request);
  if (auth instanceof Response) return auth;
  const { results } = await context.env.DB.prepare(
    'SELECT email, name, source, created_at FROM subscribers ORDER BY created_at DESC'
  ).all();
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""').replace(/^[=+\-@]/, "'$&") + '"';
  const csv = 'name,email,source,joined\n' + (results || []).map((s) => [s.name, s.email, s.source, new Date(s.created_at).toISOString()].map(q).join(',')).join('\n');
  return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="reader-circle.csv"', 'Cache-Control': 'no-store' } });
}
