import { ROOM_ICON } from '../labels'
import type { Room } from '../types'

/**
 * Small looped "mini-mockup" animations for the onboarding steps. They demo the
 * real mechanic (moves → pick one of three → reactions) so the app explains
 * itself. Explanatory, first-run only; disabled under reduced motion.
 */
export function OnboardingArt({ step }: { step: number }) {
  if (step === 0) return <MovesArt />
  if (step === 1) return <PickArt />
  return <ReactArt />
}

const MOVES: { room: Room; text: string }[] = [
  { room: 'kitchen', text: 'Refill your water' },
  { room: 'hallway', text: 'Take the stairs' },
  { room: 'outdoors', text: 'Step outside' },
]

function MovesArt() {
  return (
    <div className="oa oa-moves" aria-hidden="true">
      <div className="oa-cycler">
        {MOVES.map(({ room, text }, i) => {
          const Icon = ROOM_ICON[room]
          return (
            <div key={room} className="oa-line" style={{ animationDelay: `${i * 2}s` }}>
              <span className="oa-chip">
                <Icon size={14} strokeWidth={2} />
              </span>
              <span className="oa-prompt">{text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TIERS = [
  { label: 'Easy', points: '+10', cls: 'easy' },
  { label: 'Medium', points: '+25', cls: 'medium' },
  { label: 'Hard', points: '+50', cls: 'hard' },
]

function PickArt() {
  return (
    <div className="oa oa-pick" aria-hidden="true">
      {TIERS.map((t, i) => (
        <div key={t.cls} className={`oa-mini ${t.cls}`} style={{ animationDelay: `${i * 1.5}s` }}>
          <span className="oa-diff">{t.label}</span>
          <span className="oa-pts">{t.points}</span>
        </div>
      ))}
    </div>
  )
}

const REACTS = ['👏', '🔥', '❤️']

function ReactArt() {
  return (
    <div className="oa oa-react-card" aria-hidden="true">
      <div className="oa-head">
        <span className="oa-avatar">D</span>
        <span className="oa-name" />
        <span className="oa-badge">+2</span>
      </div>
      <div className="oa-photo" />
      <div className="oa-reactions">
        {REACTS.map((e, i) => (
          <span key={e} className="oa-react" style={{ animationDelay: `${1 + i * 0.9}s` }}>
            {e}
          </span>
        ))}
      </div>
    </div>
  )
}
