import type { Challenge, VerifyResult } from '../types'

interface Props {
  challenge: Challenge
  result: VerifyResult
  onRetry: () => void
  onNext: () => void
  onBoard: () => void
}

export function ResultScreen({ challenge, result, onRetry, onNext, onBoard }: Props) {
  const tone =
    result.status === 'accepted'
      ? 'success'
      : result.status === 'error'
        ? 'warn'
        : 'fail'

  const title =
    result.status === 'accepted'
      ? 'Looks good!'
      : result.status === 'error'
        ? 'Could not verify'
        : 'Not quite'

  return (
    <section className={`screen result-screen tone-${tone}`} aria-labelledby="result-title">
      <p className="eyebrow">Result</p>
      <h1 id="result-title">{title}</h1>
      <p className="result-challenge">{challenge.title}</p>

      <div className="result-card" role="status" aria-live="polite">
        {result.status === 'accepted' ? (
          <p className="result-points">+{result.pointsAwarded} pts</p>
        ) : null}
        {result.status !== 'accepted' ? (
          <p className="result-reason">{result.reason}</p>
        ) : null}
        {result.status !== 'accepted' && result.confidence != null ? (
          <p className="muted">Confidence {(result.confidence * 100).toFixed(0)}%</p>
        ) : null}
      </div>

      <div className="action-stack">
        {result.retryable ? (
          <button type="button" className="primary-btn" onClick={onRetry}>
            {result.status === 'error' ? 'Try again' : 'Retake photo'}
          </button>
        ) : (
          <button type="button" className="primary-btn" onClick={onNext}>
            Next challenges
          </button>
        )}
        <button type="button" className="secondary-btn" onClick={onBoard}>
          Leaderboard
        </button>
        {result.retryable ? (
          <button type="button" className="text-btn" onClick={onNext}>
            Skip to new picks
          </button>
        ) : null}
      </div>
    </section>
  )
}
