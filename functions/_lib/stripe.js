// Stripe subscriptions for the membership (no SDK: plain fetch to the Stripe API, Web Crypto for the webhook signature).
// Env: STRIPE_SECRET_KEY (sk_test_… / sk_live_…), STRIPE_WEBHOOK_SECRET (whsec_…). Both are secrets set in Cloudflare Pages.
// The amounts are in the code (price_data), so nothing has to be created in the Stripe dashboard besides the account, the webhook and the billing portal.
// Stripe writes into the same `members` rows as the admin grants (source = 'stripe'); an admin grant that runs longer is never shortened.
const DAY = 86400000;
export const PLANS = {
  monthly: { amount: 4900, interval: 'month', name: 'ครูฝึกคาลิมบา · สมาชิกรายเดือน (Kalimba Coach monthly)' },     // THB 49 (amounts are in satang)
  yearly: { amount: 53900, interval: 'year', name: 'ครูฝึกคาลิมบา · สมาชิกรายปี (Kalimba Coach yearly)' }          // THB 539 = 11 months
};
const CUSHION = DAY, PAST_DUE_GRACE = 3 * DAY;   // renewals reach us a little after the period ends; a failed card is retried for days

export const stripeEnabled = env => !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.DB);

let billingReady = false;
export async function ensureBilling(env) {
  if (billingReady) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS billing (email TEXT PRIMARY KEY, customer TEXT, sub TEXT, status TEXT, plan TEXT, cancel_at_period_end INTEGER NOT NULL DEFAULT 0, period_end INTEGER, updated_at INTEGER NOT NULL)').run();
  billingReady = true;
}
export function resetBillingFlag() { billingReady = false; }

// Stripe wants application/x-www-form-urlencoded with nested keys: a[b][0][c]=v
export function formEncode(obj, prefix = '', out = []) {
  Object.keys(obj).forEach(k => {
    const v = obj[k], key = prefix ? prefix + '[' + k + ']' : k;
    if (v === undefined || v === null) return;
    if (typeof v === 'object') formEncode(v, key, out); else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
  });
  return out;
}
export async function stripeApi(env, method, path, params) {
  const init = { method, headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY } };
  let url = 'https://api.stripe.com' + path;
  if (params && method === 'GET') url += '?' + formEncode(params).join('&');
  else if (params) { init.body = formEncode(params).join('&'); init.headers['content-type'] = 'application/x-www-form-urlencoded'; }
  const res = await fetch(url, init);
  let data = null;
  try { data = await res.json(); } catch (e) { /* not json */ }
  if (!res.ok) { const err = new Error('stripe_' + res.status + (data && data.error ? ':' + (data.error.code || data.error.type) : '')); err.status = res.status; throw err; }
  return data;
}

// Stripe-Signature: t=<unix>,v1=<hex hmac-sha256 of "<t>.<raw body>">[,v1=…]; refuse old timestamps (replay) and wrong signatures
export async function verifyStripeSignature(body, header, secret, now = Date.now(), tolerance = 300) {
  const parts = String(header || '').split(',').map(x => x.trim().split('='));
  const t = (parts.find(p => p[0] === 't') || [])[1], sigs = parts.filter(p => p[0] === 'v1').map(p => p[1]);
  if (!secret || !t || !sigs.length || !/^\d+$/.test(t) || Math.abs(now / 1000 - +t) > tolerance) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(t + '.' + body)));
  const hex = Array.from(mac).map(b => b.toString(16).padStart(2, '0')).join('');
  return sigs.some(s => s.length === hex.length && s.split('').reduce((d, c, i) => d | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

const periodEndOf = sub => (sub.current_period_end != null ? sub.current_period_end : (((sub.items || {}).data || [])[0] || {}).current_period_end) * 1000;   // newer API versions keep it on the item
const planOf = sub => {
  const price = (((sub.items || {}).data || [])[0] || {}).price || {};
  return price.recurring && price.recurring.interval === 'year' ? 'yearly' : (sub.metadata && sub.metadata.plan) || 'monthly';
};

// Turns the current state of a Stripe subscription into the member row. Idempotent: it only looks at the subscription as it is now.
export async function applySubscription(env, sub, now = Date.now()) {
  await ensureBilling(env);
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer && sub.customer.id;
  let email = String((sub.metadata && sub.metadata.email) || '').toLowerCase();
  if (!email && customer) { const b = await env.DB.prepare('SELECT email FROM billing WHERE customer = ?').bind(customer).first(); email = b ? b.email : ''; }
  if (!email) return { skipped: 'no_email' };
  const pe = periodEndOf(sub), plan = planOf(sub);
  if (!Number.isFinite(pe)) return { skipped: 'no_period' };
  const status = String(sub.status);
  let until;
  if (status === 'active' || status === 'trialing') until = pe + CUSHION;
  else if (status === 'past_due') until = pe + PAST_DUE_GRACE;
  else if (status === 'incomplete') return { skipped: 'incomplete' };           // checkout started, nothing paid yet
  else until = Math.min(pe, now);                                                 // canceled / unpaid / incomplete_expired / paused: access ends
  await env.DB.prepare(
    'INSERT INTO billing (email, customer, sub, status, plan, cancel_at_period_end, period_end, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(email) DO UPDATE SET customer = excluded.customer, sub = excluded.sub, status = excluded.status, plan = excluded.plan, ' +
    'cancel_at_period_end = excluded.cancel_at_period_end, period_end = excluded.period_end, updated_at = excluded.updated_at'
  ).bind(email, customer || null, sub.id, status, plan, sub.cancel_at_period_end ? 1 : 0, pe, now).run();
  const cur = await env.DB.prepare('SELECT until, source FROM members WHERE email = ?').bind(email).first();
  if (cur && cur.source === 'admin' && (cur.until === null || cur.until > until)) return { email, kept: 'admin_grant' };   // never shorten a longer grant from us
  await env.DB.prepare(
    'INSERT INTO members (email, until, plan, source, note, updated_at) VALUES (?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(email) DO UPDATE SET until = excluded.until, plan = excluded.plan, source = excluded.source, note = excluded.note, updated_at = excluded.updated_at'
  ).bind(email, until, plan, 'stripe', status, now).run();
  return { email, until, status, plan };
}

export const subscriptionIdOf = obj => {
  if (!obj) return '';
  if (obj.object === 'subscription') return obj.id;
  const s = obj.subscription || (obj.parent && obj.parent.subscription_details && obj.parent.subscription_details.subscription);
  return typeof s === 'string' ? s : (s && s.id) || '';
};
