// POST /api/contact — public contact + speaking inbox.
// Stores the message in D1 (messages table) for Laketha's Admin inbox.
// Honeypot field "website" silently accepts bots. Rate limit 6/hour/IP.
// No email is sent (that needs an email service — see README).
import { json, rateLimit, getClientIp } from '../_lib/auth.js';

export async function onRequestPost(context) {
  let input = {};
  try { input = await context.request.json(); } catch { return json({ ok: false, error: 'Invalid message.' }, 400); }
  if (String(input?.website || '').trim()) return json({ ok: true });
  const ip = getClientIp(context.request);
  if (!rateLimit('msg:' + ip, 6, 60 * 60 * 1000)) {
    return json({ ok: false, error: 'Too many messages. Please wait a little and try again.' }, 429);
  }
  const name = String(input?.name || '').trim().slice(0, 120);
  const email = String(input?.email || '').trim().toLowerCase().slice(0, 200);
  const message = String(input?.message || '').trim().slice(0, 5000);
  const type = String(input?.type || 'Message').trim().slice(0, 60) || 'Message';
  if (!name) return json({ ok: false, error: 'Please tell Laketha your name.' }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ ok: false, error: 'Please add a valid email address.' }, 400);
  }
  if (message.length < 2) return json({ ok: false, error: 'Please write a short message.' }, 400);
  try {
    await context.env.DB.prepare(
      'INSERT INTO messages (type, name, email, gathering, group_name, date_text, message, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
    ).bind(
      type, name, email,
      String(input?.gathering || '').trim().slice(0, 60),
      String(input?.group || '').trim().slice(0, 160),
      String(input?.date || '').trim().slice(0, 80),
      message, Date.now(),
    ).run();
  } catch (err) {
    return json({ ok: false, error: 'Your message could not be saved. Please try again later.' }, 500);
  }
  return json({ ok: true }, 200);
}
