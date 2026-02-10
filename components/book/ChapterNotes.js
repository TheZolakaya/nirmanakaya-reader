'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getChapterNotes, addNote, editNote, deleteNote,
  getNoteCount, getNotesVisible, setNotesVisible,
} from '../../lib/book-notes';

export default function ChapterNotes({ slug }) {
  const [visible, setVisible] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [noteCount, setNoteCount] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    setVisible(getNotesVisible());
    refreshNotes();
  }, [slug]);

  const refreshNotes = () => {
    const n = getChapterNotes(slug);
    setNotes(n);
    setNoteCount(n.length);
  };

  const toggleVisible = () => {
    const next = !visible;
    setVisible(next);
    setNotesVisible(next);
  };

  const handleAdd = () => {
    if (!newText.trim()) return;
    addNote(slug, newText);
    setNewText('');
    refreshNotes();
  };

  const handleEdit = (id) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      setEditingId(id);
      setEditText(note.text);
    }
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      editNote(slug, editingId, editText);
      setEditingId(null);
      setEditText('');
      refreshNotes();
    }
  };

  const handleDelete = (id) => {
    deleteNote(slug, id);
    refreshNotes();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (editingId) handleSaveEdit();
      else handleAdd();
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mt-8">
      {/* Toggle button */}
      <button
        onClick={toggleVisible}
        className={`flex items-center gap-2 text-xs font-mono transition-colors ${
          visible ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        Notes{noteCount > 0 && ` (${noteCount})`}
        <span className="text-zinc-700 text-[10px]">
          {visible ? '▾' : '▸'}
        </span>
      </button>

      {/* Notes panel */}
      {visible && (
        <div className="mt-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
          {/* Existing notes */}
          {notes.length > 0 && (
            <div className="space-y-3 mb-4">
              {notes.map((note) => (
                <div key={note.id} className="group">
                  {editingId === note.id ? (
                    <div>
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-400/50 resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={handleSaveEdit}
                          className="text-[10px] font-mono text-amber-400 hover:text-amber-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-[10px] font-mono text-zinc-500 hover:text-zinc-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                          {note.text}
                        </p>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {formatTime(note.editedAt || note.timestamp)}
                          {note.editedAt && ' (edited)'}
                        </span>
                      </div>
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pt-0.5">
                        <button
                          onClick={() => handleEdit(note.id)}
                          className="text-zinc-600 hover:text-zinc-400 p-0.5"
                          title="Edit"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="text-zinc-600 hover:text-red-400 p-0.5"
                          title="Delete"
                        >
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

          {/* Add new note */}
          <div>
            <textarea
              ref={textareaRef}
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a note about this chapter..."
              className="w-full bg-zinc-800/50 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
              rows={2}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-zinc-700 font-mono">
                Ctrl+Enter to save
              </span>
              <button
                onClick={handleAdd}
                disabled={!newText.trim()}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Add note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
