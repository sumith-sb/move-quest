import { useEffect, useState } from 'react'
import { fetchLeaderboard, subscribeLeaderboard } from '../api'
import type { LeaderboardEntry } from '../types'

interface Props {
  userId: string
  onBack: () => void
  onFeed: () => void
}

export function LeaderboardScreen({ userId, onBack, onFeed }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLeaderboard()
      .then((data) => {
        if (!cancelled) setEntries(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    const unsubscribe = subscribeLeaderboard(
      (data) => {
        if (!cancelled) {
          setEntries(data)
          setLive(true)
          setError(null)
        }
      },
      () => {
        if (!cancelled) setLive(false)
      },
    )

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return (
    <section className="screen board-screen" aria-labelledby="board-title">
      <header className="topbar">
        <button type="button" className="ghost-btn" onClick={onBack}>
          Back
        </button>
        <div className="nav-actions">
          <span className={`live-pill ${live ? 'on' : ''}`} aria-live="polite">
            {live ? 'Live' : 'Connecting'}
          </span>
          <button type="button" className="ghost-btn" onClick={onFeed}>
            Feed
          </button>
        </div>
      </header>

      <h1 id="board-title">Leaderboard</h1>
      <p className="lede">Points update the moment someone clears a challenge.</p>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div className="empty-state">
          <h2>No scores yet</h2>
          <p>Be first on the board — go snap a challenge.</p>
        </div>
      ) : (
        <ol className="board-list">
          {entries.map((entry, index) => {
            const mine = entry.userId === userId
            return (
              <li
                key={entry.userId}
                className={mine ? 'is-me' : undefined}
                style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
              >
                <span className="rank">#{entry.rank}</span>
                <div className="board-main">
                  <strong>
                    {entry.displayName}
                    {mine ? ' (you)' : ''}
                  </strong>
                  <span className="muted">{entry.acceptedCount} cleared</span>
                </div>
                <span className="board-points">{entry.totalPoints}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
