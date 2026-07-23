import { useCallback, useEffect, useState } from 'react'
import {
  claimDisplayName,
  drawChallenges,
  fetchProfile,
  requestPasswordReset,
  selectChallenge,
  signIn,
  signOut,
  signUp,
  verifyAttempt,
} from './api'
import { cue, setFeedbackEnabled } from './feedback'
import { AuthScreen } from './components/AuthScreen'
import { CaptureScreen } from './components/CaptureScreen'
import { ChallengePicker } from './components/ChallengePicker'
import { ConfirmScreen } from './components/ConfirmScreen'
import { FeedScreen } from './components/FeedScreen'
import { LeaderboardScreen } from './components/LeaderboardScreen'
import { NavMenu } from './components/NavMenu'
import { ProfileSetup } from './components/ProfileSetup'
import { ResultScreen } from './components/ResultScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { supabase } from './lib/supabase'
import { applyTheme, loadSettings, saveSettings, type Settings } from './settings'
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
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(loadSettings)

  const refreshDraw = useCallback(async () => {
    const drawn = await drawChallenges()
    setChallenges(drawn.challenges)
    setRemaining(drawn.remaining)
  }, [])

  const enterApp = useCallback(
    async (profile: User, nextScore: Score) => {
      setUser(profile)
      setScore(nextScore)
      if (!profile.displayName) {
        setScreen('profile')
        return
      }
      await refreshDraw()
      setScreen('challenges')
    },
    [refreshDraw],
  )

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) {
        setScreen('auth')
        return
      }
      try {
        const me = await fetchProfile()
        if (cancelled) return
        if (!me) {
          setScreen('auth')
          return
        }
        if (!me.user.isActive) {
          setError('Your account is deactivated.')
          await signOut()
          setScreen('auth')
          return
        }
        await enterApp(me.user, me.score)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load profile')
          setScreen('auth')
        }
      }
    }
    void boot()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        setScore(null)
        setScreen('auth')
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [enterApp])

  useEffect(() => {
    applyTheme(settings.theme)
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  useEffect(() => {
    setFeedbackEnabled(settings.uiFeedback)
  }, [settings.uiFeedback])

  function updateSettings(next: Settings) {
    setSettings(next)
    saveSettings(next)
  }

  function openMenu() {
    cue.tick()
    setMenuOpen(true)
  }

  function navigate(next: Screen) {
    cue.nav()
    setMenuOpen(false)
    setError(null)
    if (next === 'challenges') {
      void goChallenges()
    } else {
      setScreen(next)
    }
  }

  async function handleSignIn(email: string, password: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await signIn(email, password)
      const me = await fetchProfile()
      if (!me) throw new Error('Profile not found')
      if (!me.user.isActive) throw new Error('Your account is deactivated.')
      await enterApp(me.user, me.score)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSignUp(email: string, password: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const data = await signUp(email, password)
      if (data.session) {
        const me = await fetchProfile()
        if (me) {
          await enterApp(me.user, me.score)
          return
        }
      }
      setPendingEmail(email)
      setScreen('confirm')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      if (message.toLowerCase().includes('domain') || message.includes('EMAIL_DOMAIN')) {
        setError('That email domain is not allowed for this team app.')
      } else {
        setError(message)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(email: string) {
    setBusy(true)
    setError(null)
    try {
      await requestPasswordReset(email)
      setNotice('Password reset email sent if that account exists.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleProfile(displayName: string) {
    setBusy(true)
    setError(null)
    try {
      const updated = await claimDisplayName(displayName)
      const me = await fetchProfile()
      if (!me) throw new Error('Profile missing')
      await enterApp(updated, me.score)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save name')
    } finally {
      setBusy(false)
    }
  }

  async function handlePick(challenge: Challenge) {
    cue.select()
    setBusyId(challenge.id)
    setError(null)
    try {
      const selected = await selectChallenge(challenge.id)
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
    if (!attempt) return
    setBusy(true)
    setError(null)
    try {
      const verified = await verifyAttempt(attempt.id, file)
      setResult(verified)
      if (verified.status === 'accepted') {
        cue.success()
        const me = await fetchProfile()
        if (me) {
          setScore(me.score)
          setUser(me.user)
        }
      } else {
        cue.error()
      }
      setScreen('result')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(
        message === 'Load failed' || message === 'Failed to fetch'
          ? 'Could not reach the verifier (network/CORS). Check you’re online and verify-photo is deployed.'
          : message,
      )
    } finally {
      setBusy(false)
    }
  }

  async function goChallenges() {
    setError(null)
    setResult(null)
    setActiveChallenge(null)
    setAttempt(null)
    try {
      const me = await fetchProfile()
      if (me) {
        setScore(me.score)
        setUser(me.user)
      }
      await refreshDraw()
      setScreen('challenges')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load challenges')
      setScreen('challenges')
    }
  }

  async function handleSignOut() {
    await signOut()
    setUser(null)
    setScore(null)
    setMenuOpen(false)
    setScreen('auth')
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
      {screen === 'auth' ? (
        <AuthScreen
          busy={busy}
          error={error}
          notice={notice}
          onSignIn={(e, p) => void handleSignIn(e, p)}
          onSignUp={(e, p) => void handleSignUp(e, p)}
          onReset={(e) => void handleReset(e)}
        />
      ) : null}

      {screen === 'confirm' ? (
        <ConfirmScreen
          email={pendingEmail}
          onBack={() => {
            setError(null)
            setScreen('auth')
          }}
        />
      ) : null}

      {screen === 'profile' ? (
        <ProfileSetup
          busy={busy}
          error={error}
          onSubmit={(name) => void handleProfile(name)}
          onSignOut={() => void handleSignOut()}
        />
      ) : null}

      {screen === 'challenges' && user && score ? (
        <ChallengePicker
          challenges={challenges}
          remaining={remaining}
          scorePoints={score.totalPoints}
          displayName={user.displayName ?? 'Player'}
          busyId={busyId}
          error={error}
          onPick={handlePick}
          onReshuffle={() => void goChallenges()}
          onOpenMenu={openMenu}
          onOpenFeed={() => setScreen('feed')}
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
          onFeed={() => setScreen('feed')}
        />
      ) : null}

      {screen === 'leaderboard' && user ? (
        <LeaderboardScreen userId={user.id} onOpenMenu={openMenu} />
      ) : null}

      {screen === 'feed' && user ? (
        <FeedScreen userId={user.id} onOpenMenu={openMenu} />
      ) : null}

      {screen === 'settings' && user ? (
        <SettingsScreen
          user={user}
          settings={settings}
          onChange={updateSettings}
          onOpenMenu={openMenu}
          onSignOut={() => void handleSignOut()}
        />
      ) : null}

      {user && !['auth', 'confirm', 'profile', 'boot'].includes(screen) ? (
        <NavMenu
          open={menuOpen}
          current={screen}
          onNavigate={navigate}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  )
}
