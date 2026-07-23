import { ArrowLeft, Camera } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { iconForChallenge } from '../challengeIcon'
import type { Challenge } from '../types'

interface Props {
  challenge: Challenge
  busy: boolean
  busyLabel?: string | null
  error: string | null
  onBack: () => void
  onSubmit: (file: File) => void
}

export function CaptureScreen({
  challenge,
  busy,
  busyLabel,
  error,
  onBack,
  onSubmit,
}: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  function onFileChange(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(next)
    setPreviewUrl(next ? URL.createObjectURL(next) : null)
  }

  return (
    <section className="screen capture-screen" aria-labelledby="capture-title">
      <header className="topbar">
        <button type="button" className="ghost-btn icon-btn" onClick={onBack} disabled={busy}>
          <ArrowLeft size={18} strokeWidth={2} />
          Back
        </button>
      </header>

      <div className="capture-copy">
        {(() => {
          const Icon = iconForChallenge(challenge)
          return (
            <span className="card-icon" aria-hidden="true">
              <Icon size={20} strokeWidth={2} />
            </span>
          )
        })()}
        <p className="eyebrow">Your move</p>
        <h1 id="capture-title">{challenge.title}</h1>
        <p>{challenge.prompt}</p>
        <p className="muted freshness-hint">Take a photo to post your move to the team feed.</p>
      </div>

      <div className={`viewfinder ${previewUrl ? 'has-preview' : ''}`}>
        {previewUrl ? (
          <img src={previewUrl} alt="Your photo" onError={() => setPreviewUrl(null)} />
        ) : (
          <p>Tap below to take a photo.</p>
        )}
      </div>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      <input
        id={inputId}
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/jpg,.jpg,.jpeg"
        capture="environment"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />

      <div className="action-stack">
        <button
          type="button"
          className="secondary-btn icon-btn"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={18} strokeWidth={2} />
          {file ? 'Retake photo' : 'Take photo'}
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={!file || busy}
          onClick={() => file && onSubmit(file)}
        >
          {busy ? (busyLabel ?? 'Posting…') : 'Post the move'}
        </button>
      </div>
    </section>
  )
}
