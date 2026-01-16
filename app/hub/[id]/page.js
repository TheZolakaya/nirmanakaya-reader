'use client';

// === DISCUSSION DETAIL ===
// View a discussion and its replies

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getDiscussion, createReply, deleteDiscussion, deleteReply, getUser, isAdmin, toggleReaction, getDiscussionReactions, getReplyReactions, REACTION_EMOJIS } from '../../../lib/supabase';

const TOPIC_COLORS = {
  general: 'text-zinc-400',
  archetype: 'text-amber-400',
  bound: 'text-cyan-400',
  agent: 'text-emerald-400',
  reading: 'text-rose-400',
  concept: 'text-violet-400'
};

export default function DiscussionPage({ params }) {
  const router = useRouter();
  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [discussionReactions, setDiscussionReactions] = useState([]);
  const [replyReactions, setReplyReactions] = useState({}); // { replyId: [reactions] }

  useEffect(() => {
    async function loadData() {
      const { user } = await getUser();
      setUser(user);

      const { data, error } = await getDiscussion(params.id);
      if (error || !data) {
        setError('Discussion not found');
        setLoading(false);
        return;
      }
      setDiscussion(data);
      setLoading(false);

      // Load reactions for discussion
      const { data: discReactions } = await getDiscussionReactions(params.id);
      setDiscussionReactions(discReactions || []);

      // Load reactions for all replies
      if (data.replies?.length > 0) {
        const replyReactionsMap = {};
        await Promise.all(
          data.replies.map(async (reply) => {
            const { data: reactions } = await getReplyReactions(reply.id);
            replyReactionsMap[reply.id] = reactions || [];
          })
        );
        setReplyReactions(replyReactionsMap);
      }
    }
    loadData();
  }, [params.id]);

  async function handleReply() {
    if (!replyContent.trim()) return;

    setPosting(true);
    const { data, error } = await createReply(params.id, replyContent.trim());

    if (error) {
      console.error('Failed to create reply:', error);
      alert('Failed to post reply');
    } else {
      setDiscussion(prev => ({
        ...prev,
        replies: [...(prev.replies || []), data],
        reply_count: (prev.reply_count || 0) + 1
      }));
      setReplyContent('');

      // Send notification to discussion owner (async, don't block UI)
      fetch('/api/email/reply-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discussionId: params.id,
          replyContent: replyContent.trim(),
          replyAuthorId: user?.id
        })
      }).catch(err => console.error('Reply notification failed:', err));
    }
    setPosting(false);
  }

  async function handleDeleteDiscussion() {
    if (!window.confirm('Delete this discussion? This cannot be undone.')) return;

    setDeleting(true);
    const { error } = await deleteDiscussion(params.id);

    if (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete discussion');
      setDeleting(false);
    } else {
      router.push('/hub');
    }
  }

  async function handleDeleteReply(replyId) {
    if (!window.confirm('Delete this reply?')) return;

    const { error } = await deleteReply(replyId, params.id);

    if (error) {
      console.error('Failed to delete reply:', error);
    } else {
      setDiscussion(prev => ({
        ...prev,
        replies: prev.replies.filter(r => r.id !== replyId),
        reply_count: Math.max(0, (prev.reply_count || 1) - 1)
      }));
    }
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function formatRelative(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  async function handleReaction(emoji, discussionId = null, replyId = null) {
    if (!user) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }

    const { action, error } = await toggleReaction({
      discussionId,
      replyId,
      emoji
    });

    if (error) {
      console.error('Failed to toggle reaction:', error);
      return;
    }

    // Update local state
    if (discussionId) {
      if (action === 'added') {
        setDiscussionReactions(prev => [...prev, { emoji, user_id: user.id }]);
      } else {
        setDiscussionReactions(prev =>
          prev.filter(r => !(r.emoji === emoji && r.user_id === user.id))
        );
      }
    } else if (replyId) {
      if (action === 'added') {
        setReplyReactions(prev => ({
          ...prev,
          [replyId]: [...(prev[replyId] || []), { emoji, user_id: user.id }]
        }));
      } else {
        setReplyReactions(prev => ({
          ...prev,
          [replyId]: (prev[replyId] || []).filter(r => !(r.emoji === emoji && r.user_id === user.id))
        }));
      }
    }
  }

  // Reaction bar component
  function ReactionBar({ reactions, discussionId = null, replyId = null }) {
    // Count reactions by emoji
    const counts = {};
    REACTION_EMOJIS.forEach(emoji => {
      counts[emoji] = reactions.filter(r => r.emoji === emoji).length;
    });

    // Check if current user has reacted with each emoji
    const userReacted = {};
    REACTION_EMOJIS.forEach(emoji => {
      userReacted[emoji] = reactions.some(r => r.emoji === emoji && r.user_id === user?.id);
    });

    return (
      <div className="flex items-center gap-1 mt-2">
        {REACTION_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji, discussionId, replyId)}
            className={`px-2 py-1 rounded-md text-sm transition-all ${
              userReacted[emoji]
                ? 'bg-amber-600/30 border border-amber-500/50'
                : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50'
            }`}
            title={user ? (userReacted[emoji] ? 'Remove reaction' : 'Add reaction') : 'Sign in to react'}
          >
            <span>{emoji}</span>
            {counts[emoji] > 0 && (
              <span className="ml-1 text-zinc-400 text-xs">{counts[emoji]}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500">Loading discussion...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 mb-4">{error}</div>
          <Link
            href="/hub"
            className="inline-block px-6 py-3 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors"
          >
            Back to Hub
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === discussion.user_id;
  const userIsAdmin = isAdmin(user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hub" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <span className="text-zinc-400 text-sm">Back to Hub</span>
          </div>
          {(isAuthor || userIsAdmin) && (
            <button
              onClick={handleDeleteDiscussion}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg bg-rose-900/20 text-rose-400 hover:bg-rose-900/30 transition-colors text-xs disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Discussion */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs ${TOPIC_COLORS[discussion.topic_type] || 'text-zinc-400'}`}>
              {discussion.topic_type?.charAt(0).toUpperCase() + discussion.topic_type?.slice(1) || 'General'}
            </span>
            <span className="text-zinc-600 text-xs">
              {formatDate(discussion.created_at)}
            </span>
          </div>

          <h1 className="text-2xl font-medium text-zinc-100 mb-4">
            {discussion.title}
          </h1>

          <div className="text-zinc-300 leading-relaxed mb-4">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="text-zinc-200">{children}</strong>,
                a: ({ href, children }) => (
                  <a href={href} className="text-amber-400 hover:text-amber-300 underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                )
              }}
            >
              {discussion.content}
            </ReactMarkdown>
          </div>

          <div className="text-sm text-zinc-500">
            Posted by{' '}
            <Link
              href={`/profile/${discussion.user_id}`}
              className="hover:text-amber-400 transition-colors"
            >
              {discussion.profiles?.display_name || 'Anonymous'}
            </Link>
          </div>

          <ReactionBar reactions={discussionReactions} discussionId={params.id} />
        </div>

        {/* Reply divider */}
        <div className="border-t border-zinc-800/50 pt-6 mb-6">
          <h2 className="text-sm text-zinc-400 mb-4">
            {(discussion.replies?.length || 0)} {(discussion.replies?.length || 0) === 1 ? 'Reply' : 'Replies'}
          </h2>
        </div>

        {/* Replies */}
        {discussion.replies?.length > 0 && (
          <div className="space-y-4 mb-8">
            {discussion.replies.map(reply => (
              <div
                key={reply.id}
                className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-zinc-300 text-sm leading-relaxed mb-2">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>
                        }}
                      >
                        {reply.content}
                      </ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <Link
                        href={`/profile/${reply.user_id}`}
                        className="hover:text-amber-400 transition-colors"
                      >
                        {reply.profiles?.display_name || 'Anonymous'}
                      </Link>
                      <span>{formatRelative(reply.created_at)}</span>
                    </div>
                    <ReactionBar reactions={replyReactions[reply.id] || []} replyId={reply.id} />
                  </div>
                  {(user?.id === reply.user_id || userIsAdmin) && (
                    <button
                      onClick={() => handleDeleteReply(reply.id)}
                      className="text-zinc-600 hover:text-rose-400 transition-colors"
                      title="Delete reply"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reply form */}
        {user ? (
          <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-amber-600/50 resize-none mb-3"
            />
            <div className="flex justify-end">
              <button
                onClick={handleReply}
                disabled={posting || !replyContent.trim()}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-center">
            <p className="text-zinc-500 text-sm mb-3">Sign in to reply</p>
            <button
              onClick={() => window.dispatchEvent(new Event('open-auth-modal'))}
              className="px-4 py-2 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors text-sm"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
