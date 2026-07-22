import { Plus, Send, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { commentOnPost, deletePost, fetchFeed, reactToPost } from '../api'
import { iconForChallenge } from '../challengeIcon'
import { cue } from '../feedback'
import { ROOM_ICON, ROOM_LABEL, timeAgo } from '../labels'
import type { FeedComment, FeedPost, ReactionSummary } from '../types'
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
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchFeed(userId)
      .then((data) => {
        if (!cancelled) setPosts(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

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
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing here yet</h2>
          <p>Be the first to get up and post a move.</p>
        </div>
      ) : (
        <ul className="feed-list">
          {posts.map((post, index) => (
            <li key={post.id} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
              <PostCard
                post={post}
                userId={userId}
                onOpenPhoto={setLightbox}
                onDeleted={(id) => setPosts((cur) => cur.filter((p) => p.id !== id))}
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

function PostCard({
  post,
  userId,
  onOpenPhoto,
  onDeleted,
}: {
  post: FeedPost
  userId: string
  onOpenPhoto: (url: string) => void
  onDeleted: (id: string) => void
}) {
  const [reactions, setReactions] = useState<ReactionSummary[]>(post.reactions)
  const [comments, setComments] = useState<FeedComment[]>(post.comments)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const RoomIcon = ROOM_ICON[post.room]
  const TaskIcon = iconForChallenge({
    title: post.challengeTitle,
    prompt: post.challengeTitle,
    vibe: post.vibe,
    room: post.room,
  })

  async function react(emoji: string) {
    if (post.isMine) return
    cue.react()
    setPickerOpen(false)
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
      const authoritative = await reactToPost(userId, post.id, emoji)
      setReactions(authoritative)
    } catch {
      const fresh = await reactToPost(userId, post.id, emoji).catch(() => null)
      if (fresh) setReactions(fresh)
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const comment = await commentOnPost(userId, post.id, body)
      cue.tick()
      setComments((cur) => [...cur, comment])
      setDraft('')
    } catch {
      // Keep the draft so the user can retry.
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deletePost(userId, post.id)
      cue.remove()
      onDeleted(post.id)
    } catch {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  return (
    <article className={`feed-card ${post.isMine ? 'is-mine' : ''}`}>
      <header className="feed-head">
        <Avatar name={post.displayName} avatarUrl={post.avatarUrl} size={40} />
        <div className="feed-head-text">
          <span className="feed-author">
            {post.displayName}
            {post.isMine ? ' · you' : ''}
          </span>
          <span className="feed-sub">
            <RoomIcon size={12} strokeWidth={2} aria-hidden="true" />
            {ROOM_LABEL[post.room]} · {timeAgo(post.createdAt)}
          </span>
        </div>
        <span className="feed-points">+{post.points}</span>
      </header>

      <button
        type="button"
        className="feed-photo"
        onClick={() => onOpenPhoto(post.photoUrl)}
        aria-label="View full size"
      >
        <img src={post.photoUrl} alt={`${post.displayName}: ${post.challengeTitle}`} loading="lazy" />
      </button>

      <div className="feed-body">
        <div className="feed-task">
          <span className="feed-task-icon" aria-hidden="true">
            <TaskIcon size={16} strokeWidth={2} />
          </span>
          <span className="feed-task-text">
            <span className="feed-task-label">Completed</span>
            <span className="feed-task-title">{post.challengeTitle}</span>
          </span>
        </div>

        {post.caption ? <p className="feed-caption">{post.caption}</p> : null}

        <div className="reaction-bar">
          {reactions.map((r) =>
            post.isMine ? (
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
          {!post.isMine ? (
            <div className="reaction-add">
              <button
                type="button"
                className="reaction add"
                aria-label="Add a reaction"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((v) => !v)}
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
              {pickerOpen ? (
                <EmojiPicker onPick={(e) => void react(e)} onClose={() => setPickerOpen(false)} />
              ) : null}
            </div>
          ) : null}
        </div>

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
            aria-label={`Comment on ${post.displayName}'s move`}
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

        {post.isMine ? (
          confirmDelete ? (
            <div className="feed-delete-confirm">
              <span>Delete this post? Your points go too.</span>
              <div className="feed-delete-actions">
                <button type="button" className="text-btn" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="danger-btn" onClick={() => void remove()} disabled={busy}>
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="feed-delete icon-btn"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={15} strokeWidth={2} />
              Delete post
            </button>
          )
        ) : null}
      </div>
    </article>
  )
}
