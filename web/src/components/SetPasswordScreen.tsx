import { useState, type FormEvent } from 'react'

interface Props {
  busy: boolean
  error: string | null
  onSubmit: (password: string) => void
}

export function SetPasswordScreen({ busy, error, onSubmit }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && password !== confirm
  const tooShort = password.length > 0 && password.length < 8
  const ready = password.length >= 8 && password === confirm

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    onSubmit(password)
  }

  return (
    <section className="screen onboarding-screen" aria-labelledby="set-password-title">
      <p className="eyebrow">Secure your account</p>
      <h1 id="set-password-title">Choose a password</h1>
      <p className="lede">
        Pick a password you&apos;ll use to sign in on this phone and other devices.
        At least 8 characters.
      </p>

      <form className="name-form" onSubmit={handleSubmit}>
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          required
        />

        <label htmlFor="confirm-password">Confirm password</label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={busy}
          required
        />

        {tooShort ? (
          <p className="banner error" role="alert">
            Password must be at least 8 characters.
          </p>
        ) : null}
        {mismatch ? (
          <p className="banner error" role="alert">
            Passwords do not match.
          </p>
        ) : null}
        {error ? (
          <p className="banner error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="primary-btn" disabled={busy || !ready}>
          {busy ? 'Saving…' : 'Save password & continue'}
        </button>
      </form>
    </section>
  )
}
