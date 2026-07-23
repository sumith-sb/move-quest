export type ThemeChoice = 'system' | 'light' | 'dark'

export interface Settings {
  /** Interface sounds + haptics on interactions. */
  uiFeedback: boolean
  /** Colour theme; 'system' follows the OS preference. */
  theme: ThemeChoice
}

export const DEFAULT_SETTINGS: Settings = {
  uiFeedback: true,
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
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      uiFeedback: parsed.uiFeedback ?? DEFAULT_SETTINGS.uiFeedback,
      theme: parsed.theme ?? DEFAULT_SETTINGS.theme,
    }
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
