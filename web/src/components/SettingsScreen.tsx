import { playChime } from '../chime'
import { ensureNotificationPermission, type Settings } from '../settings'
import type { User } from '../types'
import { Avatar } from './Avatar'
import { MenuButton } from './NavMenu'

interface Props {
  user: User
  settings: Settings
  onChange: (settings: Settings) => void
  onOpenMenu: () => void
}

export function SettingsScreen({ user, settings, onChange, onOpenMenu }: Props) {
  async function toggleReminder(next: boolean) {
    if (next) await ensureNotificationPermission()
    onChange({ ...settings, reminderEnabled: next })
  }

  return (
    <section className="screen settings-screen" aria-labelledby="settings-title">
      <header className="topbar">
        <MenuButton onClick={onOpenMenu} />
        <p className="eyebrow">You</p>
      </header>

      <h1 id="settings-title">Settings</h1>

      <div className="profile-row">
        <Avatar name={user.displayName} avatarUrl={user.avatarUrl} size={56} />
        <div>
          <p className="profile-name">{user.displayName}</p>
          <p className="muted profile-note">
            {user.avatarUrl
              ? 'Photo from your Google account'
              : 'Sign in with Google to use your photo'}
          </p>
        </div>
      </div>

      <div className="settings-group">
        <p className="settings-group-title">Reminders</p>

        <label className="setting-row">
          <span>
            <span className="setting-label">Ring when I can move again</span>
            <span className="setting-hint">
              A bell + notification the moment your cooldown ends.
            </span>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={settings.reminderEnabled}
            onChange={(e) => void toggleReminder(e.target.checked)}
          />
        </label>

        <label className="setting-row">
          <span>
            <span className="setting-label">Bell sound</span>
            <span className="setting-hint">Play a chime with the reminder.</span>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={settings.soundEnabled}
            onChange={(e) => onChange({ ...settings, soundEnabled: e.target.checked })}
          />
        </label>

        <button type="button" className="ghost-btn" onClick={() => playChime()}>
          Test the bell
        </button>
      </div>

      <div className="settings-group">
        <p className="settings-group-title">How scoring works</p>
        <ul className="settings-facts">
          <li>Easy / Medium / Hard moves earn 10 / 25 / 50 points.</li>
          <li>Every emoji reaction your post gets earns you +2 points.</li>
          <li>The leaderboard resets every Monday.</li>
        </ul>
      </div>
    </section>
  )
}
