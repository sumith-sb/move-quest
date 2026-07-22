import { useState, type FormEvent } from 'react'
import { DESK_ROOMS, ROOM_EMOJI, ROOM_LABEL } from '../labels'
import type { Room } from '../types'

interface Props {
  busy: boolean
  error: string | null
  onSubmit: (displayName: string, deskRoom: Room | null) => void
}

export function Onboarding({ busy, error, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [deskRoom, setDeskRoom] = useState<Room | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(name.trim(), deskRoom)
  }

  return (
    <section className="screen onboarding-screen" aria-labelledby="brand-title">
      <div className="hero-mark" aria-hidden="true" />
      <p className="brand">Move Quest</p>
      <h1 id="brand-title">Get Up. Snap It. Score.</h1>
      <p className="lede">
        Three photo challenges a day — easy, medium, hard — that get you off your
        chair and moving. Share the shot, cheer the team on.
      </p>

      <form className="name-form" onSubmit={handleSubmit}>
        <label htmlFor="display-name">Display name</label>
        <input
          id="display-name"
          name="displayName"
          autoComplete="nickname"
          maxLength={30}
          placeholder="e.g. Emre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          required
        />

        <fieldset className="room-picker" disabled={busy}>
          <legend>Where&apos;s your desk?</legend>
          <p className="room-picker-hint">
            We&apos;ll never send you a challenge here — the whole point is to
            get you somewhere else.
          </p>
          <div className="room-options" role="radiogroup" aria-label="Your desk room">
            {DESK_ROOMS.map((room) => (
              <button
                key={room}
                type="button"
                role="radio"
                aria-checked={deskRoom === room}
                className={`room-option ${deskRoom === room ? 'selected' : ''}`}
                onClick={() => setDeskRoom((cur) => (cur === room ? null : room))}
              >
                <span aria-hidden="true">{ROOM_EMOJI[room]}</span>
                {ROOM_LABEL[room]}
              </button>
            ))}
          </div>
        </fieldset>

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
          {busy ? 'Joining…' : 'Start moving'}
        </button>
      </form>
    </section>
  )
}
