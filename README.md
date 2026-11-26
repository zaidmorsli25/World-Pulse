# WorldPulse

An educational geopolitical game. Explore an interactive world map, open short mission briefings on current events from trusted newsrooms, answer quick quizzes, earn coins and XP, climb ten ranks and build your own headquarters.

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, D3 (d3-geo, d3-zoom), Supabase (Postgres and Auth), Claude for briefing generation, Vitest.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

No configuration is needed to play locally. Accounts are stored in `data/local-db.json` (passwords hashed with scrypt) and the map shows **clearly labelled fictional demo scenarios**.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server (needs `AUTH_SECRET`) |
| `npm test` | Unit tests (engine, rewards and anti-farming, importance, clustering, demo quiz validation, security) |
| `npm run typecheck` / `npm run lint` | Type and lint checks |
| `npm run ingest` | Run one news ingestion pass from the command line |
| `npm run geo` | Rebuild map and country data from Natural Earth / world-countries |
| `npm run build:demo` | Static, server-less demo (in-browser engine, demo content only) into `artifact-build/.next` |

## What needs credentials

| Feature | Needs | Without it |
|---|---|---|
| Production sessions | `AUTH_SECRET` | Production server refuses to start sessions |
| Real accounts, email confirmation and password reset emails | Supabase project (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and the SQL migration | Local JSON file; reset links are shown on screen in development only |
| Live news briefings and quizzes | `ANTHROPIC_API_KEY` | Demo scenarios |
| Scheduled refresh | `CRON_SECRET` (and a scheduler; a GitHub Actions workflow runs it every 3 hours, plus a daily Vercel cron) | Run `npm run ingest` manually |
| Reuters | A licensed feed URL in `REUTERS_FEED_URL` | Reuters is skipped |
| Commercial use of publisher feeds | Check each publisher's feed terms; some require a licence | |

Every variable is documented in [`.env.example`](.env.example).

## Deploying (Vercel + Supabase)

1. Create a Supabase project. In the SQL editor, run `supabase/migrations/0001_worldpulse.sql`. Enable Email auth and set the Site URL to your domain.
2. Import the repository into Vercel. Set `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, the three Supabase variables, `ANTHROPIC_API_KEY` and `CRON_SECRET`.
3. Deploy. On Vercel's free plan, cron jobs may run only once a day, so `vercel.json` runs `/api/cron/ingest` daily and `.github/workflows/news-refresh.yml` calls it every 3 hours (set the `SITE_URL` and `CRON_SECRET` repository secrets). Trigger the first run manually:
   `curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/ingest`
4. Check `/api/health`, which reports the database, news mode and whether the summarizer is configured.

Any Node host works. Use Supabase in production, because the local JSON store needs a persistent disk and a single instance.

## Architecture

```
src/
  app/                 Next.js entry and API routes (auth, quiz, shop, explore, missions, news, cron, health)
  components/          UI: map, markers, briefing and quiz, HQ, sections, landing
  data/                Country profiles, political figures, demo scenarios, generated map data
  lib/
    game/              Pure game engine: rewards, levels and ranks, shop, streaks, missions, achievements
    news/              Ingestion pipeline: RSS, classify, cluster, importance, summarize, validate
    server/            Auth, sessions, CSRF and rate limiting, storage (local file or Supabase)
    client/            API client, in-browser backend for the static demo, sound, settings
supabase/migrations/   Database schema with row-level security
docs/                  IMPORTANCE.md (ranking model), CONTENT.md (sources, accuracy, data)
```

### Security and fair play

- Passwords: scrypt locally, Supabase Auth in production. Sessions are signed httpOnly, SameSite cookies.
- Every state-changing request is checked for same-origin, rate limited and validated with zod.
- All coins, XP and purchases are calculated on the server by the game engine. The client never sends amounts.
- Quiz answer keys never reach the browser. The first answer to each question is locked in before its explanation is shown, an unfinished first attempt resumes rather than restarts, and only the first completion of a quiz pays rewards.
- Supabase tables use row-level security. Player saves go through a transactional function with optimistic locking.
- News text is untrusted input and cannot change application or AI instructions. See `docs/CONTENT.md`.

### Game rules (configurable in `src/lib/config.ts`)

- 20 coins and 10 XP per correct answer, plus 25 coins and 25 XP for a perfect score, first completion only.
- 10 ranks from Recruit to Global Strategist. Promotions unlock shop items and grant free rank rewards.
- Daily streak with a forgiving shield for one missed day. Three daily missions, 15 achievements.
- Shop: about 70 cosmetic items in five rarities. No loot boxes and no real-money purchases.

## Data and attribution

Map: Natural Earth (public domain). Country facts: world-countries (ODbL). Political figures were verified as of the date in `src/data/figures.ts` and must be reviewed periodically. Briefings summarize and link to the original reporting. See `docs/CONTENT.md`.
