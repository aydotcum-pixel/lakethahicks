import { json, deleteSession, clearSessionCookieHeader } from '../_lib/auth.js';

export async function onRequestPost(context) {
  await deleteSession(context.env, context.request);
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookieHeader() });
}
