// Anonymous usage counts and in-app feedback, kept in D1. Tables are created on first use (like billing),
// so an existing database needs no manual migration.
// visits: one row per (Thai day, kind, key) with a counter. Nothing about the person is stored: no IP, no id, no cookie.
// feedback: what someone typed in the app's feedback box; read only by admins.
let ready = false;
export async function ensureInsights(env) {
  if (ready) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS visits (day TEXT NOT NULL, kind TEXT NOT NULL, k TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind, k))').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, rating INTEGER, message TEXT NOT NULL, contact TEXT, email TEXT, lang TEXT, src TEXT, ip_hash TEXT, seen INTEGER NOT NULL DEFAULT 0)').run();
  ready = true;
}
export function resetInsightsFlag() { ready = false; }

// the day in Thailand (UTC+7), e.g. 2026-11-24
export const thDay = (ms = Date.now()) => new Date(ms + 7 * 3600000).toISOString().slice(0, 10);

export async function bump(env, day, kind, k) {
  await env.DB.prepare('INSERT INTO visits (day, kind, k, n) VALUES (?, ?, ?, 1) ON CONFLICT(day, kind, k) DO UPDATE SET n = n + 1').bind(day, kind, k).run();
}

// where a visit came from, folded into a short label: facebook, instagram, line, google, youtube, tiktok, direct, or the host
export function sourceLabel(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s || s === 'direct') return 'direct';
  if (s.startsWith('utm:')) return 'utm:' + s.slice(4).replace(/[^a-z0-9._-]/g, '').slice(0, 30);
  const host = s.replace(/^https?:\/\//, '').split(/[/?#:]/)[0].replace(/^www\./, '');
  const known = [['facebook', /(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/], ['instagram', /(^|\.)instagram\.com$/], ['line', /(^|\.)(line\.me|line-apps\.com|naver\.jp)$/],
    ['google', /(^|\.)google\.[a-z.]+$/], ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/], ['tiktok', /(^|\.)tiktok\.com$/]];
  for (const [label, re] of known) if (re.test(host)) return label;
  return host.replace(/[^a-z0-9.-]/g, '').slice(0, 40) || 'direct';
}
