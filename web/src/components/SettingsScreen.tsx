import { Bell, CalendarClock, Footprints, Heart, Volume2 } from 'lucide-react'
import { playChime } from '../chime'
import { ensureNotificationPermission, type Settings } from '../settings'
import type { User } from '../types'
import { Avatar } from './Avatar'
import { MenuButton } from './NavMenu'
import { Toggle } from './Toggle'

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

  return (
    <section className="screen settings-screen" aria-labelledby="settings-title">
      <header className="topbar">
        <MenuButton onClick={onOpenMenu} />
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
      </div>

      <div className="settings-group">
        <div className="settings-group-head">
          <CalendarClock size={16} strokeWidth={2} aria-hidden="true" />
          <p className="settings-group-title">How scoring works</p>
        </div>
        <ul className="fact-list">
          <li>
            <span className="fact-icon"><Footprints size={16} strokeWidth={2} /></span>
            Easy, Medium and Hard moves earn 10, 25 and 50 points.
          </li>
          <li>
            <span className="fact-icon"><Heart size={16} strokeWidth={2} /></span>
            Every emoji reaction your post gets earns you +2 points.
          </li>
          <li>
            <span className="fact-icon"><CalendarClock size={16} strokeWidth={2} /></span>
            The leaderboard resets every Monday.
          </li>
        </ul>
      </div>
    </section>
  )
}
