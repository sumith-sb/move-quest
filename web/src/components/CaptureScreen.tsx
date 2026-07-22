import { useId, useRef, useState } from 'react'
import { DIFFICULTY_LABEL, ROOM_EMOJI, ROOM_LABEL } from '../labels'
import type { Challenge } from '../types'

interface Props {
  challenge: Challenge
  busy: boolean
  error: string | null
  onBack: () => void
  onSubmit: (file: File) => void
}

function isHeicFile(file: File): boolean {
  const mime = file.type.toLowerCase()
  return (
    mime.includes('heic') ||
    mime.includes('heif') ||
    /\.hei[cf]$/i.test(file.name)
  )
}

export function CaptureScreen({ challenge, busy, error, onBack, onSubmit }: Props) {
  const cameraInputId = useId()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [heicNote, setHeicNote] = useState(false)

  function onFileChange(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(next)
    setPreviewUrl(next ? URL.createObjectURL(next) : null)
    setHeicNote(next ? isHeicFile(next) : false)
  }

  return (
    <section className="screen capture-screen" aria-labelledby="capture-title">
      <header className="topbar">
        <button type="button" className="ghost-btn" onClick={onBack} disabled={busy}>
          Back
        </button>
        <span className="points-stamp compact">+{challenge.points}</span>
      </header>

      <div className="capture-copy">
        <p className="eyebrow">{DIFFICULTY_LABEL[challenge.difficulty]} move</p>
        <h1 id="capture-title">{challenge.title}</h1>
        <p>{challenge.prompt}</p>
        <span className="room-chip">
          <span aria-hidden="true">{ROOM_EMOJI[challenge.room]}</span>
          Head to the {ROOM_LABEL[challenge.room].toLowerCase()}
        </span>
      </div>

      <div className={`viewfinder ${previewUrl ? 'has-preview' : ''}`}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Selected challenge photo preview"
            onError={() => {
              // Chrome often cannot preview HEIC; upload still works.
              setPreviewUrl(null)
            }}
          />
        ) : (
          <p>
            {file
              ? `${file.name || 'Photo selected'} — ready to submit.`
              : 'Take a new photo or pick one from your library.'}
          </p>
        )}
      </div>

      {heicNote ? (
        <p className="muted freshness-hint" role="status">
          HEIC captured — the server will convert it before upload.
        </p>
      ) : null}

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      <input
        id={cameraInputId}
        ref={cameraInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />

      <div className="action-stack">
        <button
          type="button"
          className="secondary-btn"
          disabled={busy}
          onClick={() => cameraInputRef.current?.click()}
        >
          {file ? 'Retake photo' : 'Take photo'}
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={!file || busy}
          onClick={() => file && onSubmit(file)}
        >
          {busy ? 'Uploading…' : 'Submit photo'}
        </button>
      </div>
    </section>
  )
}
