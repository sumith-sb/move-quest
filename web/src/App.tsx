import { useCallback, useEffect, useState } from 'react'
import {
  clearStoredUserId,
  createProfile,
  drawChallenges,
  fetchMe,
  loadStoredUserId,
  selectChallenge,
  storeUserId,
  verifyAttempt,
} from './api'
import { CaptureScreen } from './components/CaptureScreen'
import { ChallengePicker } from './components/ChallengePicker'
import { LeaderboardScreen } from './components/LeaderboardScreen'
import { Onboarding } from './components/Onboarding'
import { ResultScreen } from './components/ResultScreen'
import type {
  AttemptSummary,
  Challenge,
  Score,
  Screen,
  User,
  VerifyResult,
} from './types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('boot')
  const [user, setUser] = useState<User | null>(null)
  const [score, setScore] = useState<Score | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [remaining, setRemaining] = useState(0)
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [attempt, setAttempt] = useState<AttemptSummary | null>(null)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshDraw = useCallback(async (userId: string) => {
    const drawn = await drawChallenges(userId)
    setChallenges(drawn.challenges)
    setRemaining(drawn.remaining)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const stored = loadStoredUserId()
      if (!stored) {
        if (!cancelled) setScreen('onboarding')
        return
      }
      try {
        const me = await fetchMe(stored)
        if (cancelled) return
        setUser(me.user)
        setScore(me.score)
        await refreshDraw(me.user.id)
        if (!cancelled) setScreen('challenges')
      } catch {
        clearStoredUserId()
        if (!cancelled) setScreen('onboarding')
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [refreshDraw])

  async function handleJoin(displayName: string) {
    setBusy(true)
    setError(null)
    try {
      const created = await createProfile(displayName)
      storeUserId(created.id)
      setUser(created)
      setScore({
        userId: created.id,
        displayName: created.displayName,
        totalPoints: 0,
        acceptedCount: 0,
        updatedAt: created.createdAt,
      })
      await refreshDraw(created.id)
      setScreen('challenges')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join')
    } finally {
      setBusy(false)
    }
  }

  async function handlePick(challenge: Challenge) {
    if (!user) return
    setBusyId(challenge.id)
    setError(null)
    try {
      const selected = await selectChallenge(user.id, challenge.id)
      setActiveChallenge(selected.challenge)
      setAttempt(selected.attempt)
      setResult(null)
      setScreen('capture')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not select challenge')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSubmit(file: File) {
    if (!user || !attempt) return
    setBusy(true)
    setError(null)
    try {
      const verified = await verifyAttempt(user.id, attempt.id, file)
      setAttempt(verified.attempt)
      setActiveChallenge(verified.challenge)
      setResult(verified.result)
      if (verified.result.status === 'accepted') {
        const me = await fetchMe(user.id)
        setScore(me.score)
      }
      setScreen('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function goChallenges() {
    if (!user) return
    setError(null)
    setResult(null)
    setActiveChallenge(null)
    setAttempt(null)
    try {
      await refreshDraw(user.id)
      setScreen('challenges')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load challenges')
      setScreen('challenges')
    }
  }

  if (screen === 'boot') {
    return (
      <div className="app-shell">
        <p className="boot-msg" role="status">
          Loading Move Quest…
        </p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {screen === 'onboarding' ? (
        <Onboarding busy={busy} error={error} onSubmit={handleJoin} />
      ) : null}

      {screen === 'challenges' && user && score ? (
        <ChallengePicker
          challenges={challenges}
          remaining={remaining}
          scorePoints={score.totalPoints}
          displayName={user.displayName}
          busyId={busyId}
          error={error}
          onPick={handlePick}
          onRefresh={() => void goChallenges()}
          onOpenBoard={() => setScreen('leaderboard')}
        />
      ) : null}

      {screen === 'capture' && activeChallenge ? (
        <CaptureScreen
          challenge={activeChallenge}
          busy={busy}
          error={error}
          onBack={() => void goChallenges()}
          onSubmit={(file) => void handleSubmit(file)}
        />
      ) : null}

      {screen === 'result' && activeChallenge && result ? (
        <ResultScreen
          challenge={activeChallenge}
          result={result}
          onRetry={() => {
            setError(null)
            setScreen('capture')
          }}
          onNext={() => void goChallenges()}
          onBoard={() => setScreen('leaderboard')}
        />
      ) : null}

      {screen === 'leaderboard' && user ? (
        <LeaderboardScreen userId={user.id} onBack={() => void goChallenges()} />
      ) : null}
    </div>
  )
}
