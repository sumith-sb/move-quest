export interface Settings {
  /** Ring when the movement cooldown ends. */
  reminderEnabled: boolean
  /** Play the bell sound with the reminder. */
  soundEnabled: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  reminderEnabled: false,
  soundEnabled: true,
}

const KEY = 'move-quest-settings'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable — settings just won't persist.
  }
}

/** Ask for notification permission; resolves to whether it's granted. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function notify(title: string, body: string): void {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  } catch {
    // Ignore — notifications are best-effort.
  }
}
