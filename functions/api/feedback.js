import { json, fail, getSession, sha256Hex } from '../_lib/auth.js';
import { ensureInsights, thDay } from '../_lib/insights.js';
const MAX_MSG = 1000, MAX_CONTACT = 120, PER_DAY = 5;
// POST { message, rating?, contact?, lang?, src? } — anyone can send, signed in or not. Read only by admins (api/admin/feedback).
// Spam guard: at most PER_DAY messages a day from one connection; only a hash of (IP + day) is kept for that, not the IP.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return fail(503, 'not_configured');
  let b;
  try { b = await request.json(); } catch (e) { return fail(400, 'bad_json'); }
  b = b || {};
  const message = String(b.message || '').trim().slice(0, MAX_MSG);
  if (message.length < 2) return fail(400, 'empty');
  const rating = Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5 ? b.rating : null;
  const contact = String(b.contact || '').trim().slice(0, MAX_CONTACT) || null;
  const lang = b.lang === 'en' ? 'en' : 'th';
  const src = String(b.src || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 20) || null;
  await ensureInsights(env);
  const now = Date.now(), ip = request.headers.get('cf-connecting-ip') || '';
  const ipHash = ip ? await sha256Hex(ip + '|' + thDay(now)) : null;
  if (ipHash) {
    const c = await env.DB.prepare('SELECT count(*) AS n FROM feedback WHERE ip_hash = ? AND created_at > ?').bind(ipHash, now - 86400000).first();
    if (c && c.n >= PER_DAY) return fail(429, 'too_many');
  }
  const s = await getSession(env, request).catch(() => null);
  await env.DB.prepare('INSERT INTO feedback (created_at, rating, message, contact, email, lang, src, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(now, rating, message, contact, s ? s.email : null, lang, src, ipHash).run();
  return json({ ok: true });
}
