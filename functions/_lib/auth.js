// Shared helpers for the membership API (Cloudflare Pages Functions, D1 binding `DB`).
import { ensureBilling } from './stripe.js';
export const SESSION_DAYS = 60;
const DAY = 86400000;
const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISS = ['accounts.google.com', 'https://accounts.google.com'];

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
export const fail = (status, error) => json({ error }, status);

const b64uToBytes = s => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};
const b64uToJson = s => JSON.parse(new TextDecoder().decode(b64uToBytes(s)));
const bytesToB64u = b => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export const newToken = () => bytesToB64u(crypto.getRandomValues(new Uint8Array(32)));

let jwksCache = { at: 0, keys: null };
async function googleKeys(fetchFn, now) {
  if (jwksCache.keys && now - jwksCache.at < 3600000) return jwksCache.keys;
  const res = await fetchFn(GOOGLE_JWKS);
  if (!res.ok) throw new Error('jwks');
  jwksCache = { at: now, keys: (await res.json()).keys || [] };
  return jwksCache.keys;
}
export function resetKeyCache() { jwksCache = { at: 0, keys: null }; }

// Verifies a Google Identity Services ID token (RS256). Returns { sub, email, name } or throws.
export async function verifyGoogleIdToken(idToken, clientId, fetchFn = fetch, now = Date.now()) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('format');
  const header = b64uToJson(parts[0]), p = b64uToJson(parts[1]);
  if (header.alg !== 'RS256') throw new Error('alg');
  const jwk = (await googleKeys(fetchFn, now)).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('signature');
  if (!GOOGLE_ISS.includes(p.iss)) throw new Error('iss');
  if (!clientId || p.aud !== clientId) throw new Error('aud');
  if (!(p.exp * 1000 > now)) throw new Error('expired');
  if (!p.sub || !p.email || p.email_verified !== true) throw new Error('email');
  return { sub: String(p.sub), email: String(p.email).toLowerCase(), name: p.name ? String(p.name) : '' };
}

export async function createSession(env, user, now = Date.now()) {
  const token = newToken();
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
  await env.DB.prepare('INSERT INTO sessions (token_hash, sub, email, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), user.sub, user.email, now + SESSION_DAYS * DAY).run();
  return token;
}

export async function getSession(env, request, now = Date.now()) {
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,100})$/.exec(request.headers.get('authorization') || '');
  if (!m) return null;
  const row = await env.DB.prepare('SELECT s.sub, s.email, u.name FROM sessions s LEFT JOIN users u ON u.sub = s.sub WHERE s.token_hash = ? AND s.expires_at > ?')
    .bind(await sha256Hex(m[1]), now).first();
  return row ? { sub: row.sub, email: row.email, name: row.name || '', tokenHash: await sha256Hex(m[1]) } : null;
}

export async function memberInfo(env, email, now = Date.now()) {
  email = String(email).toLowerCase();
  const r = await env.DB.prepare('SELECT until, plan, source FROM members WHERE email = ?').bind(email).first();
  // when Stripe is set up: does this person have a subscription they can manage, and is it set to end?
  let managed = false, cancelAtPeriodEnd = false;
  if (env.STRIPE_SECRET_KEY) {
    try {
      await ensureBilling(env);
      const b = await env.DB.prepare('SELECT customer, status, cancel_at_period_end FROM billing WHERE email = ?').bind(email).first();
      if (b && b.customer) { managed = true; cancelAtPeriodEnd = !!b.cancel_at_period_end && ['active', 'trialing', 'past_due'].includes(b.status); }
    } catch (e) { /* billing info is optional */ }
  }
  if (!r) return { active: false, until: null, plan: null, managed };
  const active = r.until === null || r.until > now;
  return { active, until: r.until, plan: r.plan, source: r.source, managed, cancelAtPeriodEnd };
}

export function isAdmin(env, email) {
  return String(env.ADMIN_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean).includes(String(email).toLowerCase());
}

export async function profile(env, sess, now = Date.now()) {
  return { user: { email: sess.email, name: sess.name }, member: await memberInfo(env, sess.email, now), admin: isAdmin(env, sess.email) };
}

// Verifies the Google credential, upserts the user, opens a session. Shared by the popup and redirect sign-in endpoints.
export async function loginWithCredential(env, credential, now = Date.now()) {
  const g = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID);
  await env.DB.prepare(
    'INSERT INTO users (sub, email, name, created_at, last_login) VALUES (?, ?, ?, ?, ?) ' +
    'ON CONFLICT(sub) DO UPDATE SET email = excluded.email, name = excluded.name, last_login = excluded.last_login'
  ).bind(g.sub, g.email, g.name, now, now).run();
  const token = await createSession(env, g, now);
  return Object.assign({ token }, await profile(env, { email: g.email, name: g.name }, now));
}
