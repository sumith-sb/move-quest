import type { Challenge, VerifyResult } from '../types'

interface Props {
  challenge: Challenge
  result: VerifyResult
  onRetry: () => void
  onNext: () => void
  onBoard: () => void
  onFeed: () => void
}

export function ResultScreen({
  challenge,
  result,
  onRetry,
  onNext,
  onBoard,
  onFeed,
}: Props) {
  const accepted = result.status === 'accepted'

  const tone = accepted ? 'success' : result.status === 'error' ? 'warn' : 'fail'
  const title = accepted
    ? "You're on the feed!"
    : result.status === 'error'
      ? 'Could not post'
      : 'Not quite'

  return (
    <section className={`screen result-screen tone-${tone}`} aria-labelledby="result-title">
      <p className="eyebrow">{accepted ? 'Move complete' : 'Result'}</p>
      <h1 id="result-title">{title}</h1>
      <p className="result-challenge">{challenge.title}</p>

      <div className="result-card" role="status" aria-live="polite">
        {accepted ? (
          <>
            <p className="result-points">+{result.pointsAwarded} pts</p>
            <p className="muted">Your shot is live in the team feed.</p>
          </>
        ) : (
          <>
            <p className="result-reason">{result.reason}</p>
            {result.confidence != null ? (
              <p className="muted">Confidence {(result.confidence * 100).toFixed(0)}%</p>
            ) : null}
          </>
        )}
      </div>

      <div className="action-stack">
        {accepted ? (
          <>
            <button type="button" className="primary-btn" onClick={onFeed}>
              See it on the feed
            </button>
            <button type="button" className="secondary-btn" onClick={onBoard}>
              Leaderboard
            </button>
            <button type="button" className="text-btn" onClick={onNext}>
              Back to challenges
            </button>
          </>
        ) : result.retryable ? (
          <>
            <button type="button" className="primary-btn" onClick={onRetry}>
              {result.status === 'error' ? 'Try again' : 'Retake photo'}
            </button>
            <button type="button" className="secondary-btn" onClick={onBoard}>
              Leaderboard
            </button>
            <button type="button" className="text-btn" onClick={onNext}>
              Skip to new picks
            </button>
          </>
        ) : (
          <>
            <button type="button" className="primary-btn" onClick={onNext}>
              Next challenges
            </button>
            <button type="button" className="secondary-btn" onClick={onBoard}>
              Leaderboard
            </button>
          </>
        )}
      </div>
    </section>
  )
}
