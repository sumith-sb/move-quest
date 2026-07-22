export type Difficulty = 'easy' | 'medium' | 'hard'

export interface User {
  id: string
  displayName: string
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

export type Screen =
  | 'boot'
  | 'onboarding'
  | 'challenges'
  | 'capture'
  | 'result'
  | 'leaderboard'
