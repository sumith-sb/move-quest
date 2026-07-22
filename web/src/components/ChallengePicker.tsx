import type { Challenge, Difficulty } from '../types'

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

interface Props {
  challenges: Challenge[]
  remaining: number
  scorePoints: number
  displayName: string
  busyId: string | null
  error: string | null
  onPick: (challenge: Challenge) => void
  onRefresh: () => void
  onOpenBoard: () => void
}

export function ChallengePicker({
  challenges,
  remaining,
  scorePoints,
  displayName,
  busyId,
  error,
  onPick,
  onRefresh,
  onOpenBoard,
}: Props) {
  return (
    <section className="screen challenges-screen" aria-labelledby="pick-title">
      <header className="topbar">
        <div>
          <p className="eyebrow">Today&apos;s moves</p>
          <h1 id="pick-title">Pick one</h1>
        </div>
        <button type="button" className="ghost-btn" onClick={onOpenBoard}>
          Board
        </button>
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

      {challenges.length === 0 ? (
        <div className="empty-state">
          <h2>All clear</h2>
          <p>You&apos;ve cleared every challenge in the catalog. Check the board.</p>
          <button type="button" className="primary-btn" onClick={onOpenBoard}>
            View leaderboard
          </button>
        </div>
      ) : (
        <ul className="challenge-list">
          {challenges.map((challenge, index) => (
            <li key={challenge.id} style={{ animationDelay: `${index * 80}ms` }}>
              <button
                type="button"
                className={`challenge-card difficulty-${challenge.difficulty}`}
                disabled={busyId !== null}
                onClick={() => onPick(challenge)}
              >
                <div className="card-meta">
                  <span className="diff-pill">{DIFF_LABEL[challenge.difficulty]}</span>
                  <span className="points-stamp">+{challenge.points}</span>
                </div>
                <h2>{challenge.title}</h2>
                <p>{challenge.prompt}</p>
                <span className="card-cta">
                  {busyId === challenge.id ? 'Locking…' : 'Shoot this'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="screen-footer">
        <p className="muted">{remaining} challenges left in the pool</p>
        <button type="button" className="text-btn" onClick={onRefresh} disabled={busyId !== null}>
          Shuffle three
        </button>
      </footer>
    </section>
  )
}
