# Move Quest

An internal "get off your chair" app. Each day you get **three photo
challenges — one Easy, one Medium, one Hard** — that move you away from your
desk (the room you mark as your desk is excluded). Pick one, take a live photo,
and it posts to a shared team **Feed** where colleagues react and comment. After
each move a **cooldown** paces you so it's roughly once an hour, not every
minute — no reshuffling, no spamming.

Persistence is a single JSON file plus disk uploads — no database. (SQLite is
the intended upgrade once it goes multi-instance; deferred here to avoid native
modules on bleeding-edge Node.)

## Core loop

1. Pick one of three (Easy / Medium / Hard) — the difficulty is an effort
   ladder: quick / another room / step outside.
2. Take a live photo of the prompt.
3. It's accepted and **posted to the feed**; points are awarded.
4. A cooldown (`COOLDOWN_MINUTES`, default 60) locks new moves until it passes.
5. The team reacts (👏 🔥 🌿 💧 😌) and comments on the feed; the leaderboard
   updates live.

> Photos are verified socially by the feed rather than by a model — the demo
> auto-accepts. Google sign-in (domain-locked) is the planned next phase; the
> app currently uses an anonymous `localStorage` identity.

## Stack

- `web/` — Vite + React + TypeScript (mobile web UI)
- `server/` — Express + Multer + TypeScript
- Storage — `server/data/store.json` and `server/uploads/`
- Verification — demo auto-accept (`Looks good!`); Ollama integration retained but disabled
- Live board — Server-Sent Events (`/api/leaderboard/stream`)

## Build workflow

1. Plan the product flow and implementation with GPT-5.6.
2. Execute the plan with Cursor Grok 4.5.
3. Use Cursor to build, test, and iterate on the application.
4. Run the app locally and expose it publicly with Cloudflared.

## Prerequisites

- Node.js 20+
- Cloudflared (only required for public access)

## Setup

```bash
cp .env.example .env
npm install --prefix server
npm install --prefix web
```

Optional env vars (defaults match `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | API port |

## Run (two terminals)

```bash
# terminal 1
npm run dev:server

# terminal 2
npm run dev:web
```

Open the printed Vite URL (usually `http://127.0.0.1:5173`).

### Public access with Cloudflared

With both apps running, create a temporary public URL:

```bash
cloudflared tunnel --url http://127.0.0.1:5173 \
  --http-host-header localhost \
  --no-autoupdate
```

Open the generated `https://*.trycloudflare.com` URL. Quick-tunnel URLs are temporary and change whenever the tunnel restarts.

### Phone on the same LAN

1. Start both apps (`vite --host` already binds to the LAN).
2. On your phone, open `http://<your-computer-lan-ip>:5173`.
3. Vite proxies `/api` to the Node server on port `3001`.

If the phone cannot reach the API, confirm your firewall allows ports `5173` and `3001`.

## Reset local data

```bash
npm run reset-data
rm -rf server/uploads/*
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:server` | API with reload |
| `npm run dev:web` | Vite mobile UI |
| `npm test` | Server unit + API tests |
| `npm run build` | Typecheck server + build web |
| `npm run lint` | Lint web |

## Product flow

1. Choose a unique display name (anonymous; id stored in `localStorage`).
2. Get three random challenges (completed ones excluded).
3. Lock one and take a live photo. HEIC from iPhone is converted to JPEG on the server.
4. The server accepts the photo with “Looks good!” and awards the challenge points once.
5. Leaderboard updates live over SSE.

## POC limits

- Single-process JSON file storage (fine for demos, not multi-instance production).
- Browser-scoped identity — clearing site data creates a new player.
- Camera `capture` is advisory; browser and OS behavior varies.
- Photos are not content-verified while demo auto-accept is enabled.
