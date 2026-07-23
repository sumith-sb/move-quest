import { useState, type FormEvent } from 'react'

interface Props {
  busy: boolean
  error: string | null
  notice: string | null
  onSignIn: (email: string, password: string) => void
  onSignUp: (email: string, password: string) => void
  onReset: (email: string) => void
}

export function AuthScreen({
  busy,
  error,
  notice,
  onSignIn,
  onSignUp,
  onReset,
}: Props) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'signin') onSignIn(email, password)
    else if (mode === 'signup') onSignUp(email, password)
    else onReset(email)
  }

  return (
    <section className="screen onboarding-screen" aria-labelledby="brand-title">
      <div className="hero-mark" aria-hidden="true" />
      <p className="brand">Move Quest</p>
      <h1 id="brand-title">Get up. Snap it. Score.</h1>
      <p className="lede">
        Team photo challenges with live camera capture. Sign in with your work
        email to join the board and feed.
      </p>

      <form className="name-form" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@goodspeed.studio"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          required
        />

        {mode !== 'reset' ? (
          <>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
            />
          </>
        ) : null}

        {error ? (
          <p className="banner error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="banner notice" role="status">
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          className="primary-btn"
          disabled={busy || email.trim().length < 3}
        >
          {busy
            ? 'Working…'
            : mode === 'signin'
              ? 'Sign in'
              : mode === 'signup'
                ? 'Create account'
                : 'Send reset link'}
        </button>
      </form>

      <div className="action-stack">
        {mode !== 'signin' ? (
          <button type="button" className="text-btn" onClick={() => setMode('signin')}>
            Back to sign in
          </button>
        ) : null}
        {mode === 'signin' ? (
          <>
            <button type="button" className="text-btn" onClick={() => setMode('signup')}>
              Need an account? Sign up
            </button>
            <button type="button" className="text-btn" onClick={() => setMode('reset')}>
              Forgot password?
            </button>
          </>
        ) : null}
      </div>
    </section>
  )
}
