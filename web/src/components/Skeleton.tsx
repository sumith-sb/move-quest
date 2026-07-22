import type { CSSProperties } from 'react'

interface Props {
  width?: number | string
  height?: number | string
  radius?: number | string
  circle?: boolean
  className?: string
  style?: CSSProperties
}

/** A shimmering placeholder block for loading / sparse states. */
export function Skeleton({ width, height, radius, circle, className, style }: Props) {
  return (
    <span
      className={`skeleton ${className ?? ''}`}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: circle ? '50%' : radius,
        ...style,
      }}
    />
  )
}

/** A skeleton stand-in for a feed post card. */
export function SkeletonFeedCard() {
  return (
    <div className="feed-card skeleton-card">
      <div className="feed-head">
        <Skeleton circle width={40} height={40} />
        <div className="feed-head-text">
          <Skeleton width="45%" height={12} />
          <Skeleton width="60%" height={10} style={{ marginTop: 6 }} />
        </div>
      </div>
      <Skeleton height={160} radius={16} />
      <Skeleton width="55%" height={14} />
    </div>
  )
}

/** A skeleton stand-in for a leaderboard row. */
export function SkeletonBoardRow() {
  return (
    <div className="board-list-skeleton">
      <Skeleton circle width={30} height={30} />
      <Skeleton width="50%" height={12} />
      <Skeleton width={28} height={18} radius={6} />
    </div>
  )
}
