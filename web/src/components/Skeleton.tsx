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
      <div className="skeleton-head">
        <Skeleton circle width={40} height={40} />
        <div className="skeleton-head-text">
          <Skeleton width="45%" height={12} />
          <Skeleton width="62%" height={10} />
        </div>
      </div>
      <Skeleton height={190} radius={0} />
      <div className="skeleton-foot">
        <Skeleton width="55%" height={13} />
      </div>
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
