import { json, fail, getSession } from '../../_lib/auth.js';
import { stripeEnabled, stripeApi, ensureBilling, PLANS } from '../../_lib/stripe.js';
// POST { plan: 'monthly' | 'yearly' } (signed in) -> { url } of a Stripe Checkout page for a subscription in Thai baht.
export async function onRequestPost({ request, env }) {
  if (!stripeEnabled(env)) return fail(503, 'not_configured');
  const s = await getSession(env, request);
  if (!s) return fail(401, 'unauthorized');
  let b;
  try { b = await request.json(); } catch (e) { return fail(400, 'bad_json'); }
  const plan = PLANS[b && b.plan];
  if (!plan) return fail(400, 'bad_plan');
  await ensureBilling(env);
  const cur = await env.DB.prepare('SELECT customer, status, period_end FROM billing WHERE email = ?').bind(s.email).first();
  if (cur && ['active', 'trialing', 'past_due'].includes(cur.status)) return fail(409, 'already_subscribed');   // change or cancel it in the billing portal instead
  const origin = new URL(request.url).origin;
  const params = {
    mode: 'subscription',
    line_items: { 0: { quantity: 1, price_data: { currency: 'thb', unit_amount: plan.amount, recurring: { interval: plan.interval }, product_data: { name: plan.name } } } },
    client_reference_id: s.email,
    subscription_data: { metadata: { email: s.email, plan: b.plan } },
    metadata: { email: s.email, plan: b.plan },
    success_url: origin + '/?billing=success',
    cancel_url: origin + '/?billing=cancel',
    locale: 'th',
    allow_promotion_codes: 'true'
  };
  if (cur && cur.customer) params.customer = cur.customer; else params.customer_email = s.email;
  try {
    const session = await stripeApi(env, 'POST', '/v1/checkout/sessions', params);
    return json({ url: session.url });
  } catch (e) { return fail(502, 'stripe_error'); }
}
