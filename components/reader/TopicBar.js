'use client';

// === TOPIC BAR ===
// Shows saved recurring topics as pills above the question input
// Click a topic to pre-fill the question and set topic_id for reading
// "+" button saves current question as new topic (max 7 active)
// Pencil icon toggles edit mode: tap pill to rename, X to delete

import { useState, useEffect, useCallback } from 'react';
import { getSession } from '../../lib/supabase';

export default function TopicBar({ onSelectTopic, activeTopic, currentUser, question = '' }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [renaming, setRenaming] = useState(null); // topic id being renamed
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // topic id awaiting delete confirmation

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
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  if (!currentUser || loading) return null;

  const canCreate = question.trim().length > 2 && topics.length < 7;
  const isDuplicate = topics.some(t => t.label.toLowerCase() === question.trim().toLowerCase());

  const handleCreate = async () => {
    if (!canCreate || isDuplicate || creating) return;
    setCreating(true);
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/user/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ label: question.trim() })
      });
      const data = await res.json();
      if (data.success && data.topic) {
        await loadTopics();
        onSelectTopic?.(data.topic);
      }
    } catch (e) {
      console.error('Create topic failed:', e);
    }
    setCreating(false);
  };

  const handleSelect = (topic) => {
    if (editMode) {
      // In edit mode, clicking a pill starts rename
      setRenaming(topic.id);
      setRenameValue(topic.label);
      return;
    }
    if (activeTopic?.id === topic.id) {
      onSelectTopic?.(null);
    } else {
      onSelectTopic?.(topic);
    }
  };

  const handleRename = async (topicId) => {
    if (!renameValue.trim()) { setRenaming(null); return; }
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

  const handleDelete = async (topicId) => {
    try {
      const session = await getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      await fetch('/api/user/topics', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: topicId })
      });
      setConfirmDelete(null);
      if (activeTopic?.id === topicId) onSelectTopic?.(null);
      loadTopics();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    setRenaming(null);
    setConfirmDelete(null);
  };

  // Show bar if there are topics OR if the user can create one
  if (topics.length === 0 && !canCreate) return null;

  return (
    <div className="flex items-center gap-2 max-w-2xl mx-auto mb-2 px-1 overflow-x-auto scrollbar-hide">
      <span className="text-[10px] text-zinc-600 uppercase tracking-wide whitespace-nowrap flex-shrink-0">Topics</span>
      <div className="flex gap-1.5 flex-wrap items-center">
        {topics.map(topic => (
          <div key={topic.id} className="relative flex items-center">
            {renaming === topic.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRename(topic.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(topic.id);
                  if (e.key === 'Escape') { setRenaming(null); setRenameValue(''); }
                }}
                className="px-2 py-0.5 text-xs rounded-full bg-zinc-800 border border-amber-500/40 text-zinc-200 outline-none w-36"
              />
            ) : (
              <>
                <button
                  onClick={() => handleSelect(topic)}
                  className={`px-3 py-1 text-xs rounded-full transition-all whitespace-nowrap flex items-center gap-1 ${
                    editMode
                      ? 'bg-zinc-800/80 text-zinc-300 border border-dashed border-zinc-600 hover:border-amber-500/40'
                      : activeTopic?.id === topic.id
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                  title={editMode ? 'Tap to rename' : `${topic.label} (${topic.reading_count} readings)`}
                >
                  {topic.is_private && (
                    <svg className="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                  {topic.label.length > 25 ? topic.label.slice(0, 25) + '...' : topic.label}
                  {!editMode && topic.reading_count > 0 && (
                    <span className="ml-1 text-[10px] opacity-60">{topic.reading_count}</span>
                  )}
                </button>
                {/* Delete X — only in edit mode */}
                {editMode && (
                  confirmDelete === topic.id ? (
                    <div className="flex items-center ml-1 gap-1">
                      <button
                        onClick={() => handleDelete(topic.id)}
                        className="text-[10px] text-red-400 font-medium hover:text-red-300"
                      >
                        yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300"
                      >
                        no
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(topic.id)}
                      className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete topic"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )
                )}
              </>
            )}
          </div>
        ))}

        {/* Create new topic button */}
        {!editMode && canCreate && !isDuplicate && (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-2 py-1 text-xs rounded-full bg-zinc-800/40 text-zinc-500 border border-dashed border-zinc-700/50 hover:border-amber-500/40 hover:text-amber-400 transition-all whitespace-nowrap"
            title="Save current question as a recurring topic"
          >
            {creating ? '...' : '+ Save topic'}
          </button>
        )}

        {/* At limit indicator */}
        {!editMode && topics.length >= 7 && (
          <span className="text-[10px] text-zinc-600 self-center">7/7</span>
        )}
      </div>

      {/* Edit mode toggle — only show when topics exist */}
      {topics.length > 0 && (
        <button
          onClick={toggleEditMode}
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors ${
            editMode
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-zinc-600 hover:text-zinc-400'
          }`}
          title={editMode ? 'Done editing' : 'Edit topics'}
        >
          {editMode ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
