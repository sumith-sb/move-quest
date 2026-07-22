import { useEffect } from 'react'
import type { Screen } from '../types'

interface Props {
  open: boolean
  current: Screen
  onNavigate: (screen: Screen) => void
  onClose: () => void
}

const ITEMS: { screen: Screen; label: string; emoji: string }[] = [
  { screen: 'challenges', label: 'Challenges', emoji: '🎯' },
  { screen: 'feed', label: 'Feed', emoji: '🗂' },
  { screen: 'leaderboard', label: 'Leaderboard', emoji: '🏆' },
  { screen: 'settings', label: 'Settings', emoji: '⚙️' },
]

export function NavMenu({ open, current, onNavigate, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="nav-overlay" onClick={onClose}>
      <nav
        className="nav-sheet"
        aria-label="Main menu"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="nav-sheet-title">Move Quest</p>
        <ul>
          {ITEMS.map((item) => (
            <li key={item.screen}>
              <button
                type="button"
                className={`nav-item ${current === item.screen ? 'active' : ''}`}
                onClick={() => onNavigate(item.screen)}
              >
                <span aria-hidden="true" className="nav-item-emoji">
                  {item.emoji}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

interface MenuButtonProps {
  onClick: () => void
}

export function MenuButton({ onClick }: MenuButtonProps) {
  return (
    <button
      type="button"
      className="menu-btn"
      onClick={onClick}
      aria-label="Open menu"
    >
      <span />
      <span />
      <span />
    </button>
  )
}
