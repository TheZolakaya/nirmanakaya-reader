'use client';

// === COMMUNITY HUB ===
// Discussion forum with collapsible conversations

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getDiscussions, createDiscussion, getUser, updateLastHubVisit, ensureProfile, REACTION_EMOJIS, toggleReaction } from '../../lib/supabase';

const TOPIC_TYPES = [
  { value: 'general', label: 'General', color: 'text-zinc-400' },
  { value: 'archetype', label: 'Archetypes', color: 'text-amber-400' },
  { value: 'bound', label: 'Bounds', color: 'text-cyan-400' },
  { value: 'agent', label: 'Agents', color: 'text-emerald-400' },
  { value: 'reading', label: 'Readings', color: 'text-rose-400' },
  { value: 'concept', label: 'Concepts', color: 'text-violet-400' },
  { value: 'feedback', label: 'Feedback & Support', color: 'text-orange-400' }
];

export default function HubPage() {
  const router = useRouter();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState(null); // null = all
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTopicType, setNewTopicType] = useState('general');
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState({}); // { discussionId: true/false }

  useEffect(() => {
    async function loadData() {
      const { user } = await getUser();
      setUser(user);

      // Ensure profile exists and mark hub as visited
      if (user) {
        await ensureProfile();
        await updateLastHubVisit();
      }

      const { data, error } = await getDiscussions({ topicType: filter });
      if (error) {
        console.error('Failed to load discussions:', error);
      }
      setDiscussions(data || []);
      setLoading(false);
    }
    loadData();
  }, [filter]);

  async function handlePost() {
    if (!newTitle.trim() || !newContent.trim()) return;

    setPosting(true);
    const { data, error } = await createDiscussion({
      title: newTitle.trim(),
      content: newContent.trim(),
      topicType: newTopicType
    });

    if (error) {
      console.error('Failed to create discussion:', error);
      alert('Failed to create discussion');
    } else {
      setDiscussions([{ ...data, profiles: { display_name: user?.email?.split('@')[0] } }, ...discussions]);
      setNewTitle('');
      setNewContent('');
      setShowNewPost(false);
    }
    setPosting(false);
  }

  function formatDate(dateStr) {
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

  function getTopicColor(type) {
    return TOPIC_TYPES.find(t => t.value === type)?.color || 'text-zinc-400';
  }

  function getTopicLabel(type) {
    return TOPIC_TYPES.find(t => t.value === type)?.label || type;
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Count reactions by emoji
  function getReactionCounts(reactions) {
    const counts = {};
    (reactions || []).forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  }

  // Check if user reacted with emoji
  function userReacted(reactions, emoji) {
    return (reactions || []).some(r => r.emoji === emoji && r.user_id === user?.id);
  }

  // Handle reaction toggle
  async function handleReaction(e, discussionId, emoji) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }

    const { action, error } = await toggleReaction({ discussionId, emoji });
    if (error) return;

    // Update local state
    setDiscussions(prev => prev.map(d => {
      if (d.id !== discussionId) return d;
      const reactions = d.reactions || [];
      if (action === 'added') {
        return { ...d, reactions: [...reactions, { emoji, user_id: user.id }] };
      } else {
        return { ...d, reactions: reactions.filter(r => !(r.emoji === emoji && r.user_id === user.id)) };
      }
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500">Loading discussions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-light">Community Hub</h1>
              <p className="text-xs text-zinc-600 italic">Nirmanakaya — discovered through the math of faith</p>
            </div>
          </div>
          {user && (
            <button
              onClick={() => setShowNewPost(true)}
              className="px-4 py-2 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors text-sm"
            >
              New Post
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-zinc-800/30">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                filter === null
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All
            </button>
            {TOPIC_TYPES.map(topic => (
              <button
                key={topic.value}
                onClick={() => setFilter(topic.value)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  filter === topic.value
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {!user && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/30 rounded-lg text-center">
            <p className="text-amber-400/80 text-sm mb-2">Sign in to join the conversation</p>
            <button
              onClick={() => window.dispatchEvent(new Event('open-auth-modal'))}
              className="px-4 py-2 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors text-sm"
            >
              Sign In
            </button>
          </div>
        )}

        {discussions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-zinc-600 mb-2">No discussions yet</div>
            <div className="text-zinc-500 text-sm">Be the first to start a conversation</div>
          </div>
        ) : (
          <div className="space-y-3">
            {discussions.map(discussion => {
              const isExpanded = expanded[discussion.id];
              const reactionCounts = getReactionCounts(discussion.reactions);
              const hasReactions = Object.values(reactionCounts).some(c => c > 0);
              const topReplies = discussion.topReplies || [];
              const totalReplies = discussion.reply_count || 0;

              return (
                <div
                  key={discussion.id}
                  className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg hover:border-zinc-700/50 transition-colors overflow-hidden"
                >
                  {/* Main discussion header - always visible */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => toggleExpand(discussion.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs ${getTopicColor(discussion.topic_type)}`}>
                            {getTopicLabel(discussion.topic_type)}
                          </span>
                          <span className="text-zinc-600 text-xs">
                            {formatDate(discussion.created_at)}
                          </span>
                        </div>
                        <h3 className="text-zinc-200 font-medium mb-1">
                          {discussion.title}
                        </h3>
                        <p className="text-zinc-500 text-sm line-clamp-2">
                          {discussion.content.slice(0, 150)}
                          {discussion.content.length > 150 ? '...' : ''}
                        </p>

                        {/* Inline reactions and reply count */}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          {/* Reaction buttons */}
                          <div className="flex items-center gap-1">
                            {REACTION_EMOJIS.map(emoji => {
                              const count = reactionCounts[emoji] || 0;
                              const reacted = userReacted(discussion.reactions, emoji);
                              return (
                                <button
                                  key={emoji}
                                  onClick={(e) => handleReaction(e, discussion.id, emoji)}
                                  className={`px-1.5 py-0.5 rounded text-sm transition-all ${
                                    reacted
                                      ? 'bg-amber-600/30 border border-amber-500/50'
                                      : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50'
                                  }`}
                                >
                                  {emoji}
                                  {count > 0 && <span className="ml-0.5 text-zinc-400 text-xs">{count}</span>}
                                </button>
                              );
                            })}
                          </div>

                          {/* Author and reply count */}
                          <span className="text-xs text-zinc-600">
                            by <Link
                              href={`/profile/${discussion.user_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-amber-400 transition-colors"
                            >
                              {discussion.profiles?.display_name || 'Anonymous'}
                            </Link>
                          </span>
                          <span className="flex items-center gap-1 text-xs text-zinc-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
                          </span>

                          {/* Expand indicator */}
                          <span className="ml-auto text-zinc-600 text-xs">
                            {isExpanded ? '▼' : '▶'} {isExpanded ? 'collapse' : 'expand'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded content - top 3 replies */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800/50">
                      {topReplies.length > 0 ? (
                        <div className="p-4 pt-3 space-y-3">
                          {topReplies.map(reply => (
                            <div key={reply.id} className="pl-4 border-l-2 border-zinc-700/50">
                              <div className="text-zinc-400 text-sm line-clamp-2">
                                {reply.content.slice(0, 120)}
                                {reply.content.length > 120 ? '...' : ''}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-600">
                                <span>{reply.profiles?.display_name || 'Anonymous'}</span>
                                <span>•</span>
                                <span>{formatDate(reply.created_at)}</span>
                                {/* Reply reactions */}
                                {(reply.reactions || []).length > 0 && (
                                  <span className="flex items-center gap-1 ml-2">
                                    {REACTION_EMOJIS.map(emoji => {
                                      const count = (reply.reactions || []).filter(r => r.emoji === emoji).length;
                                      if (count === 0) return null;
                                      return <span key={emoji}>{emoji}{count > 1 && count}</span>;
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Link to full discussion */}
                          <div className="pt-2">
                            <Link
                              href={`/hub/${discussion.id}`}
                              className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
                            >
                              {totalReplies > 3
                                ? `View all ${totalReplies} replies →`
                                : 'View full discussion →'}
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 pt-3">
                          <div className="text-zinc-600 text-sm mb-2">No replies yet</div>
                          <Link
                            href={`/hub/${discussion.id}`}
                            className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
                          >
                            Be the first to reply →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowNewPost(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-lg p-6">
            <button
              onClick={() => setShowNewPost(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-zinc-100 mb-4">New Discussion</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Topic</label>
                <select
                  value={newTopicType}
                  onChange={(e) => setNewTopicType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-amber-600/50"
                >
                  {TOPIC_TYPES.map(topic => (
                    <option key={topic.value} value={topic.value}>{topic.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-amber-600/50"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Share your thoughts, questions, or insights..."
                  rows={5}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-amber-600/50 resize-none"
                />
              </div>

              <button
                onClick={handlePost}
                disabled={posting || !newTitle.trim() || !newContent.trim()}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {posting ? 'Posting...' : 'Post Discussion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
