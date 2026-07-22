import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import cors from 'cors'
import express, { type Request, type Response } from 'express'
import multer from 'multer'
import {
  FREE_CHALLENGE,
  drawTriad,
  getChallenge,
  remainingCount,
  toPublicChallenge,
} from './challenges.js'
import { rebuildScore, weeklyLeaderboard, weeklyScore } from './leaderboard.js'
import { type PhotoVerifier } from './ollama.js'
import {
  extensionForMime,
  isAllowedUploadMime,
  isHeicMimeOrName,
  normalizeUploadImage,
  sniffImageMime,
} from './image.js'
import { UPLOADS_DIR, ensureDataDirs, readStore, updateStore } from './store.js'
import type {
  Attempt,
  FeedPost,
  LeaderboardEntry,
  StoreData,
  User,
} from './types.js'

const PORT = Number(process.env.PORT ?? 3001)
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/** Movement cooldown — after a post, no new challenge or post until it passes.
 *  This is the pacing mechanic: get up roughly twice an hour, not every minute. */
const COOLDOWN_MINUTES = Number(process.env.COOLDOWN_MINUTES ?? 30)
const COOLDOWN_MS = Math.max(0, COOLDOWN_MINUTES) * 60 * 1000

const MAX_CAPTION = 140

/** Accept any single emoji (Slack-style), not a fixed set. */
function isEmoji(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    [...value].length <= 8 &&
    /\p{Extended_Pictographic}/u.test(value)
  )
}

type SseClient = {
  id: string
  res: Response
}

const sseClients = new Map<string, SseClient>()
const autoAcceptPhoto: PhotoVerifier = async (challenge) => ({
  kind: 'verdict',
  pass: true,
  confidence: 1,
  reason: 'Looks good!',
  modelName: 'demo-auto-accept',
  modelOutput: {
    decision: 'pass',
    confidence: 1,
    reason: 'Looks good!',
    checks: challenge.criteria.map((criterion) => ({
      criterion_id: criterion.id,
      status: 'met',
      confidence: 1,
      evidence: 'Demo mode automatically accepts captured photos.',
    })),
  },
})

let photoVerifier: PhotoVerifier = autoAcceptPhoto

export function setPhotoVerifier(verifier: PhotoVerifier): void {
  photoVerifier = verifier
}

export function resetPhotoVerifier(): void {
  photoVerifier = autoAcceptPhoto
}

function nowIso(): string {
  return new Date().toISOString()
}

function cooldownRemainingMs(user: Pick<User, 'cooldownUntil'>): number {
  if (!user.cooldownUntil) return 0
  return Math.max(0, new Date(user.cooldownUntil).getTime() - Date.now())
}

/** Build the shared feed from shared, accepted attempts — newest first — with
 *  reaction buckets (any emoji used, most-used first) and comments, from the
 *  viewer's perspective. */
function buildFeed(store: StoreData, viewerId: string): FeedPost[] {
  const posts: FeedPost[] = []
  const avatarOf = new Map(store.users.map((u) => [u.id, u.avatarUrl]))
  const accepted = store.attempts
    .filter((a) => a.status === 'accepted' && a.sharedToFeed !== false && a.photoPath)
    .sort((a, b) => (a.awardedAt ?? '') < (b.awardedAt ?? '') ? 1 : -1)

  for (const attempt of accepted) {
    const author = store.users.find((u) => u.id === attempt.userId)
    const challenge = getChallenge(attempt.challengeId)
    if (!author || !challenge) continue

    // Group reactions by emoji, in the order they first appeared, most first.
    const byEmoji = new Map<string, { count: number; mine: boolean; first: string }>()
    for (const r of store.reactions.filter((r) => r.attemptId === attempt.id)) {
      const bucket = byEmoji.get(r.emoji) ?? { count: 0, mine: false, first: r.createdAt }
      bucket.count += 1
      if (r.userId === viewerId) bucket.mine = true
      if (r.createdAt < bucket.first) bucket.first = r.createdAt
      byEmoji.set(r.emoji, bucket)
    }
    const reactions = [...byEmoji.entries()]
      .map(([emoji, b]) => ({ emoji, count: b.count, mine: b.mine, first: b.first }))
      .sort((a, b) => b.count - a.count || (a.first < b.first ? -1 : 1))
      .map(({ emoji, count, mine }) => ({ emoji, count, mine }))

    const comments = store.comments
      .filter((c) => c.attemptId === attempt.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      .map((c) => ({
        id: c.id,
        displayName: c.displayName,
        avatarUrl: avatarOf.get(c.userId) ?? null,
        body: c.body,
        createdAt: c.createdAt,
      }))

    posts.push({
      id: attempt.id,
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
      isMine: attempt.userId === viewerId,
      photoUrl: `/api/feed/${attempt.id}/photo`,
      caption: attempt.caption,
      challengeTitle: challenge.title,
      room: challenge.room,
      vibe: challenge.vibe,
      points: attempt.pointsAwarded,
      createdAt: attempt.awardedAt ?? attempt.updatedAt,
      reactions,
      comments,
    })
  }

  return posts
}

function broadcastLeaderboard(entries: LeaderboardEntry[]): void {
  const payload = `event: leaderboard\ndata: ${JSON.stringify(entries)}\n\n`
  for (const client of sseClients.values()) {
    client.res.write(payload)
  }
}

async function pushLeaderboard(): Promise<void> {
  const store = await readStore()
  broadcastLeaderboard(weeklyLeaderboard(store))
}

function getUserId(req: Request): string | null {
  const header = req.header('x-user-id')
  return header && header.trim() ? header.trim() : null
}

function requireUserId(req: Request, res: Response): string | null {
  const userId = getUserId(req)
  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing x-user-id' } })
    return null
  }
  return userId
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!isAllowedUploadMime(file.mimetype, file.originalname)) {
      cb(new Error('Only JPEG, PNG, WebP, and HEIC images are allowed'))
      return
    }
    cb(null, true)
  },
})

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, verification: 'demo-auto-accept' })
  })

  app.post('/api/profile', async (req, res) => {
    const displayName =
      typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : ''
    if (displayName.length < 1 || displayName.length > 30) {
      res.status(400).json({
        error: {
          code: 'INVALID_NAME',
          message: 'Display name must be 1–30 characters',
        },
      })
      return
    }

    try {
      const user = await updateStore((store) => {
        const taken = store.users.some(
          (u) => u.displayName.toLowerCase() === displayName.toLowerCase(),
        )
        if (taken) {
          const err = new Error('NAME_TAKEN')
          err.name = 'NAME_TAKEN'
          throw err
        }
        const created: User = {
          id: randomUUID(),
          displayName,
          createdAt: nowIso(),
          cooldownUntil: null,
          avatarUrl: null,
        }
        store.users.push(created)
        store.scores.push({
          userId: created.id,
          displayName: created.displayName,
          totalPoints: 0,
          acceptedCount: 0,
          updatedAt: created.createdAt,
        })
        return created
      })
      await pushLeaderboard()
      res.status(201).json({ user })
    } catch (err) {
      if ((err as Error).name === 'NAME_TAKEN') {
        res.status(409).json({
          error: { code: 'NAME_TAKEN', message: 'That display name is taken' },
        })
        return
      }
      throw err
    }
  })

  app.get('/api/me', async (req, res) => {
    const userId = requireUserId(req, res)
    if (!userId) return
    const store = await readStore()
    const user = store.users.find((u) => u.id === userId)
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } })
      return
    }
    const score = weeklyScore(store, userId, user.displayName)
    res.json({ user, score })
  })

  app.get('/api/challenges/draw', async (req, res) => {
    const userId = requireUserId(req, res)
    if (!userId) return
    const store = await readStore()
    const user = store.users.find((u) => u.id === userId)
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } })
      return
    }

    const completed = new Set(
      store.attempts
        .filter((a) => a.userId === userId && a.status === 'accepted')
        .map((a) => a.challengeId),
    )
    const drawn = drawTriad(completed)
    res.json({
      challenges: drawn.map(toPublicChallenge),
      freeChallenge: toPublicChallenge(FREE_CHALLENGE),
      remaining: remainingCount(completed),
      cooldownUntil:
        cooldownRemainingMs(user) > 0 ? user.cooldownUntil : null,
    })
  })

  app.post('/api/challenges/select', async (req, res) => {
    const userId = requireUserId(req, res)
    if (!userId) return
    const challengeId =
      typeof req.body?.challengeId === 'string' ? req.body.challengeId : ''
    const challenge = getChallenge(challengeId)
    if (!challenge) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Challenge not found' },
      })
      return
    }

    try {
      const attempt = await updateStore((store) => {
        const user = store.users.find((u) => u.id === userId)
        if (!user) {
          const err = new Error('USER_NOT_FOUND')
          err.name = 'USER_NOT_FOUND'
          throw err
        }
        if (cooldownRemainingMs(user) > 0) {
          const err = new Error('COOLDOWN')
          err.name = 'COOLDOWN'
          throw err
        }
        // The free post is repeatable — every one is a brand-new attempt.
        const isFree = challengeId === FREE_CHALLENGE.id

        const alreadyAccepted = store.attempts.some(
          (a) =>
            a.userId === userId &&
            a.challengeId === challengeId &&
            a.status === 'accepted',
        )
        if (alreadyAccepted && !isFree) {
          const err = new Error('ALREADY_COMPLETED')
          err.name = 'ALREADY_COMPLETED'
          throw err
        }

        // Reuse open attempt for retry, else create a new selected attempt.
        const open = isFree
          ? undefined
          : store.attempts.find(
              (a) =>
                a.userId === userId &&
                a.challengeId === challengeId &&
                (a.status === 'selected' ||
                  a.status === 'rejected' ||
                  a.status === 'error'),
            )
        if (open) {
          open.status = 'selected'
          open.updatedAt = nowIso()
          return open
        }

        const created: Attempt = {
          id: randomUUID(),
          userId,
          challengeId,
          status: 'selected',
          caption: null,
          sharedToFeed: true,
          photoPath: null,
          photoSha256: null,
          confidence: null,
          reason: null,
          modelName: null,
          modelOutput: null,
          pointsAwarded: 0,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          awardedAt: null,
        }
        store.attempts.push(created)
        return created
      })
      res.status(201).json({
        attempt: {
          id: attempt.id,
          challengeId: attempt.challengeId,
          status: attempt.status,
        },
        challenge: toPublicChallenge(challenge),
      })
    } catch (err) {
      const name = (err as Error).name
      if (name === 'USER_NOT_FOUND') {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } })
        return
      }
      if (name === 'ALREADY_COMPLETED') {
        res.status(409).json({
          error: {
            code: 'ALREADY_COMPLETED',
            message: 'You already completed this challenge',
          },
        })
        return
      }
      if (name === 'COOLDOWN') {
        res.status(409).json({
          error: {
            code: 'COOLDOWN',
            message: 'You just moved — take a break before the next one',
          },
        })
        return
      }
      throw err
    }
  })

  app.post('/api/attempts/:attemptId/verify', (req, res) => {
    upload.single('photo')(req, res, async (uploadErr) => {
      if (uploadErr) {
        res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: uploadErr.message || 'Upload failed',
          },
        })
        return
      }

      const userId = requireUserId(req, res)
      if (!userId) return

      const attemptId = req.params.attemptId
      const rawCaption =
        typeof req.body?.caption === 'string' ? req.body.caption.trim() : ''
      const caption = rawCaption ? rawCaption.slice(0, MAX_CAPTION) : null
      // Multer delivers form fields as strings; default to shared unless opted out.
      const sharedToFeed = req.body?.sharedToFeed !== 'false'

      const file = req.file
      if (!file) {
        res.status(400).json({
          error: { code: 'MISSING_PHOTO', message: 'Photo file is required' },
        })
        return
      }

      const sniffed =
        sniffImageMime(file.buffer) ??
        (isHeicMimeOrName(file.mimetype, file.originalname) ? 'image/heic' : null)
      if (!sniffed) {
        console.warn('reject upload: unknown image magic', {
          mime: file.mimetype,
          name: file.originalname,
          size: file.size,
        })
        res.status(400).json({
          error: {
            code: 'INVALID_IMAGE',
            message: 'File must be a valid JPEG, PNG, WebP, or HEIC image',
          },
        })
        return
      }

      const storePeek = await readStore()
      const attemptPeek = storePeek.attempts.find((a) => a.id === attemptId)
      if (!attemptPeek || attemptPeek.userId !== userId) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Attempt not found' },
        })
        return
      }
      if (attemptPeek.status === 'accepted') {
        res.json({
          attempt: attemptPeek,
          challenge: toPublicChallenge(getChallenge(attemptPeek.challengeId)!),
          result: {
            status: 'accepted',
            pass: true,
            confidence: attemptPeek.confidence,
            reason: attemptPeek.reason,
            pointsAwarded: attemptPeek.pointsAwarded,
            retryable: false,
          },
        })
        return
      }
      if (attemptPeek.status === 'processing') {
        res.status(409).json({
          error: {
            code: 'IN_PROGRESS',
            message: 'Verification already in progress',
          },
        })
        return
      }

      const challenge = getChallenge(attemptPeek.challengeId)
      if (!challenge) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Challenge not found' },
        })
        return
      }

      if (attemptPeek.challengeId === FREE_CHALLENGE.id && !caption) {
        res.status(400).json({
          error: { code: 'CAPTION_REQUIRED', message: 'A caption is required for a free post' },
        })
        return
      }

      let normalized
      try {
        normalized = await normalizeUploadImage(file.buffer, sniffed)
      } catch (err) {
        console.error('image normalize failed', {
          mime: file.mimetype,
          name: file.originalname,
          sniffed,
          size: file.size,
          error: (err as Error).message,
        })
        res.status(400).json({
          error: {
            code: 'INVALID_IMAGE',
            message:
              sniffed === 'image/heic'
                ? `Could not decode HEIC photo. ${(err as Error).message}`
                : 'Could not decode image',
          },
        })
        return
      }

      const sha256 = createHash('sha256').update(normalized.buffer).digest('hex')

      const duplicateElsewhere = storePeek.attempts.some(
        (a) =>
          a.userId === userId &&
          a.challengeId === attemptPeek.challengeId &&
          a.photoSha256 === sha256 &&
          a.id !== attemptId,
      )
      const sameRejectedPhoto =
        attemptPeek.status === 'rejected' && attemptPeek.photoSha256 === sha256
      if (duplicateElsewhere || sameRejectedPhoto) {
        res.status(409).json({
          error: {
            code: 'DUPLICATE_PHOTO',
            message: 'Submit a new photo for this challenge',
          },
        })
        return
      }

      await ensureDataDirs()
      const userDir = path.join(UPLOADS_DIR, userId)
      await mkdir(userDir, { recursive: true })
      const filename = `${attemptId}-${Date.now()}.${extensionForMime(normalized.mime)}`
      const absPath = path.join(userDir, filename)
      const relPath = path.join(userId, filename)
      await writeFile(absPath, normalized.buffer)

      const claimed = await updateStore((store) => {
        const attempt = store.attempts.find((a) => a.id === attemptId)
        if (!attempt || attempt.userId !== userId) {
          const err = new Error('NOT_FOUND')
          err.name = 'NOT_FOUND'
          throw err
        }
        if (attempt.status === 'accepted') return { kind: 'accepted' as const, attempt }
        if (attempt.status === 'processing') {
          const err = new Error('IN_PROGRESS')
          err.name = 'IN_PROGRESS'
          throw err
        }
        if (
          store.attempts.some(
            (a) =>
              a.userId === userId &&
              a.challengeId === attempt.challengeId &&
              a.photoSha256 === sha256 &&
              a.id !== attempt.id,
          )
        ) {
          const err = new Error('DUPLICATE_PHOTO')
          err.name = 'DUPLICATE_PHOTO'
          throw err
        }

        attempt.status = 'processing'
        attempt.caption = caption
        attempt.sharedToFeed = sharedToFeed
        attempt.photoPath = relPath
        attempt.photoSha256 = sha256
        attempt.updatedAt = nowIso()
        attempt.reason = null
        attempt.confidence = null
        attempt.modelName = null
        attempt.modelOutput = null
        return { kind: 'claimed' as const, attempt }
      }).catch(async (err) => {
        await unlink(absPath).catch(() => undefined)
        throw err
      })

      if (claimed.kind === 'accepted') {
        res.json({
          attempt: claimed.attempt,
          challenge: toPublicChallenge(challenge),
          result: {
            status: 'accepted',
            pass: true,
            confidence: claimed.attempt.confidence,
            reason: claimed.attempt.reason,
            pointsAwarded: claimed.attempt.pointsAwarded,
            retryable: false,
          },
        })
        return
      }

      const outcome = await photoVerifier(challenge, absPath)

      try {
        const finalized = await updateStore((store) => {
          const attempt = store.attempts.find((a) => a.id === attemptId)
          const user = store.users.find((u) => u.id === userId)
          if (!attempt || !user) {
            const err = new Error('NOT_FOUND')
            err.name = 'NOT_FOUND'
            throw err
          }

          // Idempotent: if another request already accepted, keep that.
          if (attempt.status === 'accepted') {
            return {
              attempt,
              result: {
                status: 'accepted' as const,
                pass: true,
                confidence: attempt.confidence,
                reason: attempt.reason,
                pointsAwarded: attempt.pointsAwarded,
                retryable: false,
              },
            }
          }

          if (outcome.kind === 'error') {
            attempt.status = 'error'
            attempt.reason = outcome.reason
            attempt.confidence = null
            attempt.modelName = null
            attempt.modelOutput = null
            attempt.pointsAwarded = 0
            attempt.awardedAt = null
            attempt.updatedAt = nowIso()
            return {
              attempt,
              result: {
                status: 'error' as const,
                pass: false,
                confidence: 0,
                reason: outcome.reason,
                pointsAwarded: 0,
                retryable: true,
              },
            }
          }

          if (outcome.pass) {
            attempt.status = 'accepted'
            attempt.confidence = outcome.confidence
            attempt.reason = outcome.reason
            attempt.modelName = outcome.modelName
            attempt.modelOutput = outcome.modelOutput
            attempt.pointsAwarded = challenge.points
            attempt.awardedAt = nowIso()
            attempt.updatedAt = attempt.awardedAt
            // The move is done — start the cooldown before the next one.
            user.cooldownUntil = new Date(Date.now() + COOLDOWN_MS).toISOString()
            rebuildScore(store, userId, user.displayName, attempt.awardedAt)
            return {
              attempt,
              result: {
                status: 'accepted' as const,
                pass: true,
                confidence: outcome.confidence,
                reason: outcome.reason,
                pointsAwarded: challenge.points,
                retryable: false,
              },
            }
          }

          attempt.status = 'rejected'
          attempt.confidence = outcome.confidence
          attempt.reason = outcome.reason
          attempt.modelName = outcome.modelName
          attempt.modelOutput = outcome.modelOutput
          attempt.pointsAwarded = 0
          attempt.awardedAt = null
          attempt.updatedAt = nowIso()
          return {
            attempt,
            result: {
              status: 'rejected' as const,
              pass: false,
              confidence: outcome.confidence,
              reason: outcome.reason,
              pointsAwarded: 0,
              retryable: true,
            },
          }
        })

        if (finalized.result.status === 'accepted') {
          await pushLeaderboard()
        }

        res.json({
          attempt: {
            id: finalized.attempt.id,
            challengeId: finalized.attempt.challengeId,
            status: finalized.attempt.status,
            pointsAwarded: finalized.attempt.pointsAwarded,
            confidence: finalized.attempt.confidence,
            reason: finalized.attempt.reason,
          },
          challenge: toPublicChallenge(challenge),
          result: finalized.result,
        })
      } catch (err) {
        const name = (err as Error).name
        if (name === 'NOT_FOUND') {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Attempt not found' },
          })
          return
        }
        if (name === 'IN_PROGRESS') {
          res.status(409).json({
            error: {
              code: 'IN_PROGRESS',
              message: 'Verification already in progress',
            },
          })
          return
        }
        if (name === 'DUPLICATE_PHOTO') {
          res.status(409).json({
            error: {
              code: 'DUPLICATE_PHOTO',
              message: 'Submit a new photo for this challenge',
            },
          })
          return
        }
        throw err
      }
    })
  })

  app.get('/api/leaderboard', async (_req, res) => {
    const store = await readStore()
    res.json({ leaderboard: weeklyLeaderboard(store) })
  })

  app.get('/api/leaderboard/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const clientId = randomUUID()
    sseClients.set(clientId, { id: clientId, res })

    const store = await readStore()
    res.write(
      `event: leaderboard\ndata: ${JSON.stringify(weeklyLeaderboard(store))}\n\n`,
    )

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n')
    }, 15000)

    req.on('close', () => {
      clearInterval(heartbeat)
      sseClients.delete(clientId)
    })
  })

  // --- Feed ----------------------------------------------------------------
  app.get('/api/feed', async (req, res) => {
    const userId = requireUserId(req, res)
    if (!userId) return
    const store = await readStore()
    res.json({ feed: buildFeed(store, userId) })
  })

  // Public (within-app) photo for a posted challenge. Only accepted attempts
  // with a stored photo are served, so unposted uploads never leak.
  app.get('/api/feed/:attemptId/photo', async (req, res) => {
    const store = await readStore()
    const attempt = store.attempts.find((a) => a.id === req.params.attemptId)
    if (!attempt || attempt.status !== 'accepted' || !attempt.photoPath) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Photo not found' } })
      return
    }
    const abs = path.join(UPLOADS_DIR, attempt.photoPath)
    createReadStream(abs)
      .on('error', () => {
        res.status(404).end()
      })
      .pipe(res)
  })

  app.post('/api/feed/:attemptId/react', async (req, res) => {
    const userId = requireUserId(req, res)
    if (!userId) return
    const emoji = req.body?.emoji
    if (!isEmoji(emoji)) {
      res.status(400).json({
        error: { code: 'INVALID_EMOJI', message: 'Reaction must be a single emoji' },
      })
      return
    }

    try {
      await updateStore((store) => {
        const attempt = store.attempts.find((a) => a.id === req.params.attemptId)
        if (!attempt || attempt.status !== 'accepted') {
          const err = new Error('NOT_FOUND')
          err.name = 'NOT_FOUND'
          throw err
        }
        if (attempt.userId === userId) {
          const err = new Error('OWN_POST')
          err.name = 'OWN_POST'
          throw err
        }
        const existing = store.reactions.findIndex(
          (r) =>
            r.attemptId === attempt.id && r.userId === userId && r.emoji === emoji,
        )
        if (existing >= 0) {
          store.reactions.splice(existing, 1) // toggle off
        } else {
          store.reactions.push({
            id: randomUUID(),
            attemptId: attempt.id,
            userId,
            emoji,
            createdAt: nowIso(),
          })
        }
      })
      const store = await readStore()
      const post = buildFeed(store, userId).find((p) => p.id === req.params.attemptId)
      // Reactions earn the author points — refresh the weekly board live.
      await pushLeaderboard()
      res.json({ reactions: post?.reactions ?? [] })
    } catch (err) {
      const name = (err as Error).name
      if (name === 'OWN_POST') {
        res.status(403).json({
          error: { code: 'OWN_POST', message: 'You can’t react to your own post' },
        })
        return
      }
      if (name === 'NOT_FOUND') {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } })
        return
      }
      throw err
    }
  })

  app.post('/api/feed/:attemptId/comment', async (req, res) => {
    const userId = requireUserId(req, res)
    if (!userId) return
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    if (body.length < 1 || body.length > 280) {
      res.status(400).json({
        error: { code: 'INVALID_COMMENT', message: 'Comment must be 1–280 characters' },
      })
      return
    }

    try {
      const comment = await updateStore((store) => {
        const attempt = store.attempts.find((a) => a.id === req.params.attemptId)
        const user = store.users.find((u) => u.id === userId)
        if (!attempt || attempt.status !== 'accepted' || !user) {
          const err = new Error('NOT_FOUND')
          err.name = 'NOT_FOUND'
          throw err
        }
        const created = {
          id: randomUUID(),
          attemptId: attempt.id,
          userId,
          displayName: user.displayName,
          body,
          createdAt: nowIso(),
        }
        store.comments.push(created)
        return created
      })
      res.status(201).json({
        comment: {
          id: comment.id,
          displayName: comment.displayName,
          body: comment.body,
          createdAt: comment.createdAt,
        },
      })
    } catch (err) {
      if ((err as Error).name === 'NOT_FOUND') {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } })
        return
      }
      throw err
    }
  })

  // Private photo access for debugging owner only — not listed on leaderboard.
  app.get('/api/attempts/:attemptId/photo', async (req, res) => {
    const userId = requireUserId(req, res)
    if (!userId) return
    const store = await readStore()
    const attempt = store.attempts.find((a) => a.id === req.params.attemptId)
    if (!attempt || attempt.userId !== userId || !attempt.photoPath) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Photo not found' } })
      return
    }
    const abs = path.join(UPLOADS_DIR, attempt.photoPath)
    createReadStream(abs).on('error', () => {
      res.status(404).end()
    }).pipe(res)
  })

  app.use(
    (
      err: Error,
      _req: Request,
      res: Response,
      _next: express.NextFunction,
    ) => {
      console.error(err)
      res.status(500).json({
        error: { code: 'INTERNAL', message: 'Internal server error' },
      })
    },
  )

  return app
}

export async function startServer(port = PORT) {
  await ensureDataDirs()
  const app = createApp()
  return app.listen(port, () => {
    console.log(`Move Quest API on http://127.0.0.1:${port}`)
    console.log('Verification: demo auto-accept')
  })
}

const isMain =
  process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  startServer().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
