// Tests for the membership API (functions/). Run: node --no-warnings api.test.mjs
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { verifyGoogleIdToken, resetKeyCache } from '../functions/_lib/auth.js';
import { onRequestGet as config } from '../functions/api/config.js';
import { onRequestPost as login } from '../functions/api/auth/google.js';
import { onRequestPost as logout } from '../functions/api/auth/logout.js';
import { onRequestPost as loginRedirect } from '../functions/api/auth/google-redirect.js';
import { onRequestGet as me } from '../functions/api/me.js';
import { onRequestGet as listMembers, onRequestPost as setMember } from '../functions/api/admin/members.js';

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } else console.log('ok ' + m); };

// D1-shaped wrapper around node:sqlite
const sq = new DatabaseSync(':memory:');
sq.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const DB = { prepare(sql) {
  const st = sq.prepare(sql);
  const mk = args => ({
    first: async () => st.get(...args) || null,
    run: async () => { st.run(...args); return { success: true }; },
    all: async () => ({ results: st.all(...args) })
  });
  return Object.assign(mk([]), { bind: (...a) => mk(a) });
} };

const CLIENT = 'test-client.apps.googleusercontent.com';
const env = { DB, GOOGLE_CLIENT_ID: CLIENT, ADMIN_EMAILS: 'boss@example.com' };

// our own Google: an RSA key whose public half is served as the JWKS
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = Object.assign(await crypto.subtle.exportKey('jwk', kp.publicKey), { kid: 'k1', alg: 'RS256', use: 'sig' });
const fakeFetch = async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
globalThis.fetch = fakeFetch;
const b64u = b => Buffer.from(b).toString('base64url');
async function idToken(over = {}, signer = kp.privateKey) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }));
  const p = b64u(JSON.stringify(Object.assign({ iss: 'https://accounts.google.com', aud: CLIENT, sub: '1001', email: 'Fan@Example.com', email_verified: true, name: 'Fan', exp: Math.floor(Date.now() / 1000) + 3600 }, over)));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signer, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + b64u(new Uint8Array(sig));
}
const req = (method, path, body, token) => new Request('https://x.test' + path, { method, headers: Object.assign({ 'content-type': 'application/json' }, token ? { authorization: 'Bearer ' + token } : {}), body: body ? JSON.stringify(body) : undefined });
const call = async (fn, r, e = env) => { const res = await fn({ request: r, env: e }); return [res.status, await res.json()]; };

// --- token verification
const good = await verifyGoogleIdToken(await idToken(), CLIENT);
ok(good.email === 'fan@example.com' && good.sub === '1001', 'valid Google token accepted, email lower-cased');
const rejects = async (over, signer) => { try { await verifyGoogleIdToken(await idToken(over, signer), CLIENT); return false; } catch (e) { return true; } };
ok(await rejects({ aud: 'other' }), 'wrong audience rejected');
ok(await rejects({ exp: 1000 }), 'expired token rejected');
ok(await rejects({ iss: 'https://evil.test' }), 'wrong issuer rejected');
ok(await rejects({ email_verified: false }), 'unverified email rejected');
const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
ok(await rejects({}, other.privateKey), 'bad signature rejected');
resetKeyCache();

// --- config
ok((await call(config, req('GET', '/api/config')))[1].enabled === true, 'config enabled when client id + DB present');
ok((await call(config, req('GET', '/api/config'), {}))[1].enabled === false, 'config disabled without setup');

// --- login + me
let [s, b] = await call(login, req('POST', '/api/auth/google', { credential: 'junk' }));
ok(s === 401, 'login with junk credential -> 401');
[s, b] = await call(login, req('POST', '/api/auth/google', { credential: await idToken() }));
ok(s === 200 && b.token && b.user.email === 'fan@example.com' && b.member.active === false && b.admin === false, 'login ok, not a member yet');
const fanToken = b.token;
ok(sq.prepare('SELECT COUNT(*) c FROM sessions').get().c === 1 && !sq.prepare('SELECT token_hash FROM sessions').get().token_hash.includes(fanToken), 'only a hash of the token is stored');
[s, b] = await call(me, req('GET', '/api/me', null, fanToken));
ok(s === 200 && b.user.email === 'fan@example.com', '/api/me works with the token');
ok((await call(me, req('GET', '/api/me')))[0] === 401, '/api/me without token -> 401');
ok((await call(me, req('GET', '/api/me', null, 'A'.repeat(43))))[0] === 401, '/api/me with unknown token -> 401');

// --- admin
ok((await call(setMember, req('POST', '/api/admin/members', { email: 'fan@example.com', days: 30 }, fanToken)))[0] === 403, 'non-admin cannot grant');
ok((await call(listMembers, req('GET', '/api/admin/members', null, fanToken)))[0] === 403, 'non-admin cannot list');
[s, b] = await call(login, req('POST', '/api/auth/google', { credential: await idToken({ sub: '9', email: 'boss@example.com', name: 'Boss' }) }));
ok(b.admin === true, 'admin email flagged as admin');
const boss = b.token;
[s, b] = await call(setMember, req('POST', '/api/admin/members', { email: 'Fan@example.com', days: 30, note: 'friend' }, boss));
ok(s === 200 && b.active && b.until > Date.now() + 29 * 86400000, 'admin grants 30 days');
[s, b] = await call(me, req('GET', '/api/me', null, fanToken));
ok(b.member.active === true && b.member.until > Date.now(), 'member sees active membership (matched by email, case-insensitive)');
const first = b.member.until;
await call(setMember, req('POST', '/api/admin/members', { email: 'fan@example.com', days: 30 }, boss));
[s, b] = await call(me, req('GET', '/api/me', null, fanToken));
ok(b.member.until > first + 29 * 86400000, 'extending adds to remaining time');
await call(setMember, req('POST', '/api/admin/members', { email: 'fan@example.com', lifetime: true }, boss));
[s, b] = await call(me, req('GET', '/api/me', null, fanToken));
ok(b.member.active && b.member.until === null, 'lifetime = until null');
sq.prepare('UPDATE members SET until = ? WHERE email = ?').run(Date.now() - 1000, 'fan@example.com');
[s, b] = await call(me, req('GET', '/api/me', null, fanToken));
ok(b.member.active === false, 'expired membership is inactive');
ok((await call(setMember, req('POST', '/api/admin/members', { email: 'bad', days: 5 }, boss)))[0] === 400, 'bad email rejected');
ok((await call(setMember, req('POST', '/api/admin/members', { email: 'a@b.co', days: -5 }, boss)))[0] === 400, 'bad duration rejected');
[s, b] = await call(listMembers, req('GET', '/api/admin/members', null, boss));
ok(s === 200 && b.members.length === 1, 'admin lists members');
await call(setMember, req('POST', '/api/admin/members', { email: 'fan@example.com', revoke: true }, boss));
ok(sq.prepare('SELECT COUNT(*) c FROM members').get().c === 0, 'revoke removes the row');

// --- redirect-mode sign-in (installed iPhone app)
const form = (credential, csrf) => new Request('https://x.test/api/auth/google-redirect', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: 'g_csrf_token=abc123' },
  body: new URLSearchParams({ credential, g_csrf_token: csrf }).toString() });
let html = await (await loginRedirect({ request: form(await idToken({ sub: '55', email: 'ios@example.com', name: 'A</script><b>' }), 'abc123'), env })).text();
ok(html.includes('kt.acct') && html.includes('location.replace') && !html.includes('</script><b>'), 'redirect sign-in stores the session and escapes the name');
const stored = JSON.parse(JSON.parse(/setItem\("kt\.acct",(".*?")\)\}catch/s.exec(html)[1]));
ok(stored.token && stored.user.email === 'ios@example.com' && stored.user.name === 'A</script><b>', 'stored session parses back with the original name');
ok((await call(me, req('GET', '/api/me', null, stored.token)))[0] === 200, 'token from redirect page works');
html = await (await loginRedirect({ request: form(await idToken(), 'WRONG'), env })).text();
ok(!html.includes('kt.acct'), 'redirect sign-in refuses a csrf mismatch');

// --- logout
await call(logout, req('POST', '/api/auth/logout', null, fanToken));
ok((await call(me, req('GET', '/api/me', null, fanToken)))[0] === 401, 'token dead after logout');
sq.prepare('UPDATE sessions SET expires_at = 1').run();
ok((await call(me, req('GET', '/api/me', null, boss)))[0] === 401, 'expired session -> 401');

// --- Stripe: checkout, webhook, billing portal (Stripe API faked)
import { onRequestPost as checkout } from '../functions/api/billing/checkout.js';
import { onRequestPost as portal } from '../functions/api/billing/portal.js';
import { onRequestPost as webhook } from '../functions/api/stripe/webhook.js';
import { verifyStripeSignature, formEncode, resetBillingFlag } from '../functions/_lib/stripe.js';
sq.exec('DELETE FROM sessions; DELETE FROM members;');
const senv = Object.assign({}, env, { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test' });
ok((await call(config, req('GET', '/api/config'), senv))[1].billing === true && (await call(config, req('GET', '/api/config')))[1].billing === false, 'config says billing is on only with the Stripe keys');
ok(formEncode({ a: { 0: { b: 1 } }, c: 'x y' }).join('&') === 'a%5B0%5D%5Bb%5D=1&c=x%20y', 'nested params are form-encoded the Stripe way');

const hmac = async (secret, text) => Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(text)))).map(x => x.toString(16).padStart(2, '0')).join('');
const signed = async (body, t = Math.floor(Date.now() / 1000), secret = 'whsec_test') => 't=' + t + ',v1=' + await hmac(secret, t + '.' + body);
ok(await verifyStripeSignature('{}', await signed('{}'), 'whsec_test'), 'valid Stripe signature accepted');
ok(!(await verifyStripeSignature('{}', await signed('{}', undefined, 'other'), 'whsec_test')), 'wrong secret rejected');
ok(!(await verifyStripeSignature('{"x":1}', await signed('{}'), 'whsec_test')), 'tampered body rejected');
ok(!(await verifyStripeSignature('{}', await signed('{}', Math.floor(Date.now() / 1000) - 3600), 'whsec_test')), 'old timestamp (replay) rejected');
ok(!(await verifyStripeSignature('{}', '', 'whsec_test')) && !(await verifyStripeSignature('{}', 't=1', 'whsec_test')), 'missing signature rejected');

// the fake Stripe: records calls; subscriptions live in `subs`
const calls = [], subs = {};
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (!url.startsWith('https://api.stripe.com')) return realFetch(url, init);
  calls.push({ url, method: init.method, body: init.body ? decodeURIComponent(String(init.body)) : '', auth: init.headers && init.headers.authorization });
  if (url.endsWith('/v1/checkout/sessions')) return new Response(JSON.stringify({ url: 'https://checkout.stripe.test/c/abc' }), { status: 200 });
  if (url.endsWith('/v1/billing_portal/sessions')) return new Response(JSON.stringify({ url: 'https://billing.stripe.test/p/abc' }), { status: 200 });
  const m = /\/v1\/subscriptions\/(.+)$/.exec(url);
  if (m && subs[m[1]]) return new Response(JSON.stringify(subs[m[1]]), { status: 200 });
  return new Response(JSON.stringify({ error: { type: 'invalid_request_error', code: 'resource_missing' } }), { status: 404 });
};
const NOW = Date.now(), PE = Math.floor(NOW / 1000) + 30 * 86400;
const mkSub = (over = {}) => Object.assign({ id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'active', cancel_at_period_end: false, current_period_end: PE,
  metadata: { email: 'pay@example.com', plan: 'monthly' }, items: { data: [{ price: { recurring: { interval: 'month' } } }] } }, over);
const hook = async (type, obj, sig) => { const body = JSON.stringify({ id: 'evt_1', type, data: { object: obj } }); return call(webhook, new Request('https://x.test/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig === undefined ? await signed(body) : sig }, body }), senv); };

// checkout needs a signed-in person, a known plan, and the keys
[s, b] = await call(login, req('POST', '/api/auth/google', { credential: await idToken({ sub: '700', email: 'Pay@Example.com', name: 'Pay' }) }));
const payToken = b.token;
ok((await call(checkout, req('POST', '/api/billing/checkout', { plan: 'monthly' }, payToken)))[0] === 503, 'checkout refuses when Stripe is not configured');
ok((await call(checkout, req('POST', '/api/billing/checkout', { plan: 'monthly' }), senv))[0] === 401, 'checkout needs sign-in');
ok((await call(checkout, req('POST', '/api/billing/checkout', { plan: 'weekly' }, payToken), senv))[0] === 400, 'checkout rejects an unknown plan');
[s, b] = await call(checkout, req('POST', '/api/billing/checkout', { plan: 'yearly' }, payToken), senv);
ok(s === 200 && b.url === 'https://checkout.stripe.test/c/abc', 'checkout returns the Stripe page url');
const c0 = calls[calls.length - 1];
ok(c0.auth === 'Bearer sk_test_x' && c0.body.includes('mode=subscription') && c0.body.includes('unit_amount]=53900') && c0.body.includes('currency]=thb') && c0.body.includes('interval]=year'), 'yearly checkout is THB 539 per year');
ok(c0.body.includes('customer_email=pay@example.com') && c0.body.includes('client_reference_id=pay@example.com') && c0.body.includes('metadata][email]=pay@example.com'), 'checkout is tied to the signed-in email');
await call(checkout, req('POST', '/api/billing/checkout', { plan: 'monthly' }, payToken), senv);
ok(calls[calls.length - 1].body.includes('unit_amount]=4900') && calls[calls.length - 1].body.includes('interval]=month'), 'monthly checkout is THB 49 per month');

// the webhook
ok((await hook('customer.subscription.created', mkSub(), 'bad'))[0] === 400, 'webhook with a bad signature -> 400');
ok(sq.prepare('SELECT COUNT(*) c FROM members').get().c === 0, '...and changes nothing');
subs.sub_1 = mkSub();
[s, b] = await hook('checkout.session.completed', { object: 'checkout.session', mode: 'subscription', subscription: 'sub_1', client_reference_id: 'pay@example.com' });
ok(s === 200 && b.result.email === 'pay@example.com', 'checkout.session.completed activates the member');
let row = sq.prepare('SELECT * FROM members WHERE email = ?').get('pay@example.com');
ok(row.source === 'stripe' && row.plan === 'monthly' && row.until > NOW + 29 * 86400000 && row.until < NOW + 32 * 86400000, 'member row: stripe, monthly, until ≈ period end');
[s, b] = await call(me, req('GET', '/api/me', null, payToken), senv);
ok(b.member.active === true && b.member.managed === true && b.member.cancelAtPeriodEnd === false && b.member.source === 'stripe', '/api/me shows an active, manageable subscription');
await hook('checkout.session.completed', { object: 'checkout.session', mode: 'subscription', subscription: 'sub_1', client_reference_id: 'pay@example.com' });
ok(sq.prepare('SELECT COUNT(*) c FROM members').get().c === 1, 'the same event twice changes nothing more (idempotent)');
ok((await hook('checkout.session.completed', { object: 'checkout.session', mode: 'payment', subscription: null }))[1].ignored === true, 'one-off payments are ignored');
ok((await hook('charge.refunded', { id: 'ch_1' }))[1].ignored === true, 'unrelated events are ignored');
ok((await call(checkout, req('POST', '/api/billing/checkout', { plan: 'monthly' }, payToken), senv))[0] === 409, 'an active subscriber is sent to the portal, not to a second checkout');

// renewal moves the end date; cancel-at-period-end keeps access and is shown
const PE2 = PE + 30 * 86400;
subs.sub_1 = mkSub({ current_period_end: PE2 });
await hook('invoice.paid', { object: 'invoice', subscription: 'sub_1' });
ok(sq.prepare('SELECT until FROM members WHERE email = ?').get('pay@example.com').until > NOW + 59 * 86400000, 'a renewal (invoice.paid) pushes the end date out');
subs.sub_1 = mkSub({ current_period_end: PE2, cancel_at_period_end: true });
await hook('customer.subscription.updated', mkSub());
[s, b] = await call(me, req('GET', '/api/me', null, payToken), senv);
ok(b.member.active === true && b.member.cancelAtPeriodEnd === true, 'cancelled at period end: still a member, flagged as ending');
// payment fails: a few days of grace after the period end
subs.sub_1 = mkSub({ status: 'past_due', current_period_end: Math.floor(NOW / 1000) - 86400 });
await hook('invoice.payment_failed', { object: 'invoice', subscription: 'sub_1' });
ok(sq.prepare('SELECT until FROM members WHERE email = ?').get('pay@example.com').until > NOW, 'past_due keeps access for a short grace period');
// the subscription ends
subs.sub_1 = mkSub({ status: 'canceled', current_period_end: Math.floor(NOW / 1000) + 5 * 86400 });
await hook('customer.subscription.deleted', mkSub({ status: 'canceled' }));
ok(sq.prepare('SELECT until FROM members WHERE email = ?').get('pay@example.com').until <= Date.now(), 'a cancelled subscription ends access now');
[s, b] = await call(me, req('GET', '/api/me', null, payToken), senv);
ok(b.member.active === false, '/api/me: no longer a member');
// not paid yet, or the email is unknown
subs.sub_2 = mkSub({ id: 'sub_2', status: 'incomplete', metadata: { email: 'new@example.com' } });
await hook('customer.subscription.created', { object: 'subscription', id: 'sub_2' });
ok(!sq.prepare('SELECT 1 FROM members WHERE email = ?').get('new@example.com'), 'an unpaid (incomplete) subscription grants nothing');
subs.sub_3 = mkSub({ id: 'sub_3', customer: 'cus_unknown', metadata: {} });
[s, b] = await hook('customer.subscription.updated', { object: 'subscription', id: 'sub_3' });
ok(s === 200 && b.result.skipped === 'no_email', 'a subscription with no known email is skipped without an error');
[s, b] = await hook('customer.subscription.updated', { object: 'subscription', id: 'sub_missing' });
ok(s === 500, 'a Stripe lookup failure answers 500 so Stripe retries');

// an admin grant that runs longer is not shortened by Stripe
const boss2 = (await call(login, req('POST', '/api/auth/google', { credential: await idToken({ sub: '9', email: 'boss@example.com', name: 'Boss' }) })))[1].token;
await call(setMember, req('POST', '/api/admin/members', { email: 'pay@example.com', lifetime: true }, boss2));
subs.sub_1 = mkSub({ status: 'canceled', current_period_end: Math.floor(NOW / 1000) - 86400 });
await hook('customer.subscription.deleted', mkSub({ status: 'canceled' }));
row = sq.prepare('SELECT * FROM members WHERE email = ?').get('pay@example.com');
ok(row.until === null && row.source === 'admin', 'a lifetime grant from us survives a Stripe cancellation');

// the portal
[s, b] = await call(portal, req('POST', '/api/billing/portal', null, payToken), senv);
ok(s === 200 && b.url === 'https://billing.stripe.test/p/abc' && calls[calls.length - 1].body.includes('customer=cus_1'), 'portal opens for the stored Stripe customer');
const nobody = (await call(login, req('POST', '/api/auth/google', { credential: await idToken({ sub: '701', email: 'nobody@example.com', name: 'N' }) })))[1].token;
ok((await call(portal, req('POST', '/api/billing/portal', null, nobody), senv))[0] === 404, 'portal: someone who never subscribed -> 404');
globalThis.fetch = realFetch;

console.log(failed ? failed + ' FAILED' : 'all api tests passed');
process.exit(failed ? 1 : 0);
