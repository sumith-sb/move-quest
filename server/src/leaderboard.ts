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
