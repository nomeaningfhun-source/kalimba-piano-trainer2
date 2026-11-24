import { json, fail, getSession, isAdmin } from '../../_lib/auth.js';
import { ensureInsights } from '../../_lib/insights.js';
async function admin(request, env) {
  if (!env.DB) return null;
  const s = await getSession(env, request);
  return s && isAdmin(env, s.email) ? s : null;
}
// GET -> the latest 100 feedback messages, newest first
export async function onRequestGet({ request, env }) {
  if (!(await admin(request, env))) return fail(403, 'forbidden');
  await ensureInsights(env);
  const r = await env.DB.prepare('SELECT id, created_at, rating, message, contact, email, lang, src, seen FROM feedback ORDER BY id DESC LIMIT 100').all();
  return json({ feedback: r.results || [] });
}
// POST { id, seen:true } marks one as read · { id, remove:true } deletes it · { allSeen:true } marks everything read
export async function onRequestPost({ request, env }) {
  if (!(await admin(request, env))) return fail(403, 'forbidden');
  let b;
  try { b = await request.json(); } catch (e) { return fail(400, 'bad_json'); }
  b = b || {};
  await ensureInsights(env);
  if (b.allSeen) { await env.DB.prepare('UPDATE feedback SET seen = 1 WHERE seen = 0').run(); return json({ ok: true }); }
  const id = Number(b.id);
  if (!Number.isInteger(id) || id < 1) return fail(400, 'bad_id');
  if (b.remove) await env.DB.prepare('DELETE FROM feedback WHERE id = ?').bind(id).run();
  else await env.DB.prepare('UPDATE feedback SET seen = 1 WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
