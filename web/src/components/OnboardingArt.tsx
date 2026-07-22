import { ROOM_ICON, ROOM_LABEL } from '../labels'
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

const MOVES: {
  room: Room
  title: string
  prompt: string
  difficulty: string
  points: number
}[] = [
  {
    room: 'kitchen',
    title: 'Refill your water',
    prompt: 'Pour a fresh glass of water and photograph it.',
    difficulty: 'Easy',
    points: 10,
  },
  {
    room: 'hallway',
    title: 'Take the stairs',
    prompt: 'Walk a flight of stairs and photograph the top.',
    difficulty: 'Medium',
    points: 25,
  },
  {
    room: 'outdoors',
    title: 'Step outside',
    prompt: 'Head out and photograph the sky, a tree, or the street.',
    difficulty: 'Hard',
    points: 50,
  },
]

function MovesArt() {
  return (
    <div className="oa oa-moves" aria-hidden="true">
      <div className="oa-cycler">
        {MOVES.map((m, i) => {
          const Icon = ROOM_ICON[m.room]
          return (
            <div key={m.room} className="oa-line" style={{ animationDelay: `${i * 2}s` }}>
              <div className="oa-line-top">
                <span className="oa-difftag">{m.difficulty}</span>
                <span className="oa-points-tag">+{m.points}</span>
              </div>
              <div className="oa-line-mid">
                <span className="oa-move-title">{m.title}</span>
                <span className="oa-move-prompt">{m.prompt}</span>
              </div>
              <span className="oa-chip-row">
                <Icon size={13} strokeWidth={2} />
                {ROOM_LABEL[m.room]}
              </span>
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
