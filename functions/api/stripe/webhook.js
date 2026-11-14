import { json, fail } from '../../_lib/auth.js';
import { stripeEnabled, verifyStripeSignature, stripeApi, applySubscription, subscriptionIdOf } from '../../_lib/stripe.js';
// Stripe → us. Verified with the webhook secret. We never trust the event body for the state: the subscription is fetched again from Stripe.
const WATCHED = new Set(['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed']);
export async function onRequestPost({ request, env }) {
  if (!stripeEnabled(env)) return fail(503, 'not_configured');
  const body = await request.text();
  if (!(await verifyStripeSignature(body, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET))) return fail(400, 'bad_signature');
  let ev;
  try { ev = JSON.parse(body); } catch (e) { return fail(400, 'bad_json'); }
  if (!ev || !WATCHED.has(ev.type)) return json({ received: true, ignored: true });
  const obj = ev.data && ev.data.object;
  if (ev.type === 'checkout.session.completed' && (!obj || obj.mode !== 'subscription')) return json({ received: true, ignored: true });
  const id = subscriptionIdOf(obj);
  if (!id) return json({ received: true, ignored: true });
  try {
    const sub = await stripeApi(env, 'GET', '/v1/subscriptions/' + encodeURIComponent(id));
    // a checkout carries the member's email as client_reference_id too, in case the subscription metadata is missing
    if (ev.type === 'checkout.session.completed' && obj.client_reference_id && !(sub.metadata && sub.metadata.email)) sub.metadata = Object.assign({}, sub.metadata, { email: obj.client_reference_id });
    return json({ received: true, result: await applySubscription(env, sub) });
  } catch (e) {
    return fail(500, 'processing_failed');   // Stripe retries a failed delivery for days
  }
}
