import { loginWithCredential } from '../../_lib/auth.js';
// Google redirect-mode sign-in (used when the app runs as an installed iPhone app, where a popup cannot talk back).
// Google POSTs a form { credential, g_csrf_token } here; the g_csrf_token cookie must match (double submit). The page it returns stores
// the session in localStorage (same key as js/account.js) and goes back to the app.
const page = body => new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  const back = (msg) => page('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;padding:24px"><p>' + msg + '</p><p><a href="/">กลับไปที่แอป / Back to the app</a></p>');
  if (!env.DB || !env.GOOGLE_CLIENT_ID) return back('ระบบสมาชิกยังไม่เปิดใช้งาน / Membership is not set up yet');
  let form;
  try { form = await request.formData(); } catch (e) { return back('เข้าสู่ระบบไม่สำเร็จ / Sign-in failed'); }
  const csrf = form.get('g_csrf_token'), cookie = /(?:^|;\s*)g_csrf_token=([^;]+)/.exec(request.headers.get('cookie') || '');
  if (!csrf || !cookie || cookie[1] !== csrf) return back('เข้าสู่ระบบไม่สำเร็จ / Sign-in failed');
  let r;
  try { r = await loginWithCredential(env, form.get('credential')); } catch (e) { return back('เข้าสู่ระบบไม่สำเร็จ / Sign-in failed'); }
  const acct = JSON.stringify({ token: r.token, user: r.user, member: r.member, admin: r.admin, checkedAt: Date.now() }).replace(/</g, '\\u003c');
  return page('<!doctype html><meta charset="utf-8"><body><script>try{localStorage.setItem("kt.acct",' + JSON.stringify(acct) + ')}catch(e){}location.replace("/")</script>');
}
