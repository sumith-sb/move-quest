import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { OnboardingArt } from './OnboardingArt'

interface Props {
  busy: boolean
  error: string | null
  onSubmit: (displayName: string) => void
}

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Get off your chair',
    body: 'Move Quest nudges you to stand up and move somewhere new a few times a day. Small moves, real breaks.',
  },
  {
    title: 'Pick one of three',
    body: 'Each round gives you an Easy, a Medium, and a Hard move. Do one, snap a photo, earn points. Then a cooldown paces you.',
  },
  {
    title: 'Share with the team',
    body: 'Your shot lands in a shared feed. React with any emoji and comment. Every reaction your post gets earns you bonus points.',
  },
]

export function Onboarding({ busy, error, onSubmit }: Props) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const total = STEPS.length + 1
  const onNameStep = step === STEPS.length

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(name.trim())
  }

  return (
    <section className="screen onboarding-screen" aria-label="Welcome to Move Quest">
      <div className="onboarding-progress" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`progress-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
        ))}
      </div>

      {!onNameStep ? (
        <div className="onboarding-step">
          <OnboardingArt step={step} />
          <h1>{STEPS[step].title}</h1>
          <p className="lede">{STEPS[step].body}</p>

          <div className="onboarding-nav">
            {step > 0 ? (
              <button type="button" className="secondary-btn icon-btn" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft size={18} strokeWidth={2} />
                Back
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="primary-btn icon-btn" onClick={() => setStep((s) => s + 1)}>
              Next
              <ArrowRight size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : (
        <div className="onboarding-step">
          <p className="brand">Move Quest</p>
          <h1>What should the team call you?</h1>
          <form className="name-form" onSubmit={handleSubmit}>
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              name="displayName"
              autoComplete="nickname"
              maxLength={30}
              placeholder="e.g. Emre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              required
            />
            {error ? (
              <p className="banner error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="onboarding-nav">
              <button type="button" className="secondary-btn icon-btn" onClick={() => setStep((s) => s - 1)} disabled={busy}>
                <ArrowLeft size={18} strokeWidth={2} />
                Back
              </button>
              <button type="submit" className="primary-btn" disabled={busy || name.trim().length < 1}>
                {busy ? 'Joining…' : 'Start moving'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
