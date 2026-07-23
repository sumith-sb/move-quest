import { Send, SmilePlus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  commentOnPost,
  fetchFeed,
  reactToPost,
  subscribeAcceptedAttempts,
} from '../api'
import { iconForChallenge } from '../challengeIcon'
import { cue } from '../feedback'
import { timeAgo } from '../labels'
import type { FeedComment, FeedItem, ReactionSummary } from '../types'
import { Avatar } from './Avatar'
import { EmojiPicker } from './EmojiPicker'
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
  const [filter, setFilter] = useState<FeedFilter>('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchFeed({ limit: 50 })
        if (!cancelled) setItems(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load feed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const unsubscribe = subscribeAcceptedAttempts(() => {
      void fetchFeed({ limit: 50 }).then((data) => {
        if (!cancelled) setItems(data)
      })
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const mine = items.filter((i) => i.userId === userId)
  const others = items.filter((i) => i.userId !== userId)
  const visible =
    filter === 'mine' ? mine : filter === 'others' ? others : items

  return (
    <section className="screen feed-screen" aria-labelledby="feed-title">
      <header className="topbar">
        <MenuButton onClick={onOpenMenu} />
        <Logo height={28} />
      </header>

      <h1 id="feed-title">Feed</h1>
      <p className="lede">Every move the team makes, as it happens.</p>

      {!loading && items.length > 0 ? (
        <div className="feed-filter" role="tablist" aria-label="Feed filter">
          {(
            [
              { id: 'all', label: 'All', count: items.length },
              { id: 'mine', label: 'Yours', count: mine.length },
              { id: 'others', label: 'Team', count: others.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              className={`feed-filter-opt ${filter === tab.id ? 'active' : ''}`}
              onClick={() => {
                cue.toggle()
                setFilter(tab.id)
              }}
            >
              {tab.label}
              <span className="feed-filter-count">{tab.count}</span>
            </button>
          ))}
        </div>
      ) : null}

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
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <h2>{filter === 'mine' ? 'No moves from you yet' : 'No team moves yet'}</h2>
          <p>
            {filter === 'mine'
              ? 'Clear a challenge and your photo will show up here.'
              : 'When teammates post, their moves land here.'}
          </p>
        </div>
      ) : filter === 'all' ? (
        <div className="feed-sections">
          {mine.length > 0 ? (
            <FeedSection
              title="Yours"
              items={mine}
              userId={userId}
              onOpenPhoto={setLightbox}
            />
          ) : null}
          {others.length > 0 ? (
            <FeedSection
              title="Team"
              items={others}
              userId={userId}
              onOpenPhoto={setLightbox}
            />
          ) : null}
        </div>
      ) : (
        <ul className="feed-list">
          {visible.map((item, index) => (
            <li key={item.attemptId} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
              <FeedCard item={item} userId={userId} onOpenPhoto={setLightbox} />
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

type FeedFilter = 'all' | 'mine' | 'others'

function FeedSection({
  title,
  items,
  userId,
  onOpenPhoto,
}: {
  title: string
  items: FeedItem[]
  userId: string
  onOpenPhoto: (url: string) => void
}) {
  return (
    <section className="feed-section" aria-label={title}>
      <h2 className="feed-section-title">{title}</h2>
      <ul className="feed-list">
        {items.map((item, index) => (
          <li key={item.attemptId} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
            <FeedCard item={item} userId={userId} onOpenPhoto={onOpenPhoto} />
          </li>
        ))}
      </ul>
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
  const [reactions, setReactions] = useState<ReactionSummary[]>(item.reactions)
  const [comments, setComments] = useState<FeedComment[]>(item.comments)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [reactError, setReactError] = useState<string | null>(null)
  const TaskIcon = iconForChallenge({
    title: item.challengeTitle,
    prompt: item.challengePrompt,
  })

  useEffect(() => {
    setReactions(item.reactions)
    setComments(item.comments)
  }, [item.reactions, item.comments])

  async function react(emoji: string) {
    if (isMine) return
    const previous = reactions
    cue.react()
    setPickerOpen(false)
    setReactError(null)
    setReactions((cur) => {
      const existing = cur.find((r) => r.emoji === emoji)
      if (existing) {
        return cur
          .map((r) =>
            r.emoji === emoji
              ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) }
              : r,
          )
          .filter((r) => r.count > 0)
      }
      return [...cur, { emoji, count: 1, mine: true }]
    })
    try {
      const authoritative = await reactToPost(item.attemptId, emoji)
      setReactions(authoritative)
    } catch (err) {
      setReactions(previous)
      setReactError(err instanceof Error ? err.message : 'Could not react')
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const comment = await commentOnPost(item.attemptId, body)
      cue.tick()
      setComments((cur) => [...cur, comment])
      setDraft('')
    } catch {
      // Keep the draft so the user can retry.
    } finally {
      setBusy(false)
    }
  }

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

      <div className="feed-body">
        <div className="reaction-bar">
          {reactions.map((r) =>
            isMine ? (
              <span key={r.emoji} className={`reaction static ${r.mine ? 'mine' : ''}`}>
                <span aria-hidden="true">{r.emoji}</span>
                <span className="reaction-count">{r.count}</span>
              </span>
            ) : (
              <button
                key={r.emoji}
                type="button"
                className={`reaction ${r.mine ? 'mine' : ''}`}
                aria-pressed={r.mine}
                onClick={() => void react(r.emoji)}
              >
                <span aria-hidden="true">{r.emoji}</span>
                <span className="reaction-count">{r.count}</span>
              </button>
            ),
          )}
          {!isMine ? (
            <div className="reaction-add">
              <button
                type="button"
                className="reaction add"
                aria-label="Add a reaction"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((v) => !v)}
              >
                <SmilePlus size={18} strokeWidth={2} />
              </button>
              {pickerOpen ? (
                <EmojiPicker onPick={(e) => void react(e)} onClose={() => setPickerOpen(false)} />
              ) : null}
            </div>
          ) : reactions.length === 0 ? (
            <p className="muted reaction-empty">Teammates can react to your move</p>
          ) : null}
        </div>
        {reactError ? (
          <p className="banner error" role="alert">
            {reactError}
          </p>
        ) : null}

        <div className="feed-comments">
          {comments.length > 0 ? (
            <ul className="comment-list">
              {comments.map((c) => (
                <li key={c.id}>
                  <Avatar name={c.displayName} avatarUrl={c.avatarUrl} size={26} />
                  <span className="comment-text">
                    <span className="comment-author">{c.displayName}</span>
                    <span className="comment-body">{c.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <form className="comment-form" onSubmit={submitComment}>
            <input
              type="text"
              maxLength={280}
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={busy}
              aria-label={`Comment on ${item.displayName}'s move`}
            />
            <button
              type="submit"
              className="ghost-btn icon-btn comment-send"
              disabled={busy || draft.trim().length < 1}
              aria-label="Post comment"
            >
              <Send size={16} strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>
    </article>
  )
}
