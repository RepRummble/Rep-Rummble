# Setup guide

Full configuration reference for all three sub-projects.

---

## Web app (`web/`)

### Environment variables

Copy `web/.env.example` to `web/.env.local` and fill in:

```env
# Supabase (required for auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Firebase (client-side config — from Firebase Console → Project Settings → Web app)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Backend URL (used for API calls from the browser)
VITE_API_URL=http://localhost:4000

# Site URL (used for OAuth redirects)
VITE_SITE_URL=http://localhost:5173
```

### Scripts

```bash
npm run dev        # start dev server
npm run build      # production build → web/dist
npm run typecheck  # TypeScript check only
npm run lint       # ESLint
npm run preview    # preview the production build locally
```

---

## Backend server (`server/`)

### Environment variables

Copy `server/.env.example` to `server/.env` (the file is in `server/` — do not put it at the root):

```env
PORT=4000
NODE_ENV=development

# Supabase (service-role key — server only, never expose to the browser)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Oracle DB (optional — only needed for analytics features)
ORACLE_USER=your_user
ORACLE_PASSWORD=your_password
ORACLE_CONNECTION_STRING=your_connection_string

# Google Gemini AI
GEMINI_API_KEY=your_gemini_key

# JWT
JWT_SECRET=a_long_random_string
JWT_EXPIRES_IN=7d
```

> **Security:** Never commit `.env` files. They are excluded by `.gitignore`.
> Firebase Admin SDK JSON keys must also never be committed — store them as env vars or secrets in your deployment platform.

### Scripts

```bash
npm run dev    # start with ts-node / nodemon
npm run build  # compile TypeScript → server/dist
npm start      # run compiled output
```

---

## Mobile app (`mobile/`)

### Environment variables

React Native / Expo reads env vars from `app.json` `extra` or an `.env` file via a Babel plugin. Update `mobile/src/config/api.ts` with your server URL.

### Scripts

```bash
npx expo start          # interactive menu (QR code)
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
npx expo start --web    # web preview
```

---

## Email verification (Supabase dashboard)

New email sign-ups must click a link before they can sign in. The code is ready; turn it on in Supabase:

1. **Authentication → Providers → Email → "Confirm email": ON.** (With it off, sign-ups work immediately, as before.)
2. **Authentication → URL Configuration:** set *Site URL* to `https://www.reprummble.com` and add `https://www.reprummble.com/auth/callback`, `https://reprummble.com/auth/callback`, and `http://localhost:5173/auth/callback` to *Redirect URLs*. Remove any `*` wildcards.
3. **Project Settings → Authentication → SMTP Settings:** add a custom SMTP provider. Supabase's built-in mailer is limited to a few emails per hour and only sends to your team, so real users will not get their link without this.
4. Optional: edit the *Confirm signup* email template under **Authentication → Email Templates**.

Accounts created before this was switched on were marked as verified without a check and stay that way.
Staff access, member invites, and admin review only work for verified emails.

## Reviewing business applications

1. Set `ADMIN_EMAILS` (comma-separated, no spaces needed) on the server, e.g. `ADMIN_EMAILS=you@example.com`. Those accounts must have a **verified** email.
2. Sign in with one of those accounts. Your dashboard sidebar shows **Review applications** with the number waiting (`/admin/applications`).
3. Each application shows the business, type, city, size, message, and the account email. **Approve** opens their business dashboard, **Reject** asks for a reason, and approved businesses have a **Revoke access** button that turns access off immediately (including their team).
4. Reviewers are emailed when an application arrives, and the applicant is emailed when you decide. This uses `GMAIL_USER` / `GMAIL_APP_PASSWORD`; without them everything works but no emails are sent.

## Turning on payments (Stripe)

Plans, renewal, auto-renew and the saved payment method are built and tested. Real charging switches on once Stripe is connected; until then the Billing page shows the plan and says payments are coming soon.

1. In Stripe (start in **test mode**), create two recurring monthly **Prices**: Pro at $9.99 and Premium at $14.99. Copy each `price_...` id.
2. **Developers → API keys:** copy the publishable key (`pk_...`) and secret key (`sk_...`).
3. **Developers → Webhooks → Add endpoint:** URL `https://<your-api-host>/api/billing/webhook`, with these events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `payment_method.attached`, `payment_method.detached`, `setup_intent.succeeded`. Copy the signing secret (`whsec_...`).
4. On the server (Render) set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`. Billing turns on as soon as all of them except the webhook secret are present, so set the webhook secret first.
5. **Settings → Billing → Customer emails:** turn on payment receipts and upcoming-renewal reminders.
6. Try it with the test card `4242 4242 4242 4242` before switching to live keys and live prices.

How it behaves:
- **Upgrades** take effect immediately; the person pays only the difference for the rest of the period.
- **Lower plans** (Premium to Pro, or to Free) wait until the current period ends, so people keep what they paid for.
- **Auto-renew off** means the plan ends when the period does. Choosing the current plan again undoes a pending change.
- **Pro trial:** 14 days, once per account, no card needed. With no card by the end it simply ends instead of failing to charge.
- Referral discounts are applied once, to the first payment after they are earned.
- Card numbers are typed into Stripe's own fields and never reach our server; we keep only the brand and last four digits.
- Deleting an account cancels the subscription and removes the Stripe customer first; if Stripe cannot be reached, nothing is deleted.

## "Sign in with Reprummble" (Supabase OAuth server)

Other apps can sign people in with a Reprummble account through Supabase's OAuth 2.1 server. The website provides the approval screen at **`/oauth/consent`**.

1. **Supabase → Authentication → OAuth Server:** turn it on and set the **Authorization Path** to `/oauth/consent`. Make sure the **Site URL** is `https://www.reprummble.com`; the preview link shown there should read `https://www.reprummble.com/oauth/consent`.
2. Register each app that may connect under **OAuth Apps** (name, logo, redirect URIs). Prefer registering apps yourself; leave dynamic client registration off unless you want anyone to be able to register one.
3. Share the endpoints Supabase shows (authorization, token, JWKS, OIDC discovery) with the app's developer. They are on your Supabase project domain, not on reprummble.com.

Good to know:
- Users can see and disconnect these apps under **Dashboard → Profile → Security → Connected apps**.
- **Scopes (`openid`, `email`, `profile`) only decide what the app can read about the person. They do not limit what an API accepts.** For that reason the Reprummble API rejects any token issued to a third-party app (a token with a `client_id` claim). If you ever want to let a partner app call the API, add an explicit allow-list for that client first.
- The page only returns people to the address Supabase gives it, and never to `javascript:`, `data:`, or similar.

## Troubleshooting

### Web app shows blank page after login
Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly in `web/.env.local`.

### OAuth redirect fails
Set `VITE_SITE_URL` and add `http://localhost:5173/auth/callback` to your Supabase project's allowed redirect URLs.

### Backend crashes on startup
Check the `server/.env` file has all required variables. Missing `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` will cause immediate failure.

### Expo Expo Go can't connect
Make sure your phone and development machine are on the same Wi-Fi network. Use `npx expo start --tunnel` if they can't reach each other directly.
