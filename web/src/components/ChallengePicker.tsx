import { Plus, Shuffle, Upload } from 'lucide-react'
import { formatDuration, useCountdown } from '../countdown'
import type { Challenge } from '../types'
import { MenuButton } from './NavMenu'
import { RoomChip } from './RoomChip'

interface Props {
  challenges: Challenge[]
  freeChallenge: Challenge | null
  cooldownUntil: string | null
  scorePoints: number
  displayName: string
  busyId: string | null
  error: string | null
  onPick: (challenge: Challenge) => void
  onReshuffle: () => void
  onOpenMenu: () => void
  onOpenFeed: () => void
}

export function ChallengePicker({
  challenges,
  freeChallenge,
  cooldownUntil,
  scorePoints,
  displayName,
  busyId,
  error,
  onPick,
  onReshuffle,
  onOpenMenu,
  onOpenFeed,
}: Props) {
  const cooldownMs = useCountdown(cooldownUntil)
  const cooling = cooldownMs > 0

  return (
    <section className="screen challenges-screen" aria-labelledby="pick-title">
      <header className="topbar">
        <MenuButton onClick={onOpenMenu} />
        <div className="player-chip" aria-live="polite">
          <span className="player-name">{displayName}</span>
          <span className="player-score">{scorePoints} pts</span>
        </div>
      </header>

      <div className="screen-intro">
        <p className="eyebrow">Today&apos;s Moves</p>
        <h1 id="pick-title">{cooling ? 'You Moved' : 'Pick One'}</h1>
      </div>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      {cooling ? (
        <div className="cooldown-card" role="status" aria-live="polite">
          <p className="eyebrow">Recovering</p>
          <p className="cooldown-time">{formatDuration(cooldownMs)}</p>
          <p className="muted">
            Nice, you got up. Your next move unlocks when the timer ends. Go
            cheer someone on in the feed meanwhile.
          </p>
          <button type="button" className="primary-btn" onClick={onOpenFeed}>
            Open the feed
          </button>
        </div>
      ) : challenges.length === 0 ? (
        <div className="empty-state">
          <h2>All clear</h2>
          <p>You&apos;ve cleared every challenge in the catalog. Check the feed.</p>
          <button type="button" className="primary-btn" onClick={onOpenFeed}>
            Open the feed
          </button>
        </div>
      ) : (
        <>
          <ul className="challenge-list">
            {challenges.map((challenge, index) => (
              <li key={challenge.id} style={{ animationDelay: `${index * 60}ms` }}>
                <button
                  type="button"
                  className="challenge-card"
                  disabled={busyId !== null}
                  onClick={() => onPick(challenge)}
                >
                  <h2>{challenge.title}</h2>
                  <p>{challenge.prompt}</p>
                  <div className="card-foot">
                    <RoomChip room={challenge.room} />
                    <span className="card-cta">
                      {busyId === challenge.id ? 'Locking…' : 'Shoot this'}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="picker-actions">
            <button
              type="button"
              className="reshuffle-btn"
              onClick={onReshuffle}
              disabled={busyId !== null}
            >
              <Shuffle size={16} strokeWidth={2} />
              Reshuffle
            </button>
          </div>

          {freeChallenge ? (
            <button
              type="button"
              className="free-card"
              disabled={busyId !== null}
              onClick={() => onPick(freeChallenge)}
            >
              <span className="free-icon" aria-hidden="true">
                <Upload size={20} strokeWidth={2} />
              </span>
              <span className="free-text">
                <span className="free-title">
                  Share anything <Plus size={14} strokeWidth={2.5} />
                </span>
                <span className="free-sub">
                  Upload any photo and add a caption
                </span>
              </span>
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
