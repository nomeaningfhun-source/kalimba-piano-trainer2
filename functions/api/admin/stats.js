import { json, fail, getSession, isAdmin } from '../../_lib/auth.js';
import { ensureBilling } from '../../_lib/stripe.js';
import { ensureInsights, thDay } from '../../_lib/insights.js';
const DAY = 86400000;
// GET -> numbers for the admin's stats panel: sign-ins, members, subscriptions, daily visits, where visitors come from, feedback.
export async function onRequestGet({ request, env }) {
  if (!env.DB) return fail(503, 'not_configured');
  const s = await getSession(env, request);
  if (!s || !isAdmin(env, s.email)) return fail(403, 'forbidden');
  await ensureInsights(env);
  await ensureBilling(env);
  const now = Date.now(), first = sql => env.DB.prepare(sql);
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(thDay(now - i * DAY));
  const since30 = thDay(now - 29 * DAY);
  const users = await first('SELECT count(*) AS total, sum(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS new7, sum(CASE WHEN last_login > ? THEN 1 ELSE 0 END) AS active7 FROM users').bind(now - 7 * DAY, now - 7 * DAY).first();
  const members = await first('SELECT count(*) AS n FROM members WHERE until IS NULL OR until > ?').bind(now).first();
  const billing = (await first('SELECT status, count(*) AS n FROM billing GROUP BY status').all()).results || [];
  const daily = (await first("SELECT day, k, n FROM visits WHERE kind = 'all' AND day >= ?").bind(days[0]).all()).results || [];
  const byKind = async kind => ((await first('SELECT k, sum(n) AS n FROM visits WHERE kind = ? AND day >= ? GROUP BY k ORDER BY n DESC LIMIT 8').bind(kind, since30).all()).results || []);
  const fb = await first('SELECT count(*) AS total, sum(CASE WHEN seen = 0 THEN 1 ELSE 0 END) AS unseen, avg(rating) AS avg FROM feedback').first();
  const dayRow = d => ({ day: d, devices: (daily.find(r => r.day === d && r.k === 'devices') || {}).n || 0, fresh: (daily.find(r => r.day === d && r.k === 'new') || {}).n || 0 });
  return json({
    users: { total: users.total || 0, new7: users.new7 || 0, active7: users.active7 || 0 },
    members: members.n || 0,
    billing,
    days: days.map(dayRow),
    sources: await byKind('src'), devices: await byKind('dev'), apps: await byKind('app'),
    feedback: { total: fb.total || 0, unseen: fb.unseen || 0, avg: fb.avg == null ? null : Math.round(fb.avg * 10) / 10 }
  });
}
