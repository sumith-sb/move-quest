import { Images, type LucideIcon, Menu, Settings, Target, Trophy, X } from 'lucide-react'
import { useEffect } from 'react'
import type { Screen } from '../types'

interface Props {
  open: boolean
  current: Screen
  onNavigate: (screen: Screen) => void
  onClose: () => void
}

const ITEMS: { screen: Screen; label: string; icon: LucideIcon }[] = [
  { screen: 'challenges', label: 'Challenges', icon: Target },
  { screen: 'feed', label: 'Feed', icon: Images },
  { screen: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { screen: 'settings', label: 'Settings', icon: Settings },
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
        <div className="nav-sheet-head">
          <p className="nav-sheet-title">Move Quest</p>
          <button type="button" className="nav-close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <ul>
          {ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.screen}>
                <button
                  type="button"
                  className={`nav-item ${current === item.screen ? 'active' : ''}`}
                  onClick={() => onNavigate(item.screen)}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                  {item.label}
                </button>
              </li>
            )
          })}
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
      <Menu size={22} strokeWidth={2} />
    </button>
  )
}
