import { useState, type FormEvent } from 'react'

interface Props {
  busy: boolean
  error: string | null
  onSubmit: (displayName: string) => void
}

export function Onboarding({ busy, error, onSubmit }: Props) {
  const [name, setName] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(name.trim())
  }

  return (
    <section className="screen onboarding-screen" aria-labelledby="brand-title">
      <div className="hero-mark" aria-hidden="true" />
      <p className="brand">Move Quest</p>
      <h1 id="brand-title">Get up. Snap it. Score.</h1>
      <p className="lede">
        Three random photo challenges. Take a live photo and climb the board.
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
        <button type="submit" className="primary-btn" disabled={busy || name.trim().length < 1}>
          {busy ? 'Joining…' : 'Start moving'}
        </button>
      </form>
    </section>
  )
}
