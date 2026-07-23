# Move Quest

An internal "get off your chair" app. Each day you get **three photo
challenges** that get you up and moving. Pick one, take a photo, and it posts to
a shared team **Feed**. Points go to the **leaderboard** (weekly reset every
Monday).

Auth and data live in **Supabase** (email/password, Postgres, private Storage).
Photos are **demo auto-accepted** (`Looks good!`) — no AI vision in this build.

## Core loop

1. Sign in with your team email (domain allowlist in Supabase).
2. Claim a display name on first login.
3. Pick one of three random challenges (completed ones excluded). Reshuffle anytime.
4. Take a JPEG photo and submit — accepted immediately, points awarded.
5. Your move appears on the team feed; the leaderboard updates via Realtime.

## Stack

- `web/` — Vite + React + TypeScript (mobile web UI)
- Supabase Auth — email/password, domain-gated signup
- Supabase Postgres — profiles, challenges, attempts, scores, RLS + RPCs
- Supabase Storage — private `challenge-photos` bucket
- Supabase Edge Function — `verify-photo` (auto-accept upload + finalize)
- Supabase Realtime — live leaderboard / feed refresh

## Prerequisites

- Node.js 20+
- A Supabase project with migrations applied (`supabase db push`)
- Edge Function `verify-photo` deployed with `SUPABASE_SERVICE_ROLE_KEY` secret

## Setup

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

npm install --prefix web
```

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `VITE_BASE_PATH` | GitHub Pages base path (default `/move-quest/`) |

Edge secrets (via `supabase secrets set`, not in `.env`):

- `SUPABASE_SERVICE_ROLE_KEY` — required for `verify-photo`
- `CLEANUP_CRON_SECRET` — optional, for `cleanup-orphans` cron

## Run locally

```bash
npm run dev
```

Open the printed Vite URL (usually `http://127.0.0.1:5173`).

### Deploy Edge Function

```bash
supabase functions deploy verify-photo
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### Public access with Cloudflared

```bash
cloudflared tunnel --url http://127.0.0.1:5173 \
  --http-host-header localhost \
  --no-autoupdate
```

Add the tunnel URL to Supabase Auth redirect URLs if testing email confirmation.

## Deploy to GitHub Pages

Production URL: **https://sumith-sb.github.io/move-quest/**

Deploy runs **only** when a pull request from `main` is **merged** into `live`. Direct pushes to `live`, PRs from other branches, and closed-but-not-merged PRs do not deploy.

```text
main  --PR merge-->  live  --GitHub Actions-->  GitHub Pages
```

### One-time setup (repo admin)

1. **GitHub Pages:** Settings → Pages → Source = **GitHub Actions**
2. **Action secrets** (Settings → Secrets and variables → Actions):
   - `VITE_SUPABASE_URL` — e.g. `https://neewpbkrbpdiznkbbzhl.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — publishable key from Supabase dashboard
3. **Create `live`:** push a `live` branch once (e.g. from current `main` when ready to ship)
4. **Protect `live` (recommended):** require PRs; block direct pushes so production only moves via `main` → `live` merge
5. **Supabase Auth redirects:** Dashboard → Auth → URL Configuration
   - Site URL: `https://sumith-sb.github.io/move-quest/`
   - Redirect URLs: that origin plus localhost URLs for local dev

### Ship a release

1. Merge feature work into `main` as usual
2. Open PR: **base `live`**, **compare `main`**
3. Merge the PR → workflow [Deploy Move Quest to GitHub Pages](.github/workflows/deploy-pages.yml) runs automatically

Supabase migrations and Edge Functions are **not** deployed by this workflow — use the manual [Deploy Supabase](.github/workflows/deploy-supabase.yml) workflow when schema or functions change.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run lint` | Lint web |
| `npm run preview` | Preview production build |

## POC limits

- No reactions, comments, push notifications, or cooldown pacing in this Supabase build.
- JPEG only for photo submit (Edge Function guard).
- Fresh Supabase project — no migration from the old JSON store.
