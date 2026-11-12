import { json, getSession } from '../../_lib/auth.js';
export async function onRequestPost({ request, env }) {
  const s = env.DB && await getSession(env, request);
  if (s) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(s.tokenHash).run();
  return json({ ok: true });
}
