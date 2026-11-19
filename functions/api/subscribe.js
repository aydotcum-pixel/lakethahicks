// POST /api/subscribe — public reader-list signup. No auth, no password.
// Body: { name, email }. Stores the signup in D1 (subscribers table).
// Duplicate emails are accepted silently (idempotent) so the endpoint
// never reveals whether an address is already on the list.
import { json } from '../_lib/auth.js';

export async function onRequestPost(context) {
  let input = {};
  try {
    input = await context.request.json();
  } catch {
    return json({ ok: false, error: 'Please add a valid email address.' }, 400);
  }
  const name = String(input?.name || '').trim().slice(0, 100);
  const email = String(input?.email || '').trim().toLowerCase().slice(0, 200);
  if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ ok: false, error: 'Please add a valid email address.' }, 400);
  }
  const now = Date.now();
  try {
    await context.env.DB.prepare(
      `INSERT INTO subscribers (email, name, source, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET name = excluded.name, updated_at = excluded.created_at`
    )
      .bind(email, name, String(input?.source || 'site').slice(0, 40), now)
      .run();
  } catch (err) {
    return json({ ok: false, error: 'Your signup could not be saved. Please try again later.' }, 500);
  }
  return json({ ok: true, download: '/assets/book-club-questions.pdf' }, 200);
}
