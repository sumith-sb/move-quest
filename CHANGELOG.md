# Changelog

## 2026-07-23 — Park reminders; ship reactions + comments

- **Problem:** Reminders/Web Push add VAPID ops overhead before we need them.
- **Reason for change:** Ship feed social now; leave push schema/Edge stubs unwired for later.
- **Scope:** Removed Settings reminder toggles, App nudge/poll/`registerPush`, verify-photo push invoke, and client push API helpers. Reactions/comments stay live.
- **Risks:** Dormant `push_*` tables/functions remain until a later reminder pass.
- **Verification:** PASS — `web` oxlint, `tsc -b`, `vite build`.

## 2026-07-23 — Reactions, comments, and reminders

- **Problem:** Feed social engagement and reminders were deferred when Express was replaced; onboarding still promised reactions/comments.
- **Reason for change:** Port emoji reactions (+2 author bonus), comments, feed Web Push, and a daily movement nudge onto Supabase.
- **Scope:** Migration `20260723120000_reactions_comments_push.sql`; Edge `push-key` / `send-feed-push` + verify-photo hook; FeedScreen UI; Settings toggles; SW base-path fix for GitHub Pages.
- **Risks:** Push silent until VAPID secrets + function deploy; reaction bonus hits all-time `scores` (weekly reset still not implemented); daily nudge is client-only.
- **Verification:** PASS — `web` oxlint, `tsc -b`, `vite build`.

## 2026-07-23 — Client-side photo compression

- **Problem:** iPhone camera JPEGs often exceed the 1 MiB upload limit enforced by `verify-photo` and Storage.
- **Reason for change:** Compress and resize in the browser before upload so users can post without hitting `413 TOO_LARGE`.
- **Scope:** `web/src/lib/preparePhoto.ts`; wired in `App.tsx` / `CaptureScreen` with Compressing… / Posting… labels.
- **Risks:** HEIC library picks still unsupported (JPEG camera path only); rare photos may fail after max compression.
- **Verification:** PASS — `web` oxlint, `tsc -b`, `vite build`.

## 2026-07-23 — Seed 1,000 Express challenges into Supabase

- **Problem:** Supabase v0 migration only seeded 11 hand-written challenges; the Express catalog had 1,000 programmatic prompts.
- **Reason for change:** Restore the full challenge pool for draws and long-term replay.
- **Scope:** Migration `20260723100000_seed_express_challenges.sql` (upsert 1,000 rows); generator `scripts/generate-challenges-sql.mts` + `scripts/_legacy/challenges.ts`; deactivates 10 legacy v0 duplicates and `ch_free` (free-post not in Supabase v0); DB test expects `>= 999` active challenges.
- **Risks:** ~230 KB migration; 12 duplicate slugs suffix-adjusted for Postgres `slug` unique constraint; run `supabase db push` on linked project.
- **Verification:** Generator reports 1000 rows; slug dedupe applied; pending `supabase db push`.

## 2026-07-23 — GitHub Pages deploy on `main` → `live` PR merge

- **Problem:** No automated production deploy path for the static web app.
- **Reason for change:** Ship to GitHub Pages only when `main` is merged into `live`, avoiding accidental deploys from direct pushes or other branches.
- **Scope:** Added `.github/workflows/deploy-pages.yml` (PR closed + merged, head `main`); README deploy section with secrets and one-time setup checklist.
- **Risks:** Requires GitHub Pages + Action secrets configured before first merge; Supabase Auth redirect URLs must include Pages origin.
- **Verification:** Workflow YAML added; manual verify on first `main` → `live` PR merge.

## 2026-07-23 — Supabase backend (replace Express)

- **Problem:** Anonymous `localStorage` identity and JSON file storage don't scale; team needs real auth and shared DB.
- **Reason for change:** Port full Supabase Auth + Postgres/RLS/Storage from `dev-sumith` onto latest main UI; keep demo auto-accept for photos (no Cloudflare AI).
- **Scope:**
  - Supabase migrations, RLS, RPCs, private Storage bucket
  - Auth UI (sign in/up, email confirm, display-name claim)
  - Thin `verify-photo` Edge Function (claim lease → upload → finalize `Looks good!`)
  - Web rewired to Supabase client; Express `server/` removed
  - Main UI chrome kept (NavMenu, settings theme, feed/leaderboard visuals)
  - Out of scope: reactions, comments, push, cooldown, free posts, room/vibe metadata
- **Risks:** Requires deployed Edge Function + service role secret; email domain allowlist must match team; no data migration from `store.json`.
- **Verification:** PASS — `web` oxlint, `tsc -b`, `vite build`.

## 2026-07-22 — Initial Move Quest POC

- **Problem:** Need a hackathon-ready mobile web demo that gets people moving with photo challenges, AI checks, and a competitive leaderboard — without heavy infra.
- **Reason for change:** Greenfield build; local JSON + Ollama keeps setup minimal while still exercising a real vision verification loop.
- **Scope:**
  - React mobile UI: onboarding, challenge picks, capture, results, live leaderboard
  - Express API: profiles, challenge draw/select, upload + verify, SSE leaderboard
  - Atomic JSON store and private disk uploads
  - Strict Ollama vision JSON verification policy (0.80 confidence threshold; default model `gemma4:e4b`)
  - Retry on rejection; idempotent scoring; exact duplicate-photo rejection
- **Risks:** JSON concurrency only serialized in-process; anonymous spoofable identities; model false accepts/rejects; no liveness detection.
- **Verification:** PASS — `npm test` (12/12), `server` `tsc --noEmit`, `web` `oxlint`, `web` `vite build`; API smoke: `/api/health`, profile create, challenge draw, leaderboard.

## 2026-07-22 — HEIC upload support

- **Problem:** iPhone camera rolls often produce HEIC; uploads were rejected.
- **Reason for change:** Accept HEIC/HEIF and convert to JPEG server-side so Ollama can verify.
- **Scope:** Added `heic-convert`, image sniffing for `ftyp` HEIC brands, capture `accept` includes `.heic`/`.heif`.
- **Risks:** `heic-convert` pulls `libheif` WASM (LGPL runtime); conversion adds latency/CPU; Chrome desktop may not preview HEIC locally even though upload works.
- **Verification:** PASS — `npm test` (15/15 including HEIC sniff tests), `server` `tsc --noEmit`, web lint/build.

## 2026-07-22 — EXIF freshness gate

- **Problem:** Old gallery photos could earn points without moving now.
- **Reason for change:** Require EXIF capture time within 15 minutes (configurable) before AI verification and scoring.
- **Scope:** Added `exifr`, `freshness.ts`, capture-time rejection reasons, UI hint, `PHOTO_MAX_AGE_MINUTES`.
- **Risks:** EXIF can be stripped or forged; screenshots/edited exports often lack timestamps and will fail; phone/server clock skew.
- **Verification:** PASS — `npm test` (20/20), `server` `tsc --noEmit`, web build.

## 2026-07-22 — Remove EXIF freshness gate

- **Problem:** Photo timestamps were unreliable across phone and gallery upload paths, blocking valid submissions.
- **Reason for change:** Let Ollama judge challenge criteria without depending on optional or altered image metadata.
- **Scope:** Removed EXIF parsing, timestamp rejection, the age setting, and the capture-screen warning.
- **Risks:** Older gallery photos can now be submitted; duplicate-photo detection still applies.
- **Verification:** PASS — server typecheck, web lint, 15/15 tests, and full build.

## 2026-07-22 — HEIC decode hardening

- **Problem:** iPhone HEIC uploads still failed in practice.
- **Reason for change:** `heic-convert` often cannot decode iPhone HEVC HEIC; macOS `sips` can. Also `capture` on the file input blocked easy camera-roll picks.
- **Scope:** HEIC→JPEG via heic-convert then `sips` fallback; looser MIME prefilter; separate Take photo / Choose from library buttons; clearer decode errors.
- **Risks:** `sips` is macOS-only (fine for this local POC).
- **Verification:** PASS — tests 20/20, server tsc, web build.

## 2026-07-22 — Camera-only demo scoring

- **Problem:** Live Ollama verification adds latency and failure risk to the hackathon demo.
- **Reason for change:** Keep the interaction immediate and reliable: capture a photo, show “Looks good!”, and award points.
- **Scope:** Disabled the default Ollama lookup, added deterministic auto-accept scoring, removed the gallery picker, and updated result copy.
- **Risks:** Browser `capture` remains advisory and photo contents are not validated in demo mode.
- **Verification:** PASS — server typecheck, web lint, 16/16 tests, and full build.
