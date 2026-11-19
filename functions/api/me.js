import { json, validateSession } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const session = await validateSession(context.env, context.request);
  if (!session) return json({ loggedIn: false }, 401);
  return json({ loggedIn: true, email: session.user.email, csrfToken: session.csrfToken });
}
