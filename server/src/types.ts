export type Difficulty = 'easy' | 'medium' | 'hard'

/** Movement destinations — never the desk. Onboarding marks one as the user's
 *  workspace and it is excluded from their draws. */
export type Room =
  | 'kitchen'
  | 'window'
  | 'outdoors'
  | 'hallway'
  | 'lounge'
  | 'anywhere'

export type Vibe =
  | 'nature'
  | 'hydrate'
  | 'tidy'
  | 'craft'
  | 'social'
  | 'fresh-air'
  | 'movement'

export type CriterionStatus = 'met' | 'not_met' | 'unclear'

export type AttemptStatus =
  | 'selected'
  | 'processing'
  | 'accepted'
  | 'rejected'
  | 'error'

export interface Criterion {
  id: string
  description: string
}

export interface Challenge {
  id: string
  slug: string
  title: string
  prompt: string
  difficulty: Difficulty
  room: Room
  vibe: Vibe
  points: number
  criteria: Criterion[]
  active: boolean
}

export interface User {
  id: string
  displayName: string
  createdAt: string
  /** Movement cooldown: no new challenge or post until this passes. */
  cooldownUntil: string | null
  /** Profile photo — populated from Google on sign-in (Phase 3); null = initials. */
  avatarUrl: string | null
}

export interface Attempt {
  id: string
  userId: string
  challengeId: string
  status: AttemptStatus
  caption: string | null
  sharedToFeed: boolean
  photoPath: string | null
  photoSha256: string | null
  confidence: number | null
  reason: string | null
  modelName: string | null
  modelOutput: unknown | null
  pointsAwarded: number
  createdAt: string
  updatedAt: string
  awardedAt: string | null
}

export interface Score {
  userId: string
  displayName: string
  totalPoints: number
  acceptedCount: number
  updatedAt: string
}

/** A curated emoji reaction on a feed post (an accepted attempt). */
export interface Reaction {
  id: string
  attemptId: string
  userId: string
  emoji: string
  createdAt: string
}

/** A comment on a feed post. */
export interface Comment {
  id: string
  attemptId: string
  userId: string
  displayName: string
  body: string
  createdAt: string
}

export interface StoreData {
  users: User[]
  attempts: Attempt[]
  scores: Score[]
  reactions: Reaction[]
  comments: Comment[]
}

export interface ModelCheck {
  criterion_id: string
  status: CriterionStatus
  confidence: number
  evidence: string
}

export interface ModelVerdict {
  decision: 'pass' | 'fail'
  confidence: number
  reason: string
  checks: ModelCheck[]
}

export interface VerificationSuccess {
  kind: 'verdict'
  pass: boolean
  confidence: number
  reason: string
  modelName: string
  modelOutput: ModelVerdict
}

export interface VerificationSystemError {
  kind: 'error'
  retryable: true
  reason: string
}

export type VerificationOutcome = VerificationSuccess | VerificationSystemError

export interface PublicChallenge {
  id: string
  slug: string
  title: string
  prompt: string
  difficulty: Difficulty
  room: Room
  vibe: Vibe
  points: number
}

/** One reaction bucket on a feed post: the emoji, its count, and whether the
 *  requesting user is in it. */
export interface ReactionSummary {
  emoji: string
  count: number
  mine: boolean
}

export interface FeedComment {
  id: string
  displayName: string
  body: string
  createdAt: string
}

/** A feed post — an accepted attempt, surfaced socially. */
export interface FeedPost {
  id: string
  displayName: string
  avatarUrl: string | null
  isMine: boolean
  photoUrl: string
  caption: string | null
  challengeTitle: string
  room: Room
  vibe: Vibe
  points: number
  createdAt: string
  reactions: ReactionSummary[]
  comments: FeedComment[]
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  totalPoints: number
  acceptedCount: number
  updatedAt: string
}
