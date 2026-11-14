# Membership setup (Cloudflare Pages + D1 + Google sign-in)

Code: `functions/` (API), `js/account.js` (app side), `schema.sql` (D1 tables). Tests: `node --no-warnings tests/api.test.mjs`.
Try it locally with fake Google: `node --no-warnings tests/dev-server.mjs` then open http://localhost:8788/ (`/__token?email=a@b.co` makes a fake Google token).

## One-time setup (Cloudflare account nomeaningfhun@gmail.com)
1. **D1 database**: Storage & databases → D1 → Create `kalimba-members`. In its Console run the contents of `schema.sql`.
2. **Bind it**: Workers & Pages → `playkalimba` → Settings → Bindings → Add → D1 database → variable name `DB` → `kalimba-members` (Production).
3. **Google sign-in** (Fun, Google Cloud console, project of her choice):
   - APIs & Services → OAuth consent screen (External, app name "ครูฝึกคาลิมบา", support email).
   - Credentials → Create credentials → OAuth client ID → Web application.
   - Authorized JavaScript origins: `https://playkalimba.pages.dev`
   - Authorized redirect URIs: `https://playkalimba.pages.dev/api/auth/google-redirect` (used by the installed iPhone app)
   - Copy the Client ID (ends `.apps.googleusercontent.com`; it is public, not a secret).
4. **Variables** (Pages → Settings → Variables and secrets, Production, plain text):
   - `GOOGLE_CLIENT_ID` = the client ID
   - `ADMIN_EMAILS` = comma-separated Google emails allowed to grant membership, e.g. `nomeaningfhun@gmail.com,planplearn.co@gmail.com`
5. Redeploy (push any commit, or Deployments → Retry). `/api/config` should answer `{"enabled":true,...}`.

## Giving membership
Sign in with an admin email → Settings → "Member account" → Admin: grant membership → type the member's Google email → 30 days / 90 days / 1 yr / Lifetime. They get it as soon as they sign in with that email (or press Refresh). "Remove" takes it away.

## Notes
- The session token is random, only its SHA-256 is stored; sessions last 60 days.
- Offline: the app keeps membership benefits for 7 days after the last successful check.
- Local features (MIDI import limit, kalimba looks) are enforced in the browser, so a determined user can patch the JS; the server decides who is a member, not what the device does with it.
- The old device member code still works next to this; remove `MEMBER_CODE_SHA256` before public launch if wanted.
- Stripe writes the same `members` rows (`source = 'stripe'`); see below. An admin grant that runs longer is never shortened by Stripe.

## Stripe (฿49 per month / ฿539 per year, card, auto-renew)
Code: `functions/_lib/stripe.js`, `functions/api/billing/{checkout,portal}.js`, `functions/api/stripe/webhook.js`, UI in `js/account.js`. Amounts live in `PLANS` in `stripe.js` (satang: 4900 / 53900); no Products/Prices are needed in Stripe.
Flow: signed-in person taps Monthly/Yearly → `/api/billing/checkout` makes a Stripe Checkout page → they pay → Stripe calls `/api/stripe/webhook` (signature-checked) → the server fetches the subscription from Stripe and writes the `members` row (until = period end + 1 day; past_due gets 3 days) → the app polls `/api/me` after returning.
Cancelling happens in Stripe's billing portal (`/api/billing/portal`); access continues to the end of the paid period.

### Setup (Fun, in Test mode first)
1. stripe.com → create the account (business: PlanPlearn, Thailand). Stay in **Test mode** (switch at the top of the dashboard).
2. Developers → API keys → copy the **Secret key** (`sk_test_…`).
3. Developers → Webhooks → Add endpoint: `https://playkalimba.pages.dev/api/stripe/webhook`, events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Copy its **Signing secret** (`whsec_…`).
4. Settings → Billing → Customer portal → activate; allow "cancel subscription" (at end of billing period) and "update payment method".
5. Cloudflare Pages → `playkalimba` → Settings → Variables and secrets (Production): add as **Secret** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Redeploy (empty commit). `/api/config` should now say `"billing":true`.
6. Test: sign in → Settings → Member account → Monthly → card `4242 4242 4242 4242`, any future date, any CVC → you return as a member. Stripe dashboard → Webhooks shows the deliveries (200). Try "Manage billing / cancel".
7. Go live: Stripe account activated (business + bank details) → switch to Live mode, repeat steps 2–3 with the live keys/secret and replace the two variables, redeploy. Do one real ฿49 payment yourself and refund it from the Stripe dashboard.

### Things to know
- Card only: Stripe subscriptions cannot be paid with PromptPay.
- Before real money: tax (VAT) treatment and the invoice/receipt wording are for PlanPlearn's accountant; the terms (terms.html section 3) already state price, auto-renewal, cancelling and refunds.
- Local try-out with a fake Stripe: `node --no-warnings tests/dev-server.mjs` (Checkout → "Pay" link plays the webhook). Tests: `node --no-warnings tests/api.test.mjs`.
