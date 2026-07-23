import { MoreHorizontal, Send, SmilePlus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { commentOnPost, deletePost, fetchFeed, reactToPost } from '../api'
import { iconForChallenge } from '../challengeIcon'
import { cue } from '../feedback'
import { ROOM_LABEL, timeAgo } from '../labels'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const TaskIcon = iconForChallenge({
    title: post.challengeTitle,
    prompt: post.challengeTitle,
    vibe: post.vibe,
    room: post.room,
  })
  const showReactions = reactions.length > 0 || !post.isMine

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
      setMenuOpen(false)
    }
  }

  return (
    <article className={`feed-card ${post.isMine ? 'is-mine' : ''}`}>
      <header className="feed-head">
        <Avatar name={post.displayName} avatarUrl={post.avatarUrl} size={40} />
        <div className="feed-id">
          <span className="feed-author">
            {post.displayName}
            {post.isMine ? <span className="feed-you"> · you</span> : null}
          </span>
          <span className="feed-meta">
            <TaskIcon size={13} strokeWidth={2} aria-hidden="true" />
            <span className="feed-meta-task">{post.challengeTitle}</span>
            <span className="feed-meta-sep">·</span>
            {ROOM_LABEL[post.room]}
            <span className="feed-meta-sep">·</span>
            {timeAgo(post.createdAt)}
          </span>
        </div>
        {post.isMine ? (
          <div className="feed-more-wrap">
            <button
              type="button"
              className="feed-more"
              aria-label="Post options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal size={18} strokeWidth={2} />
            </button>
            {menuOpen ? (
              <div className="feed-menu">
                <p className="feed-menu-note">Delete this post? Your points go too.</p>
                <div className="feed-menu-actions">
                  <button type="button" className="text-btn" onClick={() => setMenuOpen(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button type="button" className="danger-btn" onClick={() => void remove()} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="feed-photo-wrap">
        <button
          type="button"
          className="feed-photo"
          onClick={() => onOpenPhoto(post.photoUrl)}
          aria-label="View full size"
        >
          <img src={post.photoUrl} alt={`${post.displayName}: ${post.challengeTitle}`} loading="lazy" />
        </button>
        <span className="feed-points">+{post.points}</span>
      </div>

      <div className="feed-body">
        {post.caption ? <p className="feed-caption">{post.caption}</p> : null}

        {showReactions ? (
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
                  <SmilePlus size={18} strokeWidth={2} />
                </button>
                {pickerOpen ? (
                  <EmojiPicker onPick={(e) => void react(e)} onClose={() => setPickerOpen(false)} />
                ) : null}
              </div>
            ) : null}
          </div>
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
        </div>
      </div>
    </article>
  )
}
