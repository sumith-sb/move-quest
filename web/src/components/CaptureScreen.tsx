import { ArrowLeft, Camera, ImagePlus } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { Challenge } from '../types'
import { RoomChip } from './RoomChip'

interface Props {
  challenge: Challenge
  busy: boolean
  error: string | null
  onBack: () => void
  onSubmit: (file: File, caption: string, sharedToFeed: boolean) => void
}

function isHeicFile(file: File): boolean {
  const mime = file.type.toLowerCase()
  return mime.includes('heic') || mime.includes('heif') || /\.hei[cf]$/i.test(file.name)
}

export function CaptureScreen({ challenge, busy, error, onBack, onSubmit }: Props) {
  const isFree = challenge.id === 'ch_free'
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [heicNote, setHeicNote] = useState(false)
  const [caption, setCaption] = useState('')
  const [shareToFeed, setShareToFeed] = useState(true)

  function onFileChange(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(next)
    setPreviewUrl(next ? URL.createObjectURL(next) : null)
    setHeicNote(next ? isHeicFile(next) : false)
  }

  const captionMissing = isFree && caption.trim().length === 0
  const submitLabel = busy
    ? 'Posting…'
    : isFree
      ? 'Share it'
      : shareToFeed
        ? 'Post the move'
        : 'Log the move'

  return (
    <section className="screen capture-screen" aria-labelledby="capture-title">
      <header className="topbar">
        <button type="button" className="ghost-btn icon-btn" onClick={onBack} disabled={busy}>
          <ArrowLeft size={18} strokeWidth={2} />
          Back
        </button>
      </header>

      <div className="capture-copy">
        <p className="eyebrow">{isFree ? 'Free post' : 'Your move'}</p>
        <h1 id="capture-title">{challenge.title}</h1>
        <p>{challenge.prompt}</p>
        {!isFree ? <RoomChip room={challenge.room} /> : null}
      </div>

      <div className={`viewfinder ${previewUrl ? 'has-preview' : ''}`}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Your photo"
            onError={() => setPreviewUrl(null)}
          />
        ) : (
          <p>
            {file
              ? 'Photo ready to share.'
              : isFree
                ? 'Choose any photo from your device.'
                : 'Tap below to take a live photo.'}
          </p>
        )}
      </div>

      {heicNote ? (
        <p className="muted freshness-hint" role="status">
          HEIC captured, the server will convert it before it posts.
        </p>
      ) : null}

      {file ? (
        <div className="capture-extras">
          <label className="sr-only" htmlFor="caption-input">
            Caption
          </label>
          <input
            id="caption-input"
            className="caption-input"
            type="text"
            maxLength={140}
            placeholder={isFree ? 'Add a caption (required)' : 'Add a caption (optional)'}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={busy}
          />
          {!isFree ? (
            <label className="share-toggle">
              <input
                type="checkbox"
                checked={shareToFeed}
                onChange={(e) => setShareToFeed(e.target.checked)}
                disabled={busy}
              />
              <span>Share to the team feed</span>
            </label>
          ) : null}
        </div>
      ) : null}

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
        accept="image/*"
        {...(isFree ? {} : { capture: 'environment' as const })}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />

      <div className="action-stack">
        <button
          type="button"
          className="secondary-btn icon-btn"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {isFree ? <ImagePlus size={18} strokeWidth={2} /> : <Camera size={18} strokeWidth={2} />}
          {file ? (isFree ? 'Change photo' : 'Retake photo') : isFree ? 'Choose photo' : 'Take photo'}
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={!file || busy || captionMissing}
          onClick={() => file && onSubmit(file, caption, isFree ? true : shareToFeed)}
        >
          {submitLabel}
        </button>
      </div>
    </section>
  )
}
