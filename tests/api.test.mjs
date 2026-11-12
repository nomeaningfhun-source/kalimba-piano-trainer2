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

console.log(failed ? failed + ' FAILED' : 'all api tests passed');
process.exit(failed ? 1 : 0);
