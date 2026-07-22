import { useEffect, useRef } from 'react'

interface Props {
  onPick: (emoji: string) => void
  onClose: () => void
}

// A broad, Slack-style set grouped by section. Every one is a valid reaction.
const SECTIONS: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😄', '😁', '😅', '😂', '🙂', '😊', '😍', '😎', '🤩', '🥳', '😌', '🤔', '🫡', '😴', '🤗', '😮', '😳', '🥲', '😜'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👏', '🙌', '🙏', '💪', '🤝', '👊', '✌️', '🤟', '👌', '🫶', '👀', '🫰', '🤙'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💯', '✨', '⭐', '🌟'],
  },
  {
    label: 'Nature',
    emojis: ['🌿', '🌱', '🍃', '🌳', '🌻', '🌸', '🌈', '☀️', '⛅', '🌊', '💧', '🔥', '❄️', '🍂'],
  },
  {
    label: 'Life',
    emojis: ['☕', '🍵', '🥤', '🍎', '🥗', '🚶', '🏃', '🧘', '🚀', '🎉', '🏆', '🥇', '💡', '📸', '🎯', '👟'],
  },
]

export function EmojiPicker({ onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="emoji-picker" ref={ref} role="dialog" aria-label="Pick an emoji">
      {SECTIONS.map((section) => (
        <div key={section.label} className="emoji-section">
          <p className="emoji-section-label">{section.label}</p>
          <div className="emoji-grid">
            {section.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="emoji-choice"
                onClick={() => onPick(emoji)}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
