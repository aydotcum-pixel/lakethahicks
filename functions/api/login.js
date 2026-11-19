import {
  json, getClientIp, sha256Hex, verifyPassword, createSession, sessionCookieHeader,
  getAttempt, recordLoginFailure, clearLoginAttempts,
} from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { env, request } = context;
  let input = {};
  try { input = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (!email || !password) return json({ ok: false, error: 'Email or password is not correct.' }, 401);

  const ipHash = await sha256Hex(getClientIp(request));
  const attempt = await getAttempt(env, email, ipHash);
  if (attempt && attempt.locked_until > Date.now()) {
    return json({ ok: false, error: 'Too many failed attempts. Please try again later.' }, 429);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  // Always run the password check path so a missing user does not fail faster.
  const ok = user ? await verifyPassword(password, user.salt, user.password_hash) : false;
  if (!ok) {
    await recordLoginFailure(env, email, ipHash);
    // Deliberately generic: never say whether the email or the password was wrong.
    return json({ ok: false, error: 'Email or password is not correct.' }, 401);
  }

  await clearLoginAttempts(env, email, ipHash);
  const { token } = await createSession(env, user.id);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookieHeader(token) });
}
