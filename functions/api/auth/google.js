import { json, fail, loginWithCredential } from '../../_lib/auth.js';
// POST { credential } -> verifies the Google ID token, upserts the user, returns a session token + profile.
export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.GOOGLE_CLIENT_ID) return fail(503, 'not_configured');
  let body;
  try { body = await request.json(); } catch (e) { return fail(400, 'bad_json'); }
  try { return json(await loginWithCredential(env, body && body.credential)); } catch (e) { return fail(401, 'invalid_token'); }
}
