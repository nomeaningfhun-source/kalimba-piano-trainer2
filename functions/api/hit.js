import { json, fail } from '../_lib/auth.js';
import { ensureInsights, thDay, bump, sourceLabel } from '../_lib/insights.js';
// POST { src, dev, app, fresh } — sent by the app at most once a day per device. Only counters go up; nothing identifies the visitor.
// src = where they came from (referrer host or utm:…), dev = mobile|tablet|desktop, app = installed|browser, fresh = first visit on this device.
export async function onRequestPost({ request, env }) {
  if (!env.DB) return fail(503, 'not_configured');
  let b;
  try { b = await request.json(); } catch (e) { return fail(400, 'bad_json'); }
  b = b || {};
  await ensureInsights(env);
  const day = thDay();
  const dev = ['mobile', 'tablet', 'desktop'].includes(b.dev) ? b.dev : 'other';
  const app = b.app === 'installed' ? 'installed' : 'browser';
  await bump(env, day, 'all', 'devices');
  if (b.fresh === true) await bump(env, day, 'all', 'new');
  await bump(env, day, 'src', sourceLabel(b.src));
  await bump(env, day, 'dev', dev);
  await bump(env, day, 'app', app);
  return json({ ok: true });
}
