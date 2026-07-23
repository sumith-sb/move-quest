interface Props {
  name: string
  avatarUrl?: string | null
  size?: number
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Goodspeed-friendly tints for initials backgrounds.
const TINTS = ['#36493C', '#374A3E', '#EA9E83', '#EBC366', '#c6dd66']

function tintFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return TINTS[Math.abs(hash) % TINTS.length]
}

/** Profile photo when available (e.g. from Google), otherwise initials. */
export function Avatar({ name, avatarUrl, size = 40 }: Props) {
  const style = { width: size, height: size, fontSize: size * 0.4 }
  if (avatarUrl) {
    return (
      <img
        className="avatar avatar-img"
        src={avatarUrl}
        alt=""
        style={style}
        loading="lazy"
      />
    )
  }
  const tint = tintFor(name)
  const light = tint === '#EBC366' || tint === '#c6dd66'
  return (
    <span
      className="avatar avatar-initials"
      style={{ ...style, background: tint, color: light ? '#242f28' : '#f9f2ed' }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
