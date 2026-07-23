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
  displayName: string | null
  emailDomain: string
  isActive: boolean
  createdAt: string
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
  points: number
  room?: Room
  vibe?: Vibe
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

export interface FeedItem {
  attemptId: string
  userId: string
  displayName: string
  challengeId: string
  challengeTitle: string
  challengePrompt: string
  pointsAwarded: number
  photoPath: string
  photoUrl: string | null
  awardedAt: string
}

export type Screen =
  | 'boot'
  | 'auth'
  | 'confirm'
  | 'profile'
  | 'challenges'
  | 'capture'
  | 'result'
  | 'leaderboard'
  | 'feed'
  | 'settings'
