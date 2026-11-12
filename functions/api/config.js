import { json } from '../_lib/auth.js';
// Public settings the app needs before login. enabled = false until the Google client id and the D1 database are set up.
export const onRequestGet = ({ env }) => json({ enabled: !!(env.GOOGLE_CLIENT_ID && env.DB), googleClientId: env.GOOGLE_CLIENT_ID || '' });
