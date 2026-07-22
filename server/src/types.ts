export type Difficulty = 'easy' | 'medium' | 'hard'

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
  points: number
  criteria: Criterion[]
  active: boolean
}

export interface User {
  id: string
  displayName: string
  createdAt: string
}

export interface Attempt {
  id: string
  userId: string
  challengeId: string
  status: AttemptStatus
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

export interface StoreData {
  users: User[]
  attempts: Attempt[]
  scores: Score[]
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
  points: number
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  totalPoints: number
  acceptedCount: number
  updatedAt: string
}
