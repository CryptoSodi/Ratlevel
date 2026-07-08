# RatLevel Gym Portal

Status: **implemented (mock-data v1).** A separate web app for gym owners, staff, and
admins. Nothing here ships to members.

```bash
npm run portal        # from the repo root → http://localhost:5173
```

Sign in with `owner@irondistrict.gym` (any password; also try `sam@`, `kim@`, `andre@` for
other roles).

## What it is

A serious SaaS dashboard for running a RatLevel-powered gym: members, memberships,
attendance, programs, challenges, announcements, and analytics. It shares the RatLevel
brand (dark, premium — see `/brand.md`) and the RatLevel backend contracts
(`@ratlevel/domain`), but it is **not** the mobile app: sidebar navigation, data tables,
KPI cards, dense-but-clean layouts. No bottom tabs, no game hero cards.

## Stack (as built)

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Vite + React + strict TS | An admin SPA needs no SSR; Vite consumes the workspace TS-source packages with zero config (chosen over the originally planned Next.js for lower monorepo risk) |
| Styling | Hand-rolled CSS driven by `@ratlevel/ui` tokens injected as CSS variables at boot | Tokens stay the single source of brand truth, no framework lock-in |
| Routing | react-router-dom v7 | Standard SPA routing with an auth guard |
| Data | `GymPortalClient` interfaces in `@ratlevel/domain`, implemented by `createMockPortalClient()` in `@ratlevel/mock-data` | Same swap-in-a-real-API path as mobile |
| Charts | Custom SVG line/bar charts | No chart-lib dependency for mock-scale analytics |
| Auth | Mock staff login (localStorage session) with Owner / Manager / Front desk / Coach roles | Real RBAC later |

## Screens (v1, all implemented)

1. **Login** — mock staff sign-in, role-aware session persisted in localStorage.
2. **Dashboard** — KPI cards (active members, check-ins today, at-risk, expired, est. MRR),
   14-day attendance line, today-by-hour bars, live gate feed, at-risk member list.
3. **Members** — search + status/plan filters, table, detail drawer (plan/status editing,
   program assignment, manual check-in, delete with confirm), add-member modal.
4. **Memberships** — Core/Plus/Max plan cards with pricing placeholders, renewing-soon and
   expired tables.
5. **Check-ins** — manual check-in with member search, hourly chart, full QR/manual gate feed.
6. **Classes** — weekly calendar grid with capacity/fill-rate bars and full-class flags.
7. **Programs** — program cards built from shared workout templates, assigned-member
   avatars, template library table.
8. **Challenges** — seeded gym challenges (shared with the member app) + season leaderboard.
9. **Announcements** — compose drafts by audience (all/active/at-risk), send-now flow.
10. **Analytics** — 30-day attendance, retention trend, revenue placeholder bars, visit KPIs.
11. **Staff** — role summary cards + accounts table (owner/manager/frontdesk/coach).

## Domain model (added in `@ratlevel/domain/src/portal.ts`)

`StaffAccount`/`StaffRole`, `MemberRecord`, `GymClass`, `Program`, `Announcement`,
`CheckInRecord`, analytics point types, and the `GymPortalClient` repository interfaces.
Member-facing entities (Challenge, LeaderboardEntry, WorkoutTemplate) are reused as-is.

## Ground rules

- Never import mobile app code; share only `packages/*`.
- Admin UX never leaks into the member app, and vice versa.
- Mock data until the backend exists; every data access goes through repository interfaces.

## Next steps

- Real auth + RBAC enforcement per role (today roles are display-only).
- Class/program/challenge CRUD once the backend lands.
- Wire announcements to real push (member app) and email.
- Replace revenue placeholders with billing integration.
