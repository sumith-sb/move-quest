import { Send, SmilePlus } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { commentOnPost, reactToPost } from '../api'
import { iconForChallenge } from '../challengeIcon'
import { cue } from '../feedback'
import { timeAgo } from '../labels'
import type { FeedComment, FeedItem, ReactionSummary } from '../types'
import { Avatar } from './Avatar'
import { EmojiPicker } from './EmojiPicker'

interface Props {
  item: FeedItem
  userId: string
  /** When provided, the author name/avatar links to that user's profile. */
  onOpenProfile?: (userId: string) => void
}

/** How many recent comments to show before the list is expanded. */
const COMMENT_PREVIEW = 2

/**
 * A single feed post with reactions + comments. Shared by the Home feed
 * (inline list) and the profile page (inside a floating post modal).
 */
export function PostCard({ item, userId, onOpenProfile }: Props) {
  const isMine = item.userId === userId
  const [reactions, setReactions] = useState<ReactionSummary[]>(item.reactions)
  const [comments, setComments] = useState<FeedComment[]>(item.comments)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const [reactError, setReactError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const TaskIcon = iconForChallenge({
    title: item.challengeTitle,
    prompt: item.challengePrompt,
  })

  useEffect(() => {
    setReactions(item.reactions)
    setComments(item.comments)
  }, [item.reactions, item.comments])

  function grow() {
    const el = inputRef.current
    if (!el) return
    const max = 140
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
    // Only allow scrolling once the box hits its max height; otherwise the
    // textarea shows an awkward scrollbar while it's still growing.
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
  }

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

  async function postComment() {
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const comment = await commentOnPost(item.attemptId, body)
      cue.tick()
      setComments((cur) => [...cur, comment])
      setDraft('')
      requestAnimationFrame(grow)
    } catch {
      // Keep the draft so the user can retry.
    } finally {
      setBusy(false)
    }
  }

  function onCommentSubmit(e: FormEvent) {
    e.preventDefault()
    void postComment()
  }

  function onCommentKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter submits; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void postComment()
    }
  }

  const canOpenProfile = Boolean(onOpenProfile)
  const hasHiddenComments = comments.length > COMMENT_PREVIEW
  const visibleComments =
    commentsExpanded || !hasHiddenComments
      ? comments
      : comments.slice(-COMMENT_PREVIEW)

  return (
    <article className={`feed-card ${isMine ? 'is-mine' : ''}`}>
      <header className="feed-head">
        {canOpenProfile ? (
          <button
            type="button"
            className="feed-author-link"
            onClick={() => onOpenProfile?.(item.userId)}
            aria-label={`View ${item.displayName}'s profile`}
          >
            <Avatar name={item.displayName} size={40} />
          </button>
        ) : (
          <Avatar name={item.displayName} size={40} />
        )}
        <div className="feed-id">
          <span className="feed-author">
            {canOpenProfile ? (
              <button
                type="button"
                className="feed-author-name"
                onClick={() => onOpenProfile?.(item.userId)}
              >
                {item.displayName}
              </button>
            ) : (
              item.displayName
            )}
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
          <div className="feed-photo">
            <img
              src={item.photoUrl}
              alt={`${item.displayName}: ${item.challengeTitle}`}
              loading="lazy"
            />
          </div>
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
            <>
              {hasHiddenComments && !commentsExpanded ? (
                <button
                  type="button"
                  className="comment-toggle"
                  onClick={() => setCommentsExpanded(true)}
                >
                  View all {comments.length} comments
                </button>
              ) : null}
              <ul className={`comment-list ${commentsExpanded ? 'expanded' : ''}`}>
                {visibleComments.map((c) => (
                  <li key={c.id}>
                    <Avatar name={c.displayName} avatarUrl={c.avatarUrl} size={26} />
                    <span className="comment-text">
                      <span className="comment-author">{c.displayName}</span>
                      <span className="comment-body">{c.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {hasHiddenComments && commentsExpanded ? (
                <button
                  type="button"
                  className="comment-toggle"
                  onClick={() => setCommentsExpanded(false)}
                >
                  Show fewer comments
                </button>
              ) : null}
            </>
          ) : null}

          <form className="comment-form" onSubmit={onCommentSubmit}>
            <textarea
              ref={inputRef}
              rows={1}
              maxLength={280}
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                grow()
              }}
              onKeyDown={onCommentKeyDown}
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
