# Deploying RatLevel

This covers everything needed to get the gym portal and API live at **ratlevel.com**, plus
what changes for the mobile app. Two Vercel projects, one Postgres database, one shared
Google OAuth client.

```
ratlevel.com          → apps/gym-portal   (Vercel project #1, static Vite build)
api.ratlevel.com       → apps/api          (Vercel project #2, serverless Fastify)
                                            ↓
                                      Postgres (Neon / Vercel Postgres)

apps/mobile  → not hosted on Vercel (it's not a website) — points at api.ratlevel.com instead
```

Everything code-level is already done (Postgres schema, Vercel serverless entry point,
CORS, env var plumbing). What's left is account-bound work only you can do: creating the
Postgres database, the two Vercel projects, DNS records, and the Google OAuth client. This
doc is the exact click-by-click path through that.

## 1. Create the Postgres database

Pick one (both have generous free tiers and work identically here since Prisma just needs
a standard `postgresql://` connection string):

- **Vercel Postgres** — in your Vercel dashboard: Storage → Create Database → Postgres.
  Convenient because Vercel can inject the connection string into your API project's env
  vars automatically when you link them.
- **[Neon](https://neon.tech)** — sign up, create a project, copy the connection string
  from the dashboard. Use the **pooled** connection string (labeled "Pooled connection" —
  important for serverless: without pooling, many concurrent function invocations can
  exhaust Postgres's connection limit).

Either way you end up with something like:
```
postgresql://user:password@host/ratlevel?sslmode=require
```

### Run the initial migration and seed

From your machine, with that connection string in `apps/api/.env`:

```bash
cd apps/api
npm run prisma:migrate    # creates all tables — will prompt for a migration name, e.g. "init"
npm run prisma:seed       # seeds the demo gym, 49 members, 5 staff accounts
```

If you want a separate database for local dev vs. production (recommended), create two
databases on the same provider and run this against each with its own `.env`/connection
string.

## 2. Google OAuth console

Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services →
Credentials**. If you haven't already, configure the OAuth consent screen (External, add
your email as a test user while unverified).

### Web application client (covers the gym portal + mobile web/browser testing)

Create Credentials → OAuth client ID → **Web application**.

- **Authorized JavaScript origins:**
  - `http://localhost:5173` (portal, local dev)
  - `https://ratlevel.com` (portal, production)
  - `http://localhost:8081` (mobile app via `expo start --web`, optional)
- **Authorized redirect URIs:**
  - `http://localhost:8081` (only needed if you test the mobile app's web target)
  - If Google shows a "redirect_uri_mismatch" error during testing, its error page displays
    the *exact* URI it received — copy that in verbatim; it's more reliable than guessing.

Copy the client ID into:
- `apps/api/.env` (and the API's Vercel project env vars) → `GOOGLE_WEB_CLIENT_ID`
- `apps/gym-portal/.env` (and its Vercel project env vars) → `VITE_GOOGLE_WEB_CLIENT_ID`
- `apps/mobile/.env` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

### Android client (for a real dev-client/production mobile build)

> Native Google Sign-In does not work inside plain Expo Go — Expo Go's own package
> identity doesn't match your app's, so Google rejects the redirect. This client only
> matters once you build a custom dev client (`eas build --profile development` or
> `npx expo run:android`) or a production build. Until then, the mobile app's dev-bypass
> login covers on-device testing.

Create Credentials → OAuth client ID → **Android**.
- Package name: `com.ratlevel.app`
- SHA-1 certificate fingerprint:
  - Local dev build: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`, copy the `SHA1:` value
  - EAS-managed build: `eas credentials` → Android → shows the SHA-1 of the keystore EAS manages
- Copy the client ID → `apps/api/.env` `GOOGLE_ANDROID_CLIENT_ID` and
  `apps/mobile/.env` `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

### iOS client (same idea, optional until you ship on iOS)

Create Credentials → OAuth client ID → **iOS**.
- Bundle ID: `com.ratlevel.app`
- Copy the client ID → `apps/api/.env` `GOOGLE_IOS_CLIENT_ID` and
  `apps/mobile/.env` `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

## 3. Deploy the API to Vercel

New Vercel project → import the RatLevel git repo.

- **Root Directory**: `apps/api`
- **Framework Preset**: Other
- Vercel will run `npm run vercel-build` automatically if it's present (it is — it runs
  `prisma generate` so the client matches Vercel's runtime)
- **Environment variables** (Project Settings → Environment Variables), same names as
  `apps/api/.env.example`:
  - `DATABASE_URL` — your Postgres connection string
  - `JWT_SECRET` — a real random value, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - `CORS_ORIGIN` — `https://ratlevel.com`
  - `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` — from step 2
  - `NODE_ENV` — Vercel sets this to `production` automatically; this is what disables the
    dev-only password/bypass login routes, so nothing extra to do here
- Deploy. Once live, assign the domain **api.ratlevel.com** to this project (Project
  Settings → Domains → Add).

## 4. Deploy the gym portal to Vercel

Another new Vercel project → same git repo.

- **Root Directory**: `apps/gym-portal`
- **Framework Preset**: Vite (auto-detected)
- **Environment variables**:
  - `VITE_API_BASE_URL` — `https://api.ratlevel.com`
  - `VITE_GOOGLE_WEB_CLIENT_ID` — from step 2
- Deploy. Assign the domain **ratlevel.com** to this project.

## 5. DNS

At your domain registrar (or delegate nameservers to Vercel entirely — simplest option,
Vercel's domain settings offer this):

| Record | Type | Value |
| --- | --- | --- |
| `ratlevel.com` (apex) | A | Vercel's anycast IP (shown in the portal project's Domains tab) |
| `www.ratlevel.com` | CNAME | `cname.vercel-dns.com` |
| `api.ratlevel.com` | CNAME | `cname.vercel-dns.com` |

Vercel's Domains tab shows the exact records to add once you type in the domain — it
verifies automatically and provisions HTTPS certificates for you.

## 6. Point the mobile app at production

In `apps/mobile/.env` (or your EAS build's environment variables — this needs to be baked
in at build time since `EXPO_PUBLIC_*` vars are inlined into the JS bundle):

```
EXPO_PUBLIC_API_BASE_URL=https://api.ratlevel.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
```

For real on-device Google Sign-In you also need a custom dev client or a production build
(see the Android client note above) — Expo Go alone won't exercise the real flow.

## 7. Verify

- `curl https://api.ratlevel.com/health` → `{"ok":true,"service":"ratlevel-api"}`
- `curl https://api.ratlevel.com/auth/google/status` → `{"configured":true}`
- `curl -X POST https://api.ratlevel.com/auth/member/dev-login -d '{"email":"tassa@ratlevel.dev"}'`
  → should now **fail** (404/refused) — confirms the dev bypass is correctly disabled in
  production
- Open `https://ratlevel.com`, sign in with a real Google account belonging to one of the
  seeded staff emails (`owner@irondistrict.gym` etc. — you'll need to update the seed data
  or add a staff row with your real email first, since Google will authenticate *you*, not
  the fictional seeded person)
- Confirm the dashboard loads live data from the production database

## Notes on scaling past this setup

- **Prisma connection pooling**: if you see `too many connections` errors under load, make
  sure `DATABASE_URL` is the *pooled* connection string (Neon/Vercel Postgres both offer
  one specifically for serverless).
- **Staff provisioning**: there's no "invite staff" UI yet — new staff accounts are added
  directly in the database (or via a future admin feature). This is intentional per the
  Google Sign-In design (see README) — staff access is never self-service.
- **Multi-gym**: the schema already scopes most things by `gymId`, but the portal's
  `PortalGymRepository.get()` currently always returns the first seeded gym. Supporting
  multiple gym portals on one deployment needs that hardcoded lookup replaced with
  "the gym this staff member belongs to."
