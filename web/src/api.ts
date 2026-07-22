import type {
  AttemptSummary,
  Challenge,
  FeedComment,
  FeedPost,
  LeaderboardEntry,
  ReactionSummary,
  Score,
  User,
  VerifyResult,
} from './types'

const USER_KEY = 'move-quest-user-id'

export function loadStoredUserId(): string | null {
  return localStorage.getItem(USER_KEY)
}

export function storeUserId(id: string): void {
  localStorage.setItem(USER_KEY, id)
}

export function clearStoredUserId(): void {
  localStorage.removeItem(USER_KEY)
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `Request failed (${res.status})`
    throw new Error(message)
  }
  return body as T
}

function authHeaders(userId?: string | null): HeadersInit {
  return userId ? { 'x-user-id': userId } : {}
}

export async function createProfile(displayName: string): Promise<User> {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })
  const data = await parseJson<{ user: User }>(res)
  return data.user
}

export async function fetchMe(
  userId: string,
): Promise<{ user: User; score: Score }> {
  const res = await fetch('/api/me', { headers: authHeaders(userId) })
  return parseJson(res)
}

export async function drawChallenges(
  userId: string,
): Promise<{ challenges: Challenge[]; remaining: number; cooldownUntil: string | null }> {
  const res = await fetch('/api/challenges/draw', {
    headers: authHeaders(userId),
  })
  return parseJson(res)
}

export async function selectChallenge(
  userId: string,
  challengeId: string,
): Promise<{ attempt: AttemptSummary; challenge: Challenge }> {
  const res = await fetch('/api/challenges/select', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(userId),
    },
    body: JSON.stringify({ challengeId }),
  })
  return parseJson(res)
}

export async function verifyAttempt(
  userId: string,
  attemptId: string,
  photo: File,
): Promise<{
  attempt: AttemptSummary
  challenge: Challenge
  result: VerifyResult
}> {
  const form = new FormData()
  form.append('photo', photo)
  const res = await fetch(`/api/attempts/${attemptId}/verify`, {
    method: 'POST',
    headers: authHeaders(userId),
    body: form,
  })
  return parseJson(res)
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch('/api/leaderboard')
  const data = await parseJson<{ leaderboard: LeaderboardEntry[] }>(res)
  return data.leaderboard
}

export async function fetchFeed(userId: string): Promise<FeedPost[]> {
  const res = await fetch('/api/feed', { headers: authHeaders(userId) })
  const data = await parseJson<{ feed: FeedPost[] }>(res)
  return data.feed
}

export async function reactToPost(
  userId: string,
  attemptId: string,
  emoji: string,
): Promise<ReactionSummary[]> {
  const res = await fetch(`/api/feed/${attemptId}/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(userId) },
    body: JSON.stringify({ emoji }),
  })
  const data = await parseJson<{ reactions: ReactionSummary[] }>(res)
  return data.reactions
}

export async function commentOnPost(
  userId: string,
  attemptId: string,
  body: string,
): Promise<FeedComment> {
  const res = await fetch(`/api/feed/${attemptId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(userId) },
    body: JSON.stringify({ body }),
  })
  const data = await parseJson<{ comment: FeedComment }>(res)
  return data.comment
}

export function subscribeLeaderboard(
  onUpdate: (entries: LeaderboardEntry[]) => void,
  onError?: (err: Event) => void,
): () => void {
  const source = new EventSource('/api/leaderboard/stream')
  source.addEventListener('leaderboard', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data) as LeaderboardEntry[]
      onUpdate(data)
    } catch {
      // ignore malformed frames
    }
  })
  source.onerror = (err) => onError?.(err)
  return () => source.close()
}
