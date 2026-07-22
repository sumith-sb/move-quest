import { play, setEnabled } from 'cuelume'

let enabled = true

/** Toggle both UI sounds (cuelume) and haptics. */
export function setFeedbackEnabled(value: boolean): void {
  enabled = value
  setEnabled(value)
}

function buzz(pattern: number | number[]): void {
  if (!enabled) return
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    // Vibration unsupported (e.g. iOS Safari) — sound still plays.
  }
}

/**
 * Semantic interaction cues — each pairs a cuelume sound with a matching
 * haptic buzz. Sounds no-op when disabled or when Web Audio is blocked;
 * haptics no-op where the Vibration API is unavailable.
 */
export const cue = {
  press: () => {
    void play('press')
    buzz(8)
  },
  select: () => {
    void play('release')
    buzz(12)
  },
  success: () => {
    void play('success')
    buzz([14, 40, 22])
  },
  react: () => {
    void play('sparkle')
    buzz(10)
  },
  toggle: () => {
    void play('toggle')
    buzz(10)
  },
  nav: () => {
    void play('release')
    buzz(6)
  },
  tick: () => {
    void play('tick')
    buzz(5)
  },
  error: () => {
    void play('error')
    buzz([18, 50, 18])
  },
  remove: () => {
    void play('droplet')
    buzz(16)
  },
}
