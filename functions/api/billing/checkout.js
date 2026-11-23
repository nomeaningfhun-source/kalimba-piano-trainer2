import { json, fail, getSession } from '../../_lib/auth.js';
import { stripeEnabled, billingOpen, stripeApi, ensureBilling, PLANS, TRIAL_DAYS } from '../../_lib/stripe.js';
// POST { plan: 'monthly' | 'yearly' } (signed in) -> { url } of a Stripe Checkout page for a subscription in Thai baht.
export async function onRequestPost({ request, env }) {
  if (!stripeEnabled(env)) return fail(503, 'not_configured');
  if (!billingOpen(env)) return fail(503, 'not_open');   // beta: sign-ups are closed
  const s = await getSession(env, request);
  if (!s) return fail(401, 'unauthorized');
  let b;
  try { b = await request.json(); } catch (e) { return fail(400, 'bad_json'); }
  const plan = PLANS[b && b.plan];
  if (!plan) return fail(400, 'bad_plan');
  await ensureBilling(env);
  const cur = await env.DB.prepare('SELECT customer, status, period_end FROM billing WHERE email = ?').bind(s.email).first();
  const trial = !cur;   // the free trial is for a first subscription only: anyone who has ever started one (even if cancelled) pays from day one
  if (cur && ['active', 'trialing', 'past_due'].includes(cur.status)) return fail(409, 'already_subscribed');   // change or cancel it in the billing portal instead
  const origin = new URL(request.url).origin;
  const params = {
    mode: 'subscription',
    line_items: { 0: { quantity: 1, price_data: { currency: 'thb', unit_amount: plan.amount, recurring: { interval: plan.interval }, product_data: { name: plan.name } } } },
    client_reference_id: s.email,
    subscription_data: Object.assign({ metadata: { email: s.email, plan: b.plan } },
      // free days with the card collected first; if the card is missing when the trial ends the subscription is cancelled, not left open
      trial ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } } : {}),
    payment_method_collection: 'always',
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
