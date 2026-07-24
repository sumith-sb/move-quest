import { Shuffle } from 'lucide-react'
import { iconForChallenge } from '../challengeIcon'
import { cue } from '../feedback'
import type { Challenge } from '../types'

interface Props {
  challenges: Challenge[]
  remaining: number
  scorePoints: number
  displayName: string
  busyId: string | null
  error: string | null
  onPick: (challenge: Challenge) => void
  onReshuffle: () => void
  onOpenFeed: () => void
}

export function ChallengePicker({
  challenges,
  remaining,
  scorePoints,
  displayName,
  busyId,
  error,
  onPick,
  onReshuffle,
  onOpenFeed,
}: Props) {
  return (
    <section className="screen challenges-screen" aria-labelledby="pick-title">
      <header className="topbar">
        <div className="player-chip" aria-live="polite">
          <span className="player-name">{displayName}</span>
          <span className="player-score">{scorePoints} pts</span>
        </div>
      </header>

      <div className="screen-intro">
        <p className="eyebrow">Today&apos;s Moves</p>
        <h1 id="pick-title">Pick One</h1>
        {remaining > 0 ? (
          <p className="muted">{remaining} challenges left in the catalog</p>
        ) : null}
      </div>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      {challenges.length === 0 ? (
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
            {challenges.map((challenge, index) => {
              const Icon = iconForChallenge(challenge)
              return (
                <li key={challenge.id} style={{ animationDelay: `${index * 60}ms` }}>
                  <button
                    type="button"
                    className="challenge-card"
                    disabled={busyId !== null}
                    onClick={() => onPick(challenge)}
                  >
                    <span className="card-icon" aria-hidden="true">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <h2>{challenge.title}</h2>
                    <p>{challenge.prompt}</p>
                    <div className="card-foot">
                      <span className="card-cta">
                        {busyId === challenge.id ? 'Locking…' : 'Shoot this'}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="picker-actions">
            <button
              type="button"
              className="reshuffle-btn"
              onClick={() => {
                cue.nav()
                onReshuffle()
              }}
              disabled={busyId !== null}
            >
              <Shuffle size={16} strokeWidth={2} />
              Reshuffle
            </button>
          </div>
        </>
      )}
    </section>
  )
}
