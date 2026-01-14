'use client';

// === JOURNAL PAGE ===
// View and reload saved readings

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getReadings, getUser, deleteReading, setReadingPublic } from '../../lib/supabase';
import { getComponent } from '../../lib/corrections';
import { STATUSES } from '../../lib/constants';

export default function JournalPage() {
  const router = useRouter();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    async function loadData() {
      const { user } = await getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);

      const { data, error } = await getReadings(100);
      if (error) {
        console.error('Failed to load readings:', error);
      }
      setReadings(data || []);
      setLoading(false);
    }
    loadData();
  }, [router]);

  async function handleDelete(id) {
    if (!window.confirm('Delete this reading? This cannot be undone.')) return;

    setDeletingId(id);
    const { error } = await deleteReading(id);
    if (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete reading');
    } else {
      setReadings(readings.filter(r => r.id !== id));
    }
    setDeletingId(null);
  }

  async function handleTogglePublic(id, currentState) {
    const { data, error } = await setReadingPublic(id, !currentState);
    if (error) {
      console.error('Failed to toggle public:', error);
    } else {
      setReadings(readings.map(r => r.id === id ? { ...r, is_public: !currentState, share_slug: data.share_slug } : r));
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

  function getModeLabel(mode) {
    const labels = {
      reflect: 'Reflect',
      discover: 'Discover',
      forge: 'Forge',
      explore: 'Explore',
      firstContact: 'First Contact'
    };
    return labels[mode] || mode;
  }

  function getModeColor(mode) {
    const colors = {
      reflect: 'text-cyan-400',
      discover: 'text-amber-400',
      forge: 'text-rose-400',
      explore: 'text-emerald-400',
      firstContact: 'text-violet-400'
    };
    return colors[mode] || 'text-zinc-400';
  }

  function getCardSummary(cards) {
    if (!cards || !Array.isArray(cards)) return 'No cards';
    return cards.slice(0, 3).map(card => {
      const trans = getComponent(card.transient);
      return trans?.name || `Card ${card.transient}`;
    }).join(', ') + (cards.length > 3 ? ` +${cards.length - 3} more` : '');
  }

  function truncateQuestion(q, maxLen = 80) {
    if (!q) return 'No question';
    if (q.length <= maxLen) return q;
    return q.slice(0, maxLen) + '...';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500">Loading your readings...</div>
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
            <h1 className="text-xl font-light">Your Journal</h1>
          </div>
          <div className="text-sm text-zinc-500">
            {readings.length} reading{readings.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {readings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-zinc-600 mb-4">No saved readings yet</div>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors"
            >
              Create your first reading
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {readings.map(reading => (
              <div
                key={reading.id}
                className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden hover:border-zinc-700/50 transition-colors"
              >
                {/* Reading header - always visible */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === reading.id ? null : reading.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${getModeColor(reading.mode)}`}>
                          {getModeLabel(reading.mode)}
                        </span>
                        <span className="text-zinc-600 text-xs">
                          {formatDate(reading.created_at)}
                        </span>
                        {reading.is_public && (
                          <span className="text-xs text-emerald-500/70 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            shared
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-300 text-sm mb-2">
                        {truncateQuestion(reading.question)}
                      </div>
                      <div className="text-zinc-500 text-xs">
                        {getCardSummary(reading.cards)}
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-zinc-600 transition-transform ${expandedId === reading.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === reading.id && (
                  <div className="border-t border-zinc-800/50 p-4 bg-zinc-900/30">
                    {/* Token usage */}
                    {(reading.input_tokens || reading.output_tokens) && (
                      <div className="text-xs text-zinc-500 mb-4 flex gap-4">
                        <span>Input: {(reading.input_tokens || 0).toLocaleString()} tokens</span>
                        <span>Output: {(reading.output_tokens || 0).toLocaleString()} tokens</span>
                        <span>Cost: ${(reading.estimated_cost || 0).toFixed(4)}</span>
                      </div>
                    )}

                    {/* Cards preview */}
                    {reading.cards && Array.isArray(reading.cards) && (
                      <div className="mb-4">
                        <div className="text-xs text-zinc-400 mb-2">Cards drawn:</div>
                        <div className="flex flex-wrap gap-2">
                          {reading.cards.map((card, i) => {
                            const trans = getComponent(card.transient);
                            const status = STATUSES[card.status];
                            return (
                              <div
                                key={i}
                                className="text-xs px-2 py-1 rounded bg-zinc-800/50 border border-zinc-700/50"
                              >
                                <span className="text-zinc-300">{trans?.name || `Card ${card.transient}`}</span>
                                <span className="text-zinc-500 ml-1">({status?.name || 'Unknown'})</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Letter preview */}
                    {reading.letter && (
                      <div className="mb-4">
                        <div className="text-xs text-zinc-400 mb-2">Letter:</div>
                        <div className="text-sm text-zinc-400 bg-zinc-800/30 rounded p-3 max-h-32 overflow-hidden relative">
                          {typeof reading.letter === 'object'
                            ? (reading.letter.wade || reading.letter.surface || 'No letter content')
                            : reading.letter.slice(0, 300)}
                          {(typeof reading.letter === 'string' && reading.letter.length > 300) && (
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-800/50 to-transparent" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Link
                        href={`/?load=${reading.id}`}
                        className="text-xs px-3 py-1.5 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 transition-colors"
                      >
                        Reload Reading
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePublic(reading.id, reading.is_public);
                        }}
                        className="text-xs px-3 py-1.5 rounded bg-zinc-800/50 text-zinc-400 hover:text-zinc-300 transition-colors"
                      >
                        {reading.is_public ? 'Make Private' : 'Make Public'}
                      </button>
                      {reading.is_public && reading.share_slug && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${window.location.origin}/r/${reading.share_slug}`);
                            alert('Link copied!');
                          }}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-800/50 text-emerald-400 hover:bg-zinc-700/50 transition-colors"
                        >
                          Copy Link
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(reading.id);
                        }}
                        disabled={deletingId === reading.id}
                        className="text-xs px-3 py-1.5 rounded bg-rose-900/20 text-rose-400 hover:bg-rose-900/30 transition-colors disabled:opacity-50"
                      >
                        {deletingId === reading.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
