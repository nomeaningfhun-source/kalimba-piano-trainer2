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
const env = { DB, GOOGLE_CLIENT_ID: CLIENT, ADMIN_EMAILS: 'boss@example.com' };
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = Object.assign(await crypto.subtle.exportKey('jwk', kp.publicKey), { kid: 'k1', alg: 'RS256' });
const realFetch = globalThis.fetch;
globalThis.fetch = (u, o) => String(u).includes('googleapis.com/oauth2/v3/certs') ? Promise.resolve(new Response(JSON.stringify({ keys: [jwk] }))) : realFetch(u, o);
const b64u = b => Buffer.from(b).toString('base64url');
async function idToken(email, sub, name) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ iss: 'accounts.google.com', aud: CLIENT, sub, email, email_verified: true, name, exp: Math.floor(Date.now() / 1000) + 3600 }));
  return h + '.' + p + '.' + b64u(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))));
}
const routes = { '/api/config': 'config.js', '/api/me': 'me.js', '/api/auth/google': 'auth/google.js', '/api/auth/logout': 'auth/logout.js', '/api/admin/members': 'admin/members.js' };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
http.createServer(async (rq, rs) => {
  const url = new URL(rq.url, 'http://localhost:' + port);
  if (url.pathname === '/__token') { rs.end(await idToken(url.searchParams.get('email') || 'a@b.co', url.searchParams.get('sub') || url.searchParams.get('email') || '1', url.searchParams.get('name') || 'Test')); return; }
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
