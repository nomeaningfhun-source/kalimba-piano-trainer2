import { json } from '../_lib/auth.js';
import { billingOpen } from '../_lib/stripe.js';
// Public settings the app needs before login. enabled = false until the Google client id and the D1 database are set up.
// billing = new subscriptions are open; beta = the app is in its free beta (no sign-ups yet).
export const onRequestGet = ({ env }) => json({ enabled: !!(env.GOOGLE_CLIENT_ID && env.DB), googleClientId: env.GOOGLE_CLIENT_ID || '', billing: billingOpen(env), beta: !billingOpen(env) });
