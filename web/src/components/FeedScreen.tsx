import { useEffect, useState, type FormEvent } from 'react'
import { commentOnPost, fetchFeed, reactToPost } from '../api'
import { ROOM_EMOJI, ROOM_LABEL, timeAgo } from '../labels'
import type { FeedComment, FeedPost, ReactionSummary } from '../types'

interface Props {
  userId: string
  onBack: () => void
}

export function FeedScreen({ userId, onBack }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <button type="button" className="ghost-btn" onClick={onBack}>
          Back
        </button>
        <p className="eyebrow">The Team</p>
      </header>

      <h1 id="feed-title">Feed</h1>
      <p className="lede">Every move the team makes, as it happens.</p>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="muted" role="status">
          Loading the feed…
        </p>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h2>Nothing here yet</h2>
          <p>Be the first to get up and post a move.</p>
        </div>
      ) : (
        <ul className="feed-list">
          {posts.map((post, index) => (
            <li key={post.id} style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
              <PostCard post={post} userId={userId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PostCard({ post, userId }: { post: FeedPost; userId: string }) {
  const [reactions, setReactions] = useState<ReactionSummary[]>(post.reactions)
  const [comments, setComments] = useState<FeedComment[]>(post.comments)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function toggleReaction(emoji: string) {
    // Optimistic — snap immediately, reconcile with the server's count.
    setReactions((cur) =>
      cur.map((r) =>
        r.emoji === emoji
          ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) }
          : r,
      ),
    )
    try {
      const authoritative = await reactToPost(userId, post.id, emoji)
      setReactions(authoritative)
    } catch {
      // Revert on failure by re-reading nothing we can trust — flip back.
      setReactions((cur) =>
        cur.map((r) =>
          r.emoji === emoji
            ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) }
            : r,
        ),
      )
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const comment = await commentOnPost(userId, post.id, body)
      setComments((cur) => [...cur, comment])
      setDraft('')
    } catch {
      // Keep the draft so the user can retry.
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`feed-card ${post.isMine ? 'is-mine' : ''}`}>
      <header className="feed-head">
        <div>
          <span className="feed-author">
            {post.displayName}
            {post.isMine ? ' (you)' : ''}
          </span>
          <span className="feed-time">{timeAgo(post.createdAt)}</span>
        </div>
        <span className="room-chip">
          <span aria-hidden="true">{ROOM_EMOJI[post.room]}</span>
          {ROOM_LABEL[post.room]}
        </span>
      </header>

      <div className="feed-photo">
        <img src={post.photoUrl} alt={`${post.displayName}: ${post.challengeTitle}`} loading="lazy" />
        <span className="feed-points">+{post.points}</span>
      </div>

      <p className="feed-caption">{post.challengeTitle}</p>

      <div className="reaction-bar" role="group" aria-label="React to this move">
        {reactions.map((r) => (
          <button
            key={r.emoji}
            type="button"
            className={`reaction ${r.mine ? 'mine' : ''}`}
            aria-pressed={r.mine}
            onClick={() => void toggleReaction(r.emoji)}
          >
            <span aria-hidden="true">{r.emoji}</span>
            {r.count > 0 ? <span className="reaction-count">{r.count}</span> : null}
          </button>
        ))}
      </div>

      {comments.length > 0 ? (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id}>
              <span className="comment-author">{c.displayName}</span>
              <span className="comment-body">{c.body}</span>
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
          className="ghost-btn"
          disabled={busy || draft.trim().length < 1}
        >
          Post
        </button>
      </form>
    </article>
  )
}
