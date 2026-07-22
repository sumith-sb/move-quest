export type Difficulty = 'easy' | 'medium' | 'hard'

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

export interface User {
  id: string
  displayName: string
  createdAt: string
  deskRoom: Room | null
  cooldownUntil: string | null
}

export interface Score {
  userId: string
  displayName: string
  totalPoints: number
  acceptedCount: number
  updatedAt: string
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
}

export interface AttemptSummary {
  id: string
  challengeId: string
  status: string
  pointsAwarded?: number
  confidence?: number | null
  reason?: string | null
}

export interface VerifyResult {
  status: 'accepted' | 'rejected' | 'error'
  pass: boolean
  confidence: number | null
  reason: string | null
  pointsAwarded: number
  retryable: boolean
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  totalPoints: number
  acceptedCount: number
  updatedAt: string
}

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

export interface FeedPost {
  id: string
  displayName: string
  isMine: boolean
  photoUrl: string
  challengeTitle: string
  room: Room
  vibe: Vibe
  points: number
  createdAt: string
  reactions: ReactionSummary[]
  comments: FeedComment[]
}

export type Screen =
  | 'boot'
  | 'onboarding'
  | 'challenges'
  | 'capture'
  | 'result'
  | 'leaderboard'
  | 'feed'
