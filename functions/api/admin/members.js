import { json, fail, getSession, isAdmin } from '../../_lib/auth.js';
const DAY = 86400000;
async function admin(request, env) {
  if (!env.DB) return null;
  const s = await getSession(env, request);
  return s && isAdmin(env, s.email) ? s : null;
}
// GET -> every member row, newest first
export async function onRequestGet({ request, env }) {
  if (!(await admin(request, env))) return fail(403, 'forbidden');
  const r = await env.DB.prepare('SELECT email, until, plan, source, note, updated_at FROM members ORDER BY updated_at DESC LIMIT 500').all();
  return json({ members: r.results || [] });
}
// POST { email, days | lifetime:true | revoke:true, plan?, note? }
export async function onRequestPost({ request, env }) {
  if (!(await admin(request, env))) return fail(403, 'forbidden');
  let b;
  try { b = await request.json(); } catch (e) { return fail(400, 'bad_json'); }
  const email = String((b && b.email) || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, 'bad_email');
  const now = Date.now();
  if (b.revoke) {
    await env.DB.prepare('DELETE FROM members WHERE email = ?').bind(email).run();
    return json({ ok: true, email, active: false });
  }
  let until;
  if (b.lifetime) until = null;
  else if (Number.isFinite(+b.days) && +b.days > 0 && +b.days <= 3660) {
    // extending an active member adds to the time they already have
    const cur = await env.DB.prepare('SELECT until FROM members WHERE email = ?').bind(email).first();
    const base = cur && cur.until !== null && cur.until > now ? cur.until : now;
    until = base + Math.round(+b.days) * DAY;
  } else return fail(400, 'bad_duration');
  await env.DB.prepare(
    'INSERT INTO members (email, until, plan, source, note, updated_at) VALUES (?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(email) DO UPDATE SET until = excluded.until, plan = excluded.plan, source = excluded.source, note = excluded.note, updated_at = excluded.updated_at'
  ).bind(email, until, String(b.plan || 'manual').slice(0, 30), 'admin', b.note ? String(b.note).slice(0, 200) : null, now).run();
  return json({ ok: true, email, active: true, until });
}
