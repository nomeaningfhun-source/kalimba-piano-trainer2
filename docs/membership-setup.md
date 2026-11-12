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
- Stripe (next step) will write the same `members` rows (`source = 'stripe'`).
