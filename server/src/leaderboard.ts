import type { LeaderboardEntry, Score, StoreData } from './types.js'

export function rebuildScore(
  store: StoreData,
  userId: string,
  displayName: string,
  now = new Date().toISOString(),
): Score {
  const accepted = store.attempts.filter(
    (a) => a.userId === userId && a.status === 'accepted',
  )
  const totalPoints = accepted.reduce((sum, a) => sum + a.pointsAwarded, 0)
  const score: Score = {
    userId,
    displayName,
    totalPoints,
    acceptedCount: accepted.length,
    updatedAt: now,
  }

  const idx = store.scores.findIndex((s) => s.userId === userId)
  if (idx >= 0) {
    store.scores[idx] = score
  } else {
    store.scores.push(score)
  }
  return score
}

/** Points awarded to a post's author for each reaction it receives (not self). */
export const REACTION_BONUS = 2

/** Monday 00:00 UTC of the week containing `now` — the weekly reset boundary. */
export function startOfWeek(now = Date.now()): number {
  const d = new Date(now)
  const mondayOffset = (d.getUTCDay() + 6) % 7 // Sun=0 -> 6, Mon=1 -> 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - mondayOffset)
}

interface WeeklyTotals {
  challengePoints: number
  reactionPoints: number
  acceptedCount: number
  lastAt: string
}

function computeWeekly(store: StoreData, now: number): Map<string, WeeklyTotals> {
  const weekStart = startOfWeek(now)
  const inWeek = (iso: string | null) => iso != null && Date.parse(iso) >= weekStart
  const totals = new Map<string, WeeklyTotals>()
  const ensure = (userId: string): WeeklyTotals => {
    let t = totals.get(userId)
    if (!t) {
      t = { challengePoints: 0, reactionPoints: 0, acceptedCount: 0, lastAt: '' }
      totals.set(userId, t)
    }
    return t
  }

  const authorOf = new Map<string, string>()
  for (const a of store.attempts) {
    if (a.status !== 'accepted') continue
    authorOf.set(a.id, a.userId)
    if (inWeek(a.awardedAt)) {
      const t = ensure(a.userId)
      t.challengePoints += a.pointsAwarded
      t.acceptedCount += 1
      if ((a.awardedAt ?? '') > t.lastAt) t.lastAt = a.awardedAt ?? ''
    }
  }

  for (const r of store.reactions) {
    if (!inWeek(r.createdAt)) continue
    const authorId = authorOf.get(r.attemptId)
    if (!authorId || authorId === r.userId) continue // no self-farming
    const t = ensure(authorId)
    t.reactionPoints += REACTION_BONUS
    if (r.createdAt > t.lastAt) t.lastAt = r.createdAt
  }

  return totals
}

/** Leaderboard for the current week only — resets every Monday. Points are
 *  challenge points plus a bonus for every reaction your posts received. */
export function weeklyLeaderboard(
  store: StoreData,
  now = Date.now(),
): LeaderboardEntry[] {
  const totals = computeWeekly(store, now)
  const nameOf = new Map(store.users.map((u) => [u.id, u.displayName]))
  const fallback = new Date(now).toISOString()

  return [...totals.entries()]
    .map(([userId, t]) => ({
      userId,
      displayName: nameOf.get(userId) ?? 'Unknown',
      totalPoints: t.challengePoints + t.reactionPoints,
      acceptedCount: t.acceptedCount,
      updatedAt: t.lastAt || fallback,
    }))
    .filter((r) => r.totalPoints > 0)
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      if (b.acceptedCount !== a.acceptedCount) return b.acceptedCount - a.acceptedCount
      if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? -1 : 1
      return a.userId.localeCompare(b.userId)
    })
    .map((r, i) => ({ rank: i + 1, ...r }))
}

/** A single user's weekly score (for the header / profile). */
export function weeklyScore(
  store: StoreData,
  userId: string,
  displayName: string,
  now = Date.now(),
): Score {
  const t = computeWeekly(store, now).get(userId)
  return {
    userId,
    displayName,
    totalPoints: t ? t.challengePoints + t.reactionPoints : 0,
    acceptedCount: t ? t.acceptedCount : 0,
    updatedAt: new Date(now).toISOString(),
  }
}

export function rankLeaderboard(scores: Score[]): LeaderboardEntry[] {
  const sorted = [...scores].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.acceptedCount !== a.acceptedCount) {
      return b.acceptedCount - a.acceptedCount
    }
    if (a.updatedAt !== b.updatedAt) {
      return a.updatedAt < b.updatedAt ? -1 : 1
    }
    return a.userId.localeCompare(b.userId)
  })

  return sorted.map((s, i) => ({
    rank: i + 1,
    userId: s.userId,
    displayName: s.displayName,
    totalPoints: s.totalPoints,
    acceptedCount: s.acceptedCount,
    updatedAt: s.updatedAt,
  }))
}
