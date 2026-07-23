import { CalendarClock, Footprints, LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { cue } from '../feedback'
import { type Settings, type ThemeChoice } from '../settings'
import type { User } from '../types'
import { Avatar } from './Avatar'
import { Logo } from './Logo'
import { MenuButton } from './NavMenu'
import { Toggle } from './Toggle'

const THEMES: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

interface Props {
  user: User
  settings: Settings
  onChange: (settings: Settings) => void
  onOpenMenu: () => void
  onSignOut: () => void
}

export function SettingsScreen({
  user,
  settings,
  onChange,
  onOpenMenu,
  onSignOut,
}: Props) {
  return (
    <section className="screen settings-screen" aria-labelledby="settings-title">
      <header className="topbar">
        <MenuButton onClick={onOpenMenu} />
        <Logo height={28} />
      </header>

      <h1 id="settings-title">Settings</h1>

      <div className="profile-row">
        <Avatar name={user.displayName ?? 'Player'} size={52} />
        <div className="profile-text">
          <p className="profile-name">{user.displayName ?? 'Player'}</p>
          <p className="muted profile-note">{user.emailDomain}</p>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-head">
          <Sun size={16} strokeWidth={2} aria-hidden="true" />
          <p className="settings-group-title">Appearance</p>
        </div>
        <div className="theme-seg" role="group" aria-label="Theme">
          {THEMES.map((t) => {
            const Icon = t.icon
            const active = settings.theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                className={`theme-opt ${active ? 'active' : ''}`}
                aria-pressed={active}
                onClick={() => {
                  cue.toggle()
                  onChange({ ...settings, theme: t.value })
                }}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                {t.label}
              </button>
            )
          })}
        </div>

        <Toggle
          label="Sound & haptics"
          hint="Play interface sounds and vibrate on taps."
          checked={settings.uiFeedback}
          onChange={(v) => onChange({ ...settings, uiFeedback: v })}
        />
      </div>

      <div className="settings-group">
        <div className="settings-group-head">
          <CalendarClock size={16} strokeWidth={2} aria-hidden="true" />
          <p className="settings-group-title">How scoring works</p>
        </div>
        <ul className="fact-list">
          <li>
            <span className="fact-icon">
              <Footprints size={16} strokeWidth={2} />
            </span>
            <span className="fact-text">
              <span className="fact-lead">Earn points for moving</span>
              <span className="fact-detail">Complete a challenge and post your photo.</span>
            </span>
          </li>
          <li>
            <span className="fact-icon">
              <CalendarClock size={16} strokeWidth={2} />
            </span>
            <span className="fact-text">
              <span className="fact-lead">Fresh start weekly</span>
              <span className="fact-detail">The board resets every Monday.</span>
            </span>
          </li>
        </ul>
      </div>

      <button type="button" className="secondary-btn icon-btn" onClick={onSignOut}>
        <LogOut size={16} strokeWidth={2} />
        Sign out
      </button>
    </section>
  )
}
