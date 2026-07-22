import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { drawTriad, getChallenge } from './challenges.js'
import {
  createApp,
  resetPhotoVerifier,
  setPhotoVerifier,
} from './index.js'
import { rankLeaderboard, rebuildScore } from './leaderboard.js'
import { STORE_PATH, readStore, resetStore, updateStore } from './store.js'
import type { ModelVerdict, StoreData } from './types.js'
import {
  applyPassPolicy,
  parseModelVerdict,
} from './verification.js'

const challenge = getChallenge('ch_plant')!

function validPassVerdict(): ModelVerdict {
  return {
    decision: 'pass',
    confidence: 0.91,
    reason: 'Green plant clearly visible.',
    checks: [
      {
        criterion_id: 'plant_visible',
        status: 'met',
        confidence: 0.93,
        evidence: 'Leafy plant in foreground',
      },
      {
        criterion_id: 'plant_real',
        status: 'met',
        confidence: 0.9,
        evidence: 'A living potted plant',
      },
    ],
  }
}

describe('drawTriad', () => {
  it('returns one easy, one medium, and one hard challenge', () => {
    const drawn = drawTriad([], () => 0.42)
    assert.equal(drawn.length, 3)
    assert.deepEqual(
      drawn.map((c) => c.difficulty),
      ['easy', 'medium', 'hard'],
    )
  })

  it('excludes completed challenge ids', () => {
    const first = drawTriad([], () => 0)
    const exclude = first.map((c) => c.id)
    const drawn = drawTriad(exclude, () => 0)
    for (const c of drawn) {
      assert.equal(exclude.includes(c.id), false)
    }
  })
})

describe('parseModelVerdict + pass policy', () => {
  it('accepts a valid pass verdict above threshold', () => {
    const verdict = parseModelVerdict(validPassVerdict(), challenge)
    const policy = applyPassPolicy(verdict)
    assert.equal(policy.pass, true)
  })

  it('rejects unclear criteria even when decision is pass', () => {
    const raw = validPassVerdict()
    raw.checks[0].status = 'unclear'
    const verdict = parseModelVerdict(raw, challenge)
    assert.equal(applyPassPolicy(verdict).pass, false)
  })

  it('rejects confidence below threshold', () => {
    const raw = validPassVerdict()
    raw.confidence = 0.5
    const verdict = parseModelVerdict(raw, challenge)
    assert.equal(applyPassPolicy(verdict).pass, false)
  })

  it('throws on missing criterion', () => {
    const raw = validPassVerdict()
    raw.checks = [raw.checks[0]]
    assert.throws(() => parseModelVerdict(raw, challenge))
  })

  it('throws on unknown keys', () => {
    const raw = { ...validPassVerdict(), extra: true }
    assert.throws(() => parseModelVerdict(raw, challenge))
  })
})

describe('leaderboard ranking', () => {
  it('orders by points, then accepted count, then earliest update', () => {
    const ranked = rankLeaderboard([
      {
        userId: 'b',
        displayName: 'Bee',
        totalPoints: 50,
        acceptedCount: 1,
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      {
        userId: 'a',
        displayName: 'Ace',
        totalPoints: 50,
        acceptedCount: 2,
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
      {
        userId: 'c',
        displayName: 'Cat',
        totalPoints: 10,
        acceptedCount: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
    assert.deepEqual(
      ranked.map((r) => r.userId),
      ['a', 'b', 'c'],
    )
  })
})

describe('json store', () => {
  it('persists updates atomically', async () => {
    await resetStore()
    await updateStore((store: StoreData) => {
      store.users.push({
        id: 'u1',
        displayName: 'Tester',
        createdAt: '2026-01-01T00:00:00.000Z',
        cooldownUntil: null,
      })
    })
    const store = await readStore()
    assert.equal(store.users[0]?.displayName, 'Tester')
    assert.ok(STORE_PATH.endsWith('store.json'))
    await resetStore()
  })

  it('rebuilds scores from accepted attempts', async () => {
    await resetStore()
    await updateStore((store) => {
      store.users.push({
        id: 'u1',
        displayName: 'Scorer',
        createdAt: '2026-01-01T00:00:00.000Z',
        cooldownUntil: null,
      })
      store.attempts.push({
        id: 'a1',
        userId: 'u1',
        challengeId: 'ch_plant',
        status: 'accepted',
        photoPath: null,
        photoSha256: null,
        confidence: 0.9,
        reason: 'ok',
        modelName: 'test',
        modelOutput: null,
        pointsAwarded: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        awardedAt: '2026-01-01T00:00:00.000Z',
      })
      rebuildScore(store, 'u1', 'Scorer', '2026-01-01T00:00:00.000Z')
    })
    const store = await readStore()
    assert.equal(store.scores[0]?.totalPoints, 10)
    await resetStore()
  })
})

describe('api verify flow', () => {
  let baseUrl = ''
  let server: ReturnType<ReturnType<typeof createApp>['listen']>

  before(async () => {
    await resetStore()
    const app = createApp()
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve())
    })
    const addr = server.address()
    if (!addr || typeof addr === 'string') throw new Error('no port')
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  after(async () => {
    resetPhotoVerifier()
    await resetStore()
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  })

  async function createUser(name: string) {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name }),
    })
    assert.equal(res.status, 201)
    return (await res.json()) as { user: { id: string; displayName: string } }
  }

  it('should auto-accept a captured photo and award points', async () => {
    resetPhotoVerifier()
    const { user } = await createUser(`Demo-${Date.now()}`)
    const selectRes = await fetch(`${baseUrl}/api/challenges/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify({ challengeId: 'ch_plant' }),
    })
    const selected = (await selectRes.json()) as { attempt: { id: string } }

    const form = new FormData()
    form.append(
      'photo',
      new Blob([Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xd9])], {
        type: 'image/jpeg',
      }),
      'capture.jpg',
    )
    const res = await fetch(`${baseUrl}/api/attempts/${selected.attempt.id}/verify`, {
      method: 'POST',
      headers: { 'x-user-id': user.id },
      body: form,
    })
    assert.equal(res.status, 200)
    const body = (await res.json()) as {
      result: { status: string; reason: string; pointsAwarded: number }
    }
    assert.equal(body.result.status, 'accepted')
    assert.equal(body.result.reason, 'Looks good!')
    assert.equal(body.result.pointsAwarded, 10)
  })

  it('awards points once and allows rejected retry with a new photo', async () => {
    const { user } = await createUser(`Runner-${Date.now()}`)
    const selectRes = await fetch(`${baseUrl}/api/challenges/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify({ challengeId: 'ch_plant' }),
    })
    assert.equal(selectRes.status, 201)
    const selected = (await selectRes.json()) as { attempt: { id: string } }

    setPhotoVerifier(async () => ({
      kind: 'verdict',
      pass: false,
      confidence: 0.4,
      reason: 'No leaf found',
      modelName: 'mock',
      modelOutput: validPassVerdict(),
    }))

    const tmp = await mkdtemp(path.join(tmpdir(), 'mq-'))
    const photoA = path.join(tmp, 'a.jpg')
    const photoB = path.join(tmp, 'b.jpg')
    // Minimal JPEG SOI/EOI markers + different payload bytes for distinct hashes.
    await writeFile(photoA, Buffer.from([0xff, 0xd8, 0xff, 0x01, 0xd9]))
    await writeFile(photoB, Buffer.from([0xff, 0xd8, 0xff, 0x02, 0xd9]))

    const formA = new FormData()
    formA.append(
      'photo',
      new Blob([await readFile(photoA)], { type: 'image/jpeg' }),
      'a.jpg',
    )
    const rejectRes = await fetch(
      `${baseUrl}/api/attempts/${selected.attempt.id}/verify`,
      {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: formA,
      },
    )
    assert.equal(rejectRes.status, 200)
    const rejected = (await rejectRes.json()) as {
      result: { status: string; pointsAwarded: number }
    }
    assert.equal(rejected.result.status, 'rejected')
    assert.equal(rejected.result.pointsAwarded, 0)

    // Same photo again should be blocked.
    const formDup = new FormData()
    formDup.append(
      'photo',
      new Blob([await readFile(photoA)], { type: 'image/jpeg' }),
      'a.jpg',
    )
    const dupRes = await fetch(
      `${baseUrl}/api/attempts/${selected.attempt.id}/verify`,
      {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: formDup,
      },
    )
    assert.equal(dupRes.status, 409)

    setPhotoVerifier(async () => ({
      kind: 'verdict',
      pass: true,
      confidence: 0.95,
      reason: 'Leaf found',
      modelName: 'mock',
      modelOutput: validPassVerdict(),
    }))

    const formB = new FormData()
    formB.append(
      'photo',
      new Blob([await readFile(photoB)], { type: 'image/jpeg' }),
      'b.jpg',
    )
    const acceptRes = await fetch(
      `${baseUrl}/api/attempts/${selected.attempt.id}/verify`,
      {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: formB,
      },
    )
    assert.equal(acceptRes.status, 200)
    const accepted = (await acceptRes.json()) as {
      result: { status: string; pointsAwarded: number }
    }
    assert.equal(accepted.result.status, 'accepted')
    assert.equal(accepted.result.pointsAwarded, 10)

    // Idempotent re-submit of accepted attempt.
    const formAgain = new FormData()
    formAgain.append(
      'photo',
      new Blob([await readFile(photoB)], { type: 'image/jpeg' }),
      'b.jpg',
    )
    const againRes = await fetch(
      `${baseUrl}/api/attempts/${selected.attempt.id}/verify`,
      {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: formAgain,
      },
    )
    assert.equal(againRes.status, 200)
    const again = (await againRes.json()) as {
      result: { pointsAwarded: number }
    }
    assert.equal(again.result.pointsAwarded, 10)

    const board = (await (await fetch(`${baseUrl}/api/leaderboard`)).json()) as {
      leaderboard: Array<{ userId: string; totalPoints: number }>
    }
    const mine = board.leaderboard.find((e) => e.userId === user.id)
    assert.equal(mine?.totalPoints, 10)

    await rm(tmp, { recursive: true, force: true })
  })

  it('treats verifier system errors as retryable without scoring', async () => {
    const { user } = await createUser(`Err-${Date.now()}`)
    const selectRes = await fetch(`${baseUrl}/api/challenges/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify({ challengeId: 'ch_window_view' }),
    })
    const selected = (await selectRes.json()) as { attempt: { id: string } }

    setPhotoVerifier(async () => ({
      kind: 'error',
      retryable: true,
      reason: 'Verification unavailable; please retry.',
    }))

    const tmp = await mkdtemp(path.join(tmpdir(), 'mq-'))
    const photo = path.join(tmp, 'c.jpg')
    await writeFile(photo, Buffer.from([0xff, 0xd8, 0xff, 0x03, 0xd9]))
    const form = new FormData()
    form.append(
      'photo',
      new Blob([await readFile(photo)], { type: 'image/jpeg' }),
      'c.jpg',
    )
    const res = await fetch(`${baseUrl}/api/attempts/${selected.attempt.id}/verify`, {
      method: 'POST',
      headers: { 'x-user-id': user.id },
      body: form,
    })
    assert.equal(res.status, 200)
    const body = (await res.json()) as {
      result: { status: string; retryable: boolean; pointsAwarded: number }
    }
    assert.equal(body.result.status, 'error')
    assert.equal(body.result.retryable, true)
    assert.equal(body.result.pointsAwarded, 0)
    await rm(tmp, { recursive: true, force: true })
  })

})
