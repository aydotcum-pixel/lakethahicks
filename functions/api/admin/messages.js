// Admin inbox: GET lists messages, POST marks read/unread or deletes.
// Auth + CSRF required (same as posts). GET needs session only.
import { json, requireAuth, checkCsrf } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const auth = await requireAuth(context.env, context.request);
  if (auth instanceof Response) return auth;
  const { results } = await context.env.DB.prepare(
    'SELECT id, type, name, email, gathering, group_name, date_text, message, read, created_at FROM messages ORDER BY created_at DESC, id DESC'
  ).all();
  return json({ messages: (results || []).map((r) => ({ ...r, group: r.group_name, date: r.date_text, read: !!r.read })) });
}

export async function onRequestPost(context) {
  const auth = await requireAuth(context.env, context.request);
  if (auth instanceof Response) return auth;
  if (!checkCsrf(context.request, auth.csrfToken)) {
    return json({ ok: false, error: 'Request could not be verified. Please log in again.' }, 403);
  }
  let input = {};
  try { input = await context.request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const id = Number(input?.id);
  if (!Number.isInteger(id)) return json({ ok: false, error: 'Message not found.' }, 404);
  if (input?.action === 'delete') {
    await context.env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
  } else if (input?.action === 'read') {
    await context.env.DB.prepare('UPDATE messages SET read = 1 WHERE id = ?').bind(id).run();
  } else if (input?.action === 'unread') {
    await context.env.DB.prepare('UPDATE messages SET read = 0 WHERE id = ?').bind(id).run();
  } else {
    return json({ ok: false, error: 'Unknown action.' }, 400);
  }
  return json({ ok: true });
}
