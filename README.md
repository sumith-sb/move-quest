# Move Quest

Mobile-first photo challenge POC. Users pick one of three random challenges, take a photo, receive points immediately, and climb a live leaderboard.

Persistence is a single JSON file plus disk uploads — no database.

## Stack

- `web/` — Vite + React + TypeScript (mobile web UI)
- `server/` — Express + Multer + TypeScript
- Storage — `server/data/store.json` and `server/uploads/`
- Verification — demo auto-accept (`Looks good!`); Ollama integration retained but disabled
- Live board — Server-Sent Events (`/api/leaderboard/stream`)

## Prerequisites

- Node.js 20+

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
