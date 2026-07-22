export type ThemeChoice = 'system' | 'light' | 'dark'

export interface Settings {
  /** Ring when the movement cooldown ends. */
  reminderEnabled: boolean
  /** Play the bell sound with the reminder. */
  soundEnabled: boolean
  /** Notify when a teammate posts a new move to the feed. */
  feedNotify: boolean
  /** Colour theme; 'system' follows the OS preference. */
  theme: ThemeChoice
}

export const DEFAULT_SETTINGS: Settings = {
  reminderEnabled: false,
  soundEnabled: true,
  feedNotify: true,
  theme: 'system',
}

export function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return choice
}

/** Stamp the resolved theme onto the document root for the CSS to read. */
export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.setAttribute('data-theme', resolveTheme(choice))
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
