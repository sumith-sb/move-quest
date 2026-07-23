import { useEffect, useState } from 'react'

export function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Ticks once a second, returning ms left until `until` (0 when passed/null). */
export function useCountdown(until: string | null): number {
  const [remaining, setRemaining] = useState(() =>
    until ? Math.max(0, new Date(until).getTime() - Date.now()) : 0,
  )
  useEffect(() => {
    if (!until) {
      setRemaining(0)
      return
    }
    const tick = () =>
      setRemaining(Math.max(0, new Date(until).getTime() - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [until])
  return remaining
}
