import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchFeed, subscribeAcceptedAttempts } from '../api'
import { iconForChallenge } from '../challengeIcon'
import { timeAgo } from '../labels'
import type { FeedItem } from '../types'
import { Avatar } from './Avatar'
import { Logo } from './Logo'
import { MenuButton } from './NavMenu'
import { SkeletonFeedCard } from './Skeleton'

interface Props {
  userId: string
  onOpenMenu: () => void
}

export function FeedScreen({ userId, onOpenMenu }: Props) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchFeed()
        if (!cancelled) setItems(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load feed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const unsubscribe = subscribeAcceptedAttempts(() => {
      void fetchFeed().then((data) => {
        if (!cancelled) setItems(data)
      })
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return (
    <section className="screen feed-screen" aria-labelledby="feed-title">
      <header className="topbar">
        <MenuButton onClick={onOpenMenu} />
        <Logo height={28} />
      </header>

      <h1 id="feed-title">Feed</h1>
      <p className="lede">Every move the team makes, as it happens.</p>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="feed-list">
          <SkeletonFeedCard />
          <SkeletonFeedCard />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing here yet</h2>
          <p>Be the first to get up and post a move.</p>
        </div>
      ) : (
        <ul className="feed-list">
          {items.map((item, index) => (
            <li key={item.attemptId} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
              <FeedCard
                item={item}
                userId={userId}
                onOpenPhoto={setLightbox}
              />
            </li>
          ))}
        </ul>
      )}

      {lightbox
        ? createPortal(
            <div className="lightbox" onClick={() => setLightbox(null)}>
              <button
                type="button"
                className="lightbox-close"
                aria-label="Close"
                onClick={() => setLightbox(null)}
              >
                <X size={24} />
              </button>
              <img src={lightbox} alt="Full size" onClick={(e) => e.stopPropagation()} />
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}

function FeedCard({
  item,
  userId,
  onOpenPhoto,
}: {
  item: FeedItem
  userId: string
  onOpenPhoto: (url: string) => void
}) {
  const isMine = item.userId === userId
  const TaskIcon = iconForChallenge({
    title: item.challengeTitle,
    prompt: item.challengePrompt,
  })

  return (
    <article className={`feed-card ${isMine ? 'is-mine' : ''}`}>
      <header className="feed-head">
        <Avatar name={item.displayName} size={40} />
        <div className="feed-id">
          <span className="feed-author">
            {item.displayName}
            {isMine ? <span className="feed-you"> · you</span> : null}
          </span>
          <span className="feed-meta">
            <TaskIcon size={13} strokeWidth={2} aria-hidden="true" />
            <span className="feed-meta-task">{item.challengeTitle}</span>
            <span className="feed-meta-sep">·</span>
            {timeAgo(item.awardedAt)}
          </span>
        </div>
      </header>

      {item.photoUrl ? (
        <div className="feed-photo-wrap">
          <button
            type="button"
            className="feed-photo"
            onClick={() => onOpenPhoto(item.photoUrl!)}
            aria-label="View full size"
          >
            <img
              src={item.photoUrl}
              alt={`${item.displayName}: ${item.challengeTitle}`}
              loading="lazy"
            />
          </button>
          <span className="feed-points">+{item.pointsAwarded}</span>
        </div>
      ) : null}
    </article>
  )
}
