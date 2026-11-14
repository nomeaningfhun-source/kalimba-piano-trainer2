import { json, fail, getSession } from '../../_lib/auth.js';
import { stripeEnabled, stripeApi, ensureBilling } from '../../_lib/stripe.js';
// POST (signed in) -> { url } of the Stripe billing portal where the member cancels, changes plan or updates the card.
export async function onRequestPost({ request, env }) {
  if (!stripeEnabled(env)) return fail(503, 'not_configured');
  const s = await getSession(env, request);
  if (!s) return fail(401, 'unauthorized');
  await ensureBilling(env);
  const cur = await env.DB.prepare('SELECT customer FROM billing WHERE email = ?').bind(s.email).first();
  if (!cur || !cur.customer) return fail(404, 'no_customer');
  try {
    const p = await stripeApi(env, 'POST', '/v1/billing_portal/sessions', { customer: cur.customer, return_url: new URL(request.url).origin + '/?billing=return' });
    return json({ url: p.url });
  } catch (e) { return fail(502, 'stripe_error'); }
}
