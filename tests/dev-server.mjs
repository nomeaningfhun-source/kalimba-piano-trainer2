// Local dev server: serves the app and runs the real functions/ against an in-memory sqlite DB with a fake Google.
// node --no-warnings tests/dev-server.mjs [port]  ->  http://localhost:8788/   (token for a fake Google user: /__token?email=a@b.co)
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto as crypto } from 'node:crypto';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const port = +process.argv[2] || 8788;
const sq = new DatabaseSync(':memory:');
sq.exec(readFileSync(join(root, 'schema.sql'), 'utf8'));
const DB = { prepare(sql) { const st = sq.prepare(sql); const mk = a => ({ first: async () => st.get(...a) || null, run: async () => { st.run(...a); return {}; }, all: async () => ({ results: st.all(...a) }) }); return Object.assign(mk([]), { bind: (...a) => mk(a) }); } };
const CLIENT = 'dev-client';
const env = { DB, GOOGLE_CLIENT_ID: CLIENT, ADMIN_EMAILS: 'boss@example.com', STRIPE_SECRET_KEY: 'sk_test_dev', STRIPE_WEBHOOK_SECRET: 'whsec_dev' };   // fake Stripe: see __fake_stripe below
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = Object.assign(await crypto.subtle.exportKey('jwk', kp.publicKey), { kid: 'k1', alg: 'RS256' });
const realFetch = globalThis.fetch;
const fakeSubs = {};   // the pretend Stripe: Checkout answers with a page of ours; /__pay?email=&plan= plays the webhook for a paid subscription
globalThis.fetch = (u, o) => {
  u = String(u);
  if (u.includes('googleapis.com/oauth2/v3/certs')) return Promise.resolve(new Response(JSON.stringify({ keys: [jwk] })));
  if (u.startsWith('https://api.stripe.com')) {
    if (u.endsWith('/v1/checkout/sessions')) return Promise.resolve(new Response(JSON.stringify({ url: 'http://localhost:' + port + '/__fake_checkout?' + new URLSearchParams({ body: String(o.body || '') }) })));
    if (u.endsWith('/v1/billing_portal/sessions')) return Promise.resolve(new Response(JSON.stringify({ url: 'http://localhost:' + port + '/__fake_portal' })));
    const m = /\/v1\/subscriptions\/(.+)$/.exec(u);
    if (m && fakeSubs[decodeURIComponent(m[1])]) return Promise.resolve(new Response(JSON.stringify(fakeSubs[decodeURIComponent(m[1])])));
    return Promise.resolve(new Response('{}', { status: 404 }));
  }
  return realFetch(u, o);
};
const b64u = b => Buffer.from(b).toString('base64url');
async function idToken(email, sub, name) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ iss: 'accounts.google.com', aud: CLIENT, sub, email, email_verified: true, name, exp: Math.floor(Date.now() / 1000) + 3600 }));
  return h + '.' + p + '.' + b64u(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))));
}
const routes = { '/api/config': 'config.js', '/api/me': 'me.js', '/api/auth/google': 'auth/google.js', '/api/auth/logout': 'auth/logout.js', '/api/admin/members': 'admin/members.js', '/api/billing/checkout': 'billing/checkout.js', '/api/billing/portal': 'billing/portal.js', '/api/stripe/webhook': 'stripe/webhook.js' };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
http.createServer(async (rq, rs) => {
  const url = new URL(rq.url, 'http://localhost:' + port);
  if (url.pathname === '/__token') { rs.end(await idToken(url.searchParams.get('email') || 'a@b.co', url.searchParams.get('sub') || url.searchParams.get('email') || '1', url.searchParams.get('name') || 'Test')); return; }
  if (url.pathname === '/__fake_checkout') { rs.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); rs.end('<body style="font-family:sans-serif;padding:24px"><h2>Fake Stripe Checkout</h2><p>' + (new URLSearchParams(url.searchParams.get('body')).get('line_items[0][price_data][unit_amount]') || '') + ' satang</p><p><a href="/__pay?' + new URLSearchParams({ email: new URLSearchParams(url.searchParams.get('body')).get('client_reference_id') || '', plan: /interval\]=year/.test(decodeURIComponent(url.searchParams.get('body') || '')) ? 'yearly' : 'monthly' }) + '">Pay</a></p>'); return; }
  if (url.pathname === '/__fake_portal') { rs.writeHead(200, { 'content-type': 'text/html' }); rs.end('<body style="font-family:sans-serif;padding:24px"><h2>Fake billing portal</h2><p><a href="/__cancel?email=' + encodeURIComponent(url.searchParams.get('email') || '') + '">Cancel at period end</a> · <a href="/?billing=return">Back to app</a></p>'); return; }
  if (url.pathname === '/__pay' || url.pathname === '/__cancel') {
    const email = url.searchParams.get('email'), plan = url.searchParams.get('plan') || 'monthly', id = 'sub_' + email;
    const cancel = url.pathname === '/__cancel';
    fakeSubs[id] = { id, object: 'subscription', customer: 'cus_' + email, status: 'active', cancel_at_period_end: cancel, current_period_end: Math.floor(Date.now() / 1000) + (plan === 'yearly' ? 365 : 30) * 86400,
      metadata: { email, plan }, items: { data: [{ price: { recurring: { interval: plan === 'yearly' ? 'year' : 'month' } } }] } };
    const body = JSON.stringify({ id: 'evt_dev', type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: id, client_reference_id: email } } });
    const t = Math.floor(Date.now() / 1000), key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_dev'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(t + '.' + body))).toString('hex');
    const mod = await import(pathToFileURL(join(root, 'functions/api/stripe/webhook.js')).href + '?' + Date.now());
    await mod.onRequestPost({ request: new Request('http://localhost/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': 't=' + t + ',v1=' + sig }, body }), env });
    rs.writeHead(302, { location: cancel ? '/?billing=return' : '/?billing=success' }); rs.end(); return;
  }
  if (routes[url.pathname]) {
    const mod = await import(pathToFileURL(join(root, 'functions/api', routes[url.pathname])).href + '?' + Date.now());
    const chunks = []; for await (const c of rq) chunks.push(c);
    const request = new Request(url, { method: rq.method, headers: rq.headers, body: ['GET', 'HEAD'].includes(rq.method) ? undefined : Buffer.concat(chunks) });
    const fn = mod['onRequest' + rq.method[0] + rq.method.slice(1).toLowerCase()];
    const res = fn ? await fn({ request, env }) : new Response('{}', { status: 405 });
    rs.writeHead(res.status, Object.fromEntries(res.headers)); rs.end(Buffer.from(await res.arrayBuffer())); return;
  }
  let f = normalize(join(root, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!f.startsWith(root) || !existsSync(f) || statSync(f).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
  rs.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); rs.end(readFileSync(f));
}).listen(port, () => console.log('dev server on http://localhost:' + port));
