import {
  Bell,
  CalendarClock,
  Footprints,
  Heart,
  type LucideIcon,
  Monitor,
  Moon,
  Sun,
  Volume2,
} from 'lucide-react'
import { playChime } from '../chime'
import { cue } from '../feedback'
import {
  ensureNotificationPermission,
  type Settings,
  type ThemeChoice,
} from '../settings'
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
}

export function SettingsScreen({ user, settings, onChange, onOpenMenu }: Props) {
  const notifBlocked =
    typeof Notification !== 'undefined' && Notification.permission === 'denied'

  async function toggleReminder(next: boolean) {
    if (next) await ensureNotificationPermission()
    onChange({ ...settings, reminderEnabled: next })
  }

  async function toggleFeedNotify(next: boolean) {
    if (next) await ensureNotificationPermission()
    onChange({ ...settings, feedNotify: next })
  }

  return (
    <section className="screen settings-screen" aria-labelledby="settings-title">
      <header className="topbar">
        <MenuButton onClick={onOpenMenu} />
        <Logo height={28} />
      </header>

      <h1 id="settings-title">Settings</h1>

      <div className="profile-row">
        <Avatar name={user.displayName} avatarUrl={user.avatarUrl} size={52} />
        <div className="profile-text">
          <p className="profile-name">{user.displayName}</p>
          <p className="muted profile-note">
            {user.avatarUrl
              ? 'Photo from your Google account'
              : 'Sign in with Google to use your photo'}
          </p>
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
          <Bell size={16} strokeWidth={2} aria-hidden="true" />
          <p className="settings-group-title">Reminders</p>
        </div>

        <Toggle
          label="Movement reminder"
          hint="Ring and notify the moment your next move unlocks."
          checked={settings.reminderEnabled}
          onChange={(v) => void toggleReminder(v)}
        />

        {settings.reminderEnabled ? (
          <div className="settings-nested">
            <Toggle
              label="Bell sound"
              hint="Play a gentle chime with the reminder."
              checked={settings.soundEnabled}
              onChange={(v) => onChange({ ...settings, soundEnabled: v })}
            />
            {settings.soundEnabled ? (
              <button type="button" className="ghost-btn icon-btn test-bell" onClick={() => playChime()}>
                <Volume2 size={16} strokeWidth={2} />
                Test the bell
              </button>
            ) : null}
            {notifBlocked ? (
              <p className="setting-note">
                Notifications are blocked in your browser. You&apos;ll still hear the bell.
              </p>
            ) : null}
          </div>
        ) : null}

        <Toggle
          label="New posts on the feed"
          hint="Get notified when a teammate shares a new move."
          checked={settings.feedNotify}
          onChange={(v) => void toggleFeedNotify(v)}
        />
      </div>

      <div className="settings-group">
        <div className="settings-group-head">
          <CalendarClock size={16} strokeWidth={2} aria-hidden="true" />
          <p className="settings-group-title">How scoring works</p>
        </div>
        <ul className="fact-list">
          <li>
            <span className="fact-icon"><Footprints size={16} strokeWidth={2} /></span>
            <span className="fact-text">
              <span className="fact-lead">Earn points for moving</span>
              <span className="fact-detail">A bigger effort earns a bit more.</span>
            </span>
          </li>
          <li>
            <span className="fact-icon"><Heart size={16} strokeWidth={2} /></span>
            <span className="fact-text">
              <span className="fact-lead">+2 per reaction</span>
              <span className="fact-detail">Every emoji your post gets adds to your score.</span>
            </span>
          </li>
          <li>
            <span className="fact-icon"><CalendarClock size={16} strokeWidth={2} /></span>
            <span className="fact-text">
              <span className="fact-lead">Fresh start weekly</span>
              <span className="fact-detail">The board resets every Monday.</span>
            </span>
          </li>
        </ul>
      </div>
    </section>
  )
}
