import { House, type LucideIcon, Target, User } from 'lucide-react'
import type { Screen } from '../types'
import { cue } from '../feedback'

interface Props {
  current: Screen
  onNavigate: (screen: Screen) => void
}

const TABS: { screen: Screen; label: string; icon: LucideIcon }[] = [
  { screen: 'feed', label: 'Home', icon: House },
  { screen: 'challenges', label: 'Challenges', icon: Target },
  { screen: 'profile', label: 'Profile', icon: User },
]

export function BottomNav({ current, onNavigate }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav-inner">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = current === tab.screen
          return (
            <button
              key={tab.screen}
              type="button"
              className={`bottom-nav-item ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (!active) cue.nav()
                onNavigate(tab.screen)
              }}
            >
              <Icon size={24} strokeWidth={2} aria-hidden="true" />
              <span className="bottom-nav-label">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
