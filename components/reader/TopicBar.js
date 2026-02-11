'use client';

// === TOPIC BAR ===
// Shows saved recurring topics as pills above the question input
// Click a topic to pre-fill the question and set topic_id for reading
// Max 7 active topics

import { useState, useEffect, useCallback } from 'react';
import { getSession } from '../../lib/supabase';

export default function TopicBar({ onSelectTopic, activeTopic, currentUser }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(null); // topic id for context menu
  const [renaming, setRenaming] = useState(null); // topic id being renamed
  const [renameValue, setRenameValue] = useState('');

  const loadTopics = useCallback(async () => {
    if (!currentUser) return;
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/user/topics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTopics(data.topics || []);
      }
    } catch (e) {
      console.error('Failed to load topics:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  if (!currentUser || topics.length === 0) return null;

  const handleSelect = (topic) => {
    if (activeTopic?.id === topic.id) {
      // Deselect
      onSelectTopic?.(null);
    } else {
      onSelectTopic?.(topic);
    }
    setShowMenu(null);
  };

  const handleRename = async (topicId) => {
    if (!renameValue.trim()) return;
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      await fetch('/api/user/topics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: topicId, label: renameValue.trim() })
      });
      setRenaming(null);
      setRenameValue('');
      loadTopics();
    } catch (e) {
      console.error('Rename failed:', e);
    }
  };

  const handleArchive = async (topicId) => {
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      await fetch('/api/user/topics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: topicId, archived: true })
      });
      setShowMenu(null);
      if (activeTopic?.id === topicId) onSelectTopic?.(null);
      loadTopics();
    } catch (e) {
      console.error('Archive failed:', e);
    }
  };

  return (
    <div className="flex items-center gap-2 max-w-2xl mx-auto mb-2 px-1 overflow-x-auto scrollbar-hide">
      <span className="text-[10px] text-zinc-600 uppercase tracking-wide whitespace-nowrap flex-shrink-0">Topics</span>
      <div className="flex gap-1.5 flex-wrap">
        {topics.map(topic => (
          <div key={topic.id} className="relative">
            {renaming === topic.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => setRenaming(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(topic.id);
                  if (e.key === 'Escape') setRenaming(null);
                }}
                className="px-2 py-0.5 text-xs rounded-full bg-zinc-800 border border-zinc-600 text-zinc-200 outline-none w-32"
              />
            ) : (
              <button
                onClick={() => handleSelect(topic)}
                onContextMenu={(e) => { e.preventDefault(); setShowMenu(showMenu === topic.id ? null : topic.id); }}
                className={`px-3 py-1 text-xs rounded-full transition-all whitespace-nowrap ${
                  activeTopic?.id === topic.id
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600 hover:text-zinc-300'
                }`}
                title={`${topic.label} (${topic.reading_count} readings) — right-click for options`}
              >
                {topic.label.length > 25 ? topic.label.slice(0, 25) + '...' : topic.label}
                {topic.reading_count > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-60">{topic.reading_count}</span>
                )}
              </button>
            )}

            {/* Context menu */}
            {showMenu === topic.id && (
              <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
                <button
                  onClick={() => { setRenaming(topic.id); setRenameValue(topic.label); setShowMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  Rename
                </button>
                <a
                  href={`/topics/${topic.id}`}
                  className="block px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                  onClick={() => setShowMenu(null)}
                >
                  View Stats
                </a>
                <button
                  onClick={() => handleArchive(topic.id)}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700"
                >
                  Archive
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
      )}
    </div>
  );
}
