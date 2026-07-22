import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearStoredUserId,
  createProfile,
  drawChallenges,
  fetchFeed,
  fetchMe,
  loadStoredUserId,
  selectChallenge,
  storeUserId,
  verifyAttempt,
} from './api'
import { playChime } from './chime'
import { CaptureScreen } from './components/CaptureScreen'
import { ChallengePicker } from './components/ChallengePicker'
import { FeedScreen } from './components/FeedScreen'
import { LeaderboardScreen } from './components/LeaderboardScreen'
import { NavMenu } from './components/NavMenu'
import { Onboarding } from './components/Onboarding'
import { ResultScreen } from './components/ResultScreen'
import { SettingsScreen } from './components/SettingsScreen'
import {
  applyTheme,
  loadSettings,
  notify,
  saveSettings,
  type Settings,
} from './settings'
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
  const [freeChallenge, setFreeChallenge] = useState<Challenge | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [attempt, setAttempt] = useState<AttemptSummary | null>(null)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const screenRef = useRef<Screen>(screen)
  screenRef.current = screen
  const seenFeedIds = useRef<Set<string> | null>(null)

  const refreshDraw = useCallback(async (userId: string) => {
    const drawn = await drawChallenges(userId)
    setChallenges(drawn.challenges)
    setFreeChallenge(drawn.freeChallenge)
    setCooldownUntil(drawn.cooldownUntil)
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

  // Movement reminder: ring + notify the moment the cooldown ends.
  useEffect(() => {
    if (!settings.reminderEnabled || !cooldownUntil) return
    const ms = new Date(cooldownUntil).getTime() - Date.now()
    if (ms <= 0) return
    const id = window.setTimeout(() => {
      if (settings.soundEnabled) playChime()
      notify('Time to move', 'Your next Move Quest is ready.')
    }, ms)
    return () => window.clearTimeout(id)
  }, [settings.reminderEnabled, settings.soundEnabled, cooldownUntil])

  // Apply the theme, and follow the OS while on "system".
  useEffect(() => {
    applyTheme(settings.theme)
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  // Poll the feed and notify when a teammate posts a new move (foreground only;
  // a real background push would need a service worker).
  useEffect(() => {
    const userId = user?.id
    if (!userId || !settings.feedNotify) return
    let cancelled = false
    let timer: number | undefined
    async function poll() {
      try {
        const feed = await fetchFeed(userId!)
        if (cancelled) return
        const ids = new Set(feed.map((p) => p.id))
        if (seenFeedIds.current === null) {
          seenFeedIds.current = ids // seed on first poll; don't notify for backlog
        } else {
          const fresh = feed.filter((p) => !seenFeedIds.current!.has(p.id) && !p.isMine)
          seenFeedIds.current = ids
          if (fresh.length > 0 && screenRef.current !== 'feed') {
            const first = fresh[0]
            notify(
              fresh.length === 1
                ? `${first.displayName} posted a move`
                : `${fresh.length} new moves on the feed`,
              fresh.length === 1 ? first.challengeTitle : 'Open Move Quest to see them',
            )
          }
        }
      } catch {
        // Ignore transient failures.
      }
      if (!cancelled) timer = window.setTimeout(poll, 45000)
    }
    void poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [user?.id, settings.feedNotify])

  function updateSettings(next: Settings) {
    setSettings(next)
    saveSettings(next)
  }

  function navigate(next: Screen) {
    setMenuOpen(false)
    setError(null)
    if (next === 'challenges') {
      void goChallenges()
    } else {
      setScreen(next)
    }
  }

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

  async function handleSubmit(file: File, caption: string, sharedToFeed: boolean) {
    if (!user || !attempt) return
    setBusy(true)
    setError(null)
    try {
      const verified = await verifyAttempt(user.id, attempt.id, file, caption, sharedToFeed)
      setAttempt(verified.attempt)
      setActiveChallenge(verified.challenge)
      setResult(verified.result)
      if (verified.result.status === 'accepted') {
        const me = await fetchMe(user.id)
        setScore(me.score)
        setUser(me.user)
        setCooldownUntil(me.user.cooldownUntil)
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
      const [me] = await Promise.all([fetchMe(user.id), refreshDraw(user.id)])
      setScore(me.score)
      setUser(me.user)
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
          freeChallenge={freeChallenge}
          cooldownUntil={cooldownUntil}
          scorePoints={score.totalPoints}
          displayName={user.displayName}
          busyId={busyId}
          error={error}
          onPick={handlePick}
          onReshuffle={() => void refreshDraw(user.id)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenFeed={() => setScreen('feed')}
        />
      ) : null}

      {screen === 'capture' && activeChallenge ? (
        <CaptureScreen
          challenge={activeChallenge}
          busy={busy}
          error={error}
          onBack={() => void goChallenges()}
          onSubmit={(file, caption, shared) => void handleSubmit(file, caption, shared)}
        />
      ) : null}

      {screen === 'result' && activeChallenge && result ? (
        <ResultScreen
          challenge={activeChallenge}
          result={result}
          cooldownUntil={cooldownUntil}
          onRetry={() => {
            setError(null)
            setScreen('capture')
          }}
          onNext={() => void goChallenges()}
          onBoard={() => setScreen('leaderboard')}
          onFeed={() => setScreen('feed')}
        />
      ) : null}

      {screen === 'leaderboard' && user ? (
        <LeaderboardScreen userId={user.id} onOpenMenu={() => setMenuOpen(true)} />
      ) : null}

      {screen === 'feed' && user ? (
        <FeedScreen userId={user.id} onOpenMenu={() => setMenuOpen(true)} />
      ) : null}

      {screen === 'settings' && user ? (
        <SettingsScreen
          user={user}
          settings={settings}
          onChange={updateSettings}
          onOpenMenu={() => setMenuOpen(true)}
        />
      ) : null}

      <NavMenu
        open={menuOpen}
        current={screen}
        onNavigate={navigate}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  )
}
