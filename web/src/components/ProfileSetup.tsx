import { useState, type FormEvent } from 'react'

interface Props {
  busy: boolean
  error: string | null
  onSubmit: (displayName: string) => void
  onSignOut: () => void
}

export function ProfileSetup({ busy, error, onSubmit, onSignOut }: Props) {
  const [name, setName] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(name.trim())
  }

  return (
    <section className="screen onboarding-screen" aria-labelledby="profile-title">
      <p className="eyebrow">Almost there</p>
      <h1 id="profile-title">Pick a display name</h1>
      <p className="lede">
        This name appears on the leaderboard and social feed. Photos you clear
        will be visible to other teammates.
      </p>

      <form className="name-form" onSubmit={handleSubmit}>
        <label htmlFor="display-name">Display name</label>
        <input
          id="display-name"
          name="displayName"
          autoComplete="nickname"
          maxLength={30}
          placeholder="e.g. StreetFox"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          required
        />
        {error ? (
          <p className="banner error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="primary-btn"
          disabled={busy || name.trim().length < 1}
        >
          {busy ? 'Saving…' : 'Start moving'}
        </button>
      </form>

      <button type="button" className="text-btn" onClick={onSignOut} disabled={busy}>
        Sign out
      </button>
    </section>
  )
}
