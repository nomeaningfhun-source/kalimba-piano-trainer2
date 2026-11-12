import { json, fail, getSession, profile } from '../_lib/auth.js';
// GET with Authorization: Bearer <token> -> { user, member:{active,until,plan}, admin }
export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, 'not_configured');
  const s = await getSession(env, request);
  if (!s) return fail(401, 'unauthorized');
  return json(await profile(env, s));
}
