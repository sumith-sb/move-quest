import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchLeaderboard, subscribeLeaderboard } from '../api'
import type { LeaderboardEntry } from '../types'
import { MenuButton } from './NavMenu'

interface Props {
  userId: string
  onOpenMenu: () => void
}

/** ms until the next Monday 00:00 UTC (the weekly reset boundary). */
function msUntilReset(now = Date.now()): number {
  const d = new Date(now)
  const daysUntilMonday = ((8 - d.getUTCDay()) % 7) || 7
  const next = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + daysUntilMonday,
  )
  return next - now
}

function formatReset(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const MEDAL = ['rank-gold', 'rank-silver', 'rank-bronze']

export function LeaderboardScreen({ userId, onOpenMenu }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [resetMs, setResetMs] = useState(() => msUntilReset())

  useEffect(() => {
    const id = setInterval(() => setResetMs(msUntilReset()), 60000)
    return () => clearInterval(id)
  }, [])

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
          setError(null)
        }
      },
      () => {},
    )
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const [top, rest] = [entries.slice(0, 3), entries.slice(3)]

  return (
    <section className="screen board-screen" aria-labelledby="board-title">
      <header className="topbar">
        <MenuButton onClick={onOpenMenu} />
        <span className="reset-chip">
          <Clock size={14} strokeWidth={2} aria-hidden="true" />
          Resets in {formatReset(resetMs)}
        </span>
      </header>

      <h1 id="board-title">This Week</h1>
      <p className="lede">Points reset every Monday. Reactions on your posts count too.</p>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <div className="empty-state">
          <h2>No scores yet</h2>
          <p>Be first on the board, go snap a challenge.</p>
        </div>
      ) : (
        <>
          {top.length > 0 ? (
            <ol className="podium">
              {top.map((entry, i) => {
                const mine = entry.userId === userId
                return (
                  <li key={entry.userId} className={`podium-slot ${MEDAL[i]} ${mine ? 'is-me' : ''}`}>
                    <span className="podium-rank">{entry.rank}</span>
                    <span className="podium-name">
                      {entry.displayName}
                      {mine ? ' · you' : ''}
                    </span>
                    <span className="podium-points">{entry.totalPoints}</span>
                    <span className="podium-sub">{entry.acceptedCount} moves</span>
                  </li>
                )
              })}
            </ol>
          ) : null}

          {rest.length > 0 ? (
            <ol className="board-list">
              {rest.map((entry) => {
                const mine = entry.userId === userId
                return (
                  <li key={entry.userId} className={mine ? 'is-me' : undefined}>
                    <span className="rank">{entry.rank}</span>
                    <div className="board-main">
                      <strong>
                        {entry.displayName}
                        {mine ? ' · you' : ''}
                      </strong>
                      <span className="muted">{entry.acceptedCount} moves</span>
                    </div>
                    <span className="board-points">{entry.totalPoints}</span>
                  </li>
                )
              })}
            </ol>
          ) : null}
        </>
      )}
    </section>
  )
}
