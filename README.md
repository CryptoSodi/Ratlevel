# RatLevel

**RatLevel turned fitness into a game.** A premium dark gym-membership experience fused with
RPG progression: XP, levels, quests, ranks, streaks, and a character that grows with every rep.

Two member/staff-facing products sharing one backend and one domain model:

| Product | Path | Status |
| --- | --- | --- |
| **Mobile app** (members) | `apps/mobile` | Active — Expo + React Native, real backend |
| **Gym portal** (owners/staff) | `apps/gym-portal` | Active — Vite + React SPA, real backend |
| **API** (shared backend) | `apps/api` | Active — Fastify + Prisma + Postgres |

## Monorepo layout

```
apps/
  mobile/        Expo + React Native member app (Expo SDK 54, strict TS)
  gym-portal/    Web portal for gym staff (Vite + React, react-router)
  api/           Shared backend — Fastify + Prisma + Postgres, deployable to Vercel
packages/
  domain/        Shared entities + repository interfaces both products (and the API) implement
  gamification/  Pure engine: XP, levels, ranks, streaks, quests, achievements,
                 challenges, seasons, player stats, reward settlement
  ui/            Design tokens (brand.md as code) shared by both products
  mock-data/     In-memory seed data + reference implementation of the repositories
                 (used by the API's seed script and available as a fallback mock client)
```

npm workspaces; `packages/*` are consumed as TypeScript source (Metro/Vite/tsx transpile
them directly, no build step). Both apps talk to the real API through `RatLevelClient` /
`GymPortalClient` (`packages/domain/src/repositories.ts` and `portal.ts`) — feature code
never imports `@ratlevel/mock-data` directly, so the mock and the real backend are
interchangeable behind one interface.

## Getting started

```bash
npm install                          # once, at the repo root
cp apps/api/.env.example apps/api/.env               # then fill in DATABASE_URL etc — see below
cp apps/mobile/.env.example apps/mobile/.env
cp apps/gym-portal/.env.example apps/gym-portal/.env

npm run --workspace @ratlevel/api prisma:migrate      # creates tables in your Postgres DB
npm run --workspace @ratlevel/api prisma:seed         # seeds demo gym, members, staff

npm run --workspace @ratlevel/api dev   # API at http://localhost:4000
npm run mobile                          # Expo dev server for apps/mobile (press w / a, or scan with Expo Go)
npm run portal                          # gym portal at http://localhost:5173
npm run typecheck                       # strict TS across every workspace
```

You need a real Postgres database even for local dev — SQLite was the original dev
datastore but was dropped when moving toward Vercel deployment (serverless functions have
no persistent disk). The free tier of [Neon](https://neon.tech) or Vercel Postgres both work
fine; paste the connection string into `apps/api/.env`.

### Demo logins

- **Member app**: real auth is Google Sign-In (see [Google OAuth setup](#google-oauth-setup)
  below). Without a configured Google client, a dev-only bypass works:
  `POST /auth/member/dev-login { "email": "tassa@ratlevel.dev" }` — the onboarding screen
  also has a "DEV ONLY" button that does this for you when running locally.
- **Gym portal**: same idea — Google Sign-In is the real path; a "Show dev sign-in" toggle
  on the login screen (dev builds only) accepts `owner@irondistrict.gym` /
  `ratlevel-demo` (or `sam@`, `kim@`, `andre@irondistrict.gym`).

Both dev-only auth paths are refused by the API once `NODE_ENV=production` — see
`apps/api/src/routes/auth.ts`.

## Google OAuth setup

Both products use real Google Sign-In — see `apps/api/.env.example`, `apps/mobile/.env.example`,
and `apps/gym-portal/.env.example` for exactly which env vars each needs, and
[DEPLOYMENT.md](DEPLOYMENT.md#google-oauth-console) for the full Google Cloud Console
walkthrough (Web/Android/iOS client setup, authorized origins, redirect URIs).

One important asymmetry: **members** can self-register via Google (new Google account →
pick a gym and class → done). **Staff** cannot — Google only confirms identity against a
`StaffAccount` row that already exists (created via the seed script or, later, an "invite
staff" admin feature). This stops anyone with a Google account from self-serving their way
into gym-admin access.

## Architecture rules

1. **Products never import each other.** Mobile and portal share only `packages/*` and the
   same backend.
2. **Gamification is pure.** `@ratlevel/gamification` has no React, no I/O, no direct DB
   access — the mobile app, the portal, and the API's route handlers all agree on XP math.
   The single entry point for "a workout happened" is `settleWorkout()`.
3. **Repositories are the backend seam.** Feature code depends on interfaces from
   `@ratlevel/domain`; `apps/api` and `@ratlevel/mock-data` are the only two places that
   implement them.
4. **Brand lives in `brand.md`** and is encoded once in `@ratlevel/ui` tokens.
5. **The product rule:** every feature must make RatLevel feel more like a game while still
   feeling like a premium gym product.

## Mobile app map

- `src/App.tsx` — shell: providers, header, bottom tabs, modal host
- `src/state/AppStore.tsx` — session state + actions, backed by the real API
- `src/services/httpClient.ts` — `RatLevelClient` implementation over HTTP
- `src/features/` — onboarding (Google Sign-In), home, membership (card + real QR
  check-in + camera scanning), workouts (train, session logger, rewards), quests, rank,
  profile (stats, body tracking, settings)
- `src/components/` — Button, Card, Chip, ProgressBar/Ring, LineChart, MemberQrCode, states…

## Gym portal map

- `src/App.tsx` — router shell: sidebar nav, auth guard
- `src/state/PortalStore.tsx` — staff session state, backed by the real API
- `src/services/httpPortalClient.ts` — `GymPortalClient` implementation over HTTP
- `src/pages/` — Dashboard, Members, Memberships, Check-ins (live floor, entry QR poster,
  webcam member-QR scanner, manual check-in), Classes, Programs, Challenges,
  Announcements, Analytics, Staff

## API map

- `src/app.ts` — `buildApp()`: the actual Fastify app (routes, CORS, JWT) with no listener
  attached, so it can run two ways:
  - `src/server.ts` — long-running server for local dev (`npm run dev`)
  - `api/index.ts` — Vercel serverless function entry point (production)
- `src/routes/auth.ts` — Google Sign-In verification for members and staff, plus the
  dev-only bypass logins
- `src/routes/member.ts`, `src/routes/admin.ts` — the two product APIs
- `prisma/schema.prisma` — Postgres schema mirroring `packages/domain`
- `prisma/seed.ts` — seeds one demo gym, 49 members, 5 staff accounts, and enough workout
  history/check-ins to make the portal's analytics and live floor feel real

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full guide: Postgres setup, the two Vercel
projects (`ratlevel.com` for the portal, `api.ratlevel.com` for the API), DNS, environment
variables, and the Google Cloud Console changes needed for production.
