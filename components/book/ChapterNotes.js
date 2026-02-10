'use client';

import { useState, useEffect } from 'react';
import {
  getChapterNotes, addNote, editNote, deleteNote,
  getNoteCount, getNotesVisible, setNotesVisible,
} from '../../lib/book-notes';
import {
  getPublicAnnotations, createAnnotation, updateAnnotation, deleteAnnotation,
} from '../../lib/book-annotations';
import { getUser } from '../../lib/supabase';

export default function ChapterNotes({ slug }) {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('community');

  // Personal notes (localStorage)
  const [notes, setNotes] = useState([]);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Community annotations (Supabase)
  const [annotations, setAnnotations] = useState([]);
  const [annotationText, setAnnotationText] = useState('');
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [user, setUser] = useState(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState(null);
  const [editAnnotationText, setEditAnnotationText] = useState('');

  const [noteCount, setNoteCount] = useState(0);
  const [annotationCount, setAnnotationCount] = useState(0);

  useEffect(() => {
    setVisible(getNotesVisible());
    refreshNotes();
    checkUser();
  }, [slug]);

  useEffect(() => {
    if (visible && activeTab === 'community') {
      loadAnnotations();
    }
  }, [visible, activeTab, slug]);

  const checkUser = async () => {
    const { user: u } = await getUser();
    setUser(u);
  };

  const refreshNotes = () => {
    const n = getChapterNotes(slug);
    setNotes(n);
    setNoteCount(n.length);
  };

  const loadAnnotations = async () => {
    setLoadingAnnotations(true);
    const data = await getPublicAnnotations(slug);
    setAnnotations(data);
    setAnnotationCount(data.length);
    setLoadingAnnotations(false);
  };

  const toggleVisible = () => {
    const next = !visible;
    setVisible(next);
    setNotesVisible(next);
  };

  // --- Personal notes ---
  const handleAddNote = () => {
    if (!newText.trim()) return;
    addNote(slug, newText);
    setNewText('');
    refreshNotes();
  };

  const handleEditNote = (id) => {
    const note = notes.find(n => n.id === id);
    if (note) { setEditingId(id); setEditText(note.text); }
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      editNote(slug, editingId, editText);
      setEditingId(null); setEditText('');
      refreshNotes();
    }
  };

  const handleDeleteNote = (id) => {
    deleteNote(slug, id);
    refreshNotes();
  };

  // --- Community annotations ---
  const handleAddAnnotation = async () => {
    if (!annotationText.trim() || !user) return;
    const { error } = await createAnnotation(slug, annotationText, true);
    if (!error) { setAnnotationText(''); loadAnnotations(); }
  };

  const handleEditAnnotation = (ann) => {
    setEditingAnnotationId(ann.id);
    setEditAnnotationText(ann.content);
  };

  const handleSaveAnnotationEdit = async () => {
    if (editingAnnotationId && editAnnotationText.trim()) {
      await updateAnnotation(editingAnnotationId, editAnnotationText);
      setEditingAnnotationId(null); setEditAnnotationText('');
      loadAnnotations();
    }
  };

  const handleDeleteAnnotation = async (id) => {
    await deleteAnnotation(id);
    loadAnnotations();
  };

  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); action(); }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const totalCount = noteCount + annotationCount;

  return (
    <div className="mt-8">
      {/* Toggle */}
      <button
        onClick={toggleVisible}
        className={`flex items-center gap-2 text-xs font-mono transition-colors ${
          visible ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        Notes & Annotations{totalCount > 0 && ` (${totalCount})`}
        <span className="text-zinc-700 text-[10px]">{visible ? '\u25BE' : '\u25B8'}</span>
      </button>

      {visible && (
        <div className="mt-3 rounded-lg bg-zinc-900/50 border border-zinc-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 px-3 py-2.5 text-xs font-mono transition-colors ${
                activeTab === 'community'
                  ? 'text-amber-400 bg-amber-400/5 border-b border-amber-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Community{annotationCount > 0 ? ` (${annotationCount})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={`flex-1 px-3 py-2.5 text-xs font-mono transition-colors ${
                activeTab === 'mine'
                  ? 'text-amber-400 bg-amber-400/5 border-b border-amber-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              My Notes{noteCount > 0 ? ` (${noteCount})` : ''}
            </button>
          </div>

          <div className="p-3 sm:p-4">
            {/* ===== COMMUNITY TAB ===== */}
            {activeTab === 'community' && (
              <div>
                {loadingAnnotations ? (
                  <div className="text-center py-4">
                    <div className="inline-block w-4 h-4 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
                  </div>
                ) : annotations.length > 0 ? (
                  <div className="space-y-4 mb-4">
                    {annotations.map((ann) => {
                      const isOwn = user && ann.user_id === user.id;
                      const name = ann.profiles?.display_name || 'Anonymous';
                      const avatar = ann.profiles?.avatar_url;

                      return (
                        <div key={ann.id} className="group">
                          {editingAnnotationId === ann.id ? (
                            <div>
                              <textarea
                                value={editAnnotationText}
                                onChange={e => setEditAnnotationText(e.target.value)}
                                onKeyDown={e => handleKeyDown(e, handleSaveAnnotationEdit)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-400/50 resize-y min-h-[60px]"
                                autoFocus
                              />
                              <div className="flex gap-3 mt-2">
                                <button onClick={handleSaveAnnotationEdit} className="text-xs font-mono text-amber-400 hover:text-amber-300 px-2 py-1">Save</button>
                                <button onClick={() => setEditingAnnotationId(null)} className="text-xs font-mono text-zinc-500 hover:text-zinc-400 px-2 py-1">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                {avatar ? (
                                  <img src={avatar} alt="" className="w-5 h-5 rounded-full" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-amber-600/30 flex items-center justify-center text-[9px] text-amber-400 font-medium">
                                    {name[0]?.toUpperCase()}
                                  </div>
                                )}
                                <span className="text-[11px] text-zinc-400">{name}</span>
                                <span className="text-[10px] text-zinc-600 font-mono">{formatTime(ann.created_at)}</span>
                                {isOwn && (
                                  <div className="ml-auto flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditAnnotation(ann)} className="text-zinc-600 hover:text-zinc-400 p-1" title="Edit">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => handleDeleteAnnotation(ann.id)} className="text-zinc-600 hover:text-red-400 p-1" title="Delete">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed pl-7">
                                {ann.content}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 text-center py-3 mb-3">
                    No community annotations yet. Be the first.
                  </p>
                )}

                {user ? (
                  <div>
                    <textarea
                      value={annotationText}
                      onChange={e => setAnnotationText(e.target.value)}
                      onKeyDown={e => handleKeyDown(e, handleAddAnnotation)}
                      placeholder="Share a thought about this chapter..."
                      className="w-full bg-zinc-800/50 border border-zinc-800 rounded-md px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-y min-h-[60px] transition-colors"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-zinc-700 font-mono hidden sm:inline">Ctrl+Enter to post</span>
                      <button
                        onClick={handleAddAnnotation}
                        disabled={!annotationText.trim()}
                        className="text-xs font-mono px-3 py-1.5 rounded bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors sm:ml-auto"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                    className="w-full text-center py-3 text-sm text-zinc-500 hover:text-amber-400 transition-colors border border-dashed border-zinc-800 rounded-md active:bg-zinc-800/30"
                  >
                    Sign in to add annotations
                  </button>
                )}
              </div>
            )}

            {/* ===== MY NOTES TAB ===== */}
            {activeTab === 'mine' && (
              <div>
                {notes.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {notes.map((note) => (
                      <div key={note.id} className="group">
                        {editingId === note.id ? (
                          <div>
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              onKeyDown={e => handleKeyDown(e, handleSaveEdit)}
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-400/50 resize-y min-h-[60px]"
                              autoFocus
                            />
                            <div className="flex gap-3 mt-2">
                              <button onClick={handleSaveEdit} className="text-xs font-mono text-amber-400 hover:text-amber-300 px-2 py-1">Save</button>
                              <button onClick={() => setEditingId(null)} className="text-xs font-mono text-zinc-500 hover:text-zinc-400 px-2 py-1">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                                {note.text}
                              </p>
                              <span className="text-[10px] text-zinc-600 font-mono">
                                {formatTime(note.editedAt || note.timestamp)}
                                {note.editedAt && ' (edited)'}
                              </span>
                            </div>
                            <div className="shrink-0 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-0.5">
                              <button onClick={() => handleEditNote(note.id)} className="text-zinc-600 hover:text-zinc-400 p-1" title="Edit">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button onClick={() => handleDeleteNote(note.id)} className="text-zinc-600 hover:text-red-400 p-1" title="Delete">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <textarea
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    onKeyDown={e => handleKeyDown(e, handleAddNote)}
                    placeholder="Add a private note..."
                    className="w-full bg-zinc-800/50 border border-zinc-800 rounded-md px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-y min-h-[60px] transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-zinc-700 font-mono hidden sm:inline">Private · stored locally</span>
                    <button
                      onClick={handleAddNote}
                      disabled={!newText.trim()}
                      className="text-xs font-mono px-3 py-1.5 rounded bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors sm:ml-auto"
                    >
                      Add note
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
