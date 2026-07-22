import { formatDuration, useCountdown } from '../countdown'
import { DIFFICULTY_LABEL, ROOM_EMOJI, ROOM_LABEL } from '../labels'
import type { Challenge } from '../types'

interface Props {
  challenges: Challenge[]
  remaining: number
  cooldownUntil: string | null
  scorePoints: number
  displayName: string
  busyId: string | null
  error: string | null
  onPick: (challenge: Challenge) => void
  onOpenBoard: () => void
  onOpenFeed: () => void
}

export function ChallengePicker({
  challenges,
  remaining,
  cooldownUntil,
  scorePoints,
  displayName,
  busyId,
  error,
  onPick,
  onOpenBoard,
  onOpenFeed,
}: Props) {
  const cooldownMs = useCountdown(cooldownUntil)
  const cooling = cooldownMs > 0

  return (
    <section className="screen challenges-screen" aria-labelledby="pick-title">
      <header className="topbar">
        <div>
          <p className="eyebrow">Today&apos;s Moves</p>
          <h1 id="pick-title">{cooling ? 'You Moved' : 'Pick One'}</h1>
        </div>
        <div className="nav-actions">
          <button type="button" className="ghost-btn" onClick={onOpenFeed}>
            Feed
          </button>
          <button type="button" className="ghost-btn" onClick={onOpenBoard}>
            Board
          </button>
        </div>
      </header>

      <div className="player-chip" aria-live="polite">
        <span className="player-name">{displayName}</span>
        <span className="player-score">{scorePoints} pts</span>
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
            Nice — you got up. Your next move unlocks when the timer ends. Go
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
        <ul className="challenge-list">
          {challenges.map((challenge, index) => (
            <li key={challenge.id} style={{ animationDelay: `${index * 60}ms` }}>
              <button
                type="button"
                className={`challenge-card difficulty-${challenge.difficulty}`}
                disabled={busyId !== null}
                onClick={() => onPick(challenge)}
              >
                <div className="card-meta">
                  <span className="diff-pill">
                    {DIFFICULTY_LABEL[challenge.difficulty]}
                  </span>
                  <span className="points-stamp">+{challenge.points}</span>
                </div>
                <h2>{challenge.title}</h2>
                <p>{challenge.prompt}</p>
                <div className="card-foot">
                  <span className="room-chip">
                    <span aria-hidden="true">{ROOM_EMOJI[challenge.room]}</span>
                    {ROOM_LABEL[challenge.room]}
                  </span>
                  <span className="card-cta">
                    {busyId === challenge.id ? 'Locking…' : 'Shoot this'}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!cooling && challenges.length > 0 ? (
        <footer className="screen-footer">
          <p className="muted">{remaining} challenges left in the pool</p>
        </footer>
      ) : null}
    </section>
  )
}
