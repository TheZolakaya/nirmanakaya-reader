/**
 * Book Notes — chapter-level commenting/annotation system.
 * All localStorage. Personal notes, no auth required.
 */

const KEY = 'nkya-book-notes';

function getAllNotes() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch { return {}; }
}

function saveAllNotes(notes) {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

/** Get notes for a specific chapter */
export function getChapterNotes(slug) {
  const all = getAllNotes();
  return (all[slug] || []).sort((a, b) => a.timestamp - b.timestamp);
}

/** Add a note to a chapter */
export function addNote(slug, text) {
  const all = getAllNotes();
  if (!all[slug]) all[slug] = [];
  const note = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.trim(),
    timestamp: Date.now(),
  };
  all[slug].push(note);
  saveAllNotes(all);
  return note;
}

/** Edit an existing note */
export function editNote(slug, noteId, newText) {
  const all = getAllNotes();
  if (!all[slug]) return;
  const note = all[slug].find(n => n.id === noteId);
  if (note) {
    note.text = newText.trim();
    note.editedAt = Date.now();
    saveAllNotes(all);
  }
}

/** Delete a note */
export function deleteNote(slug, noteId) {
  const all = getAllNotes();
  if (!all[slug]) return;
  all[slug] = all[slug].filter(n => n.id !== noteId);
  if (all[slug].length === 0) delete all[slug];
  saveAllNotes(all);
}

/** Get count of notes for a chapter (for badge display) */
export function getNoteCount(slug) {
  return getChapterNotes(slug).length;
}

/** Check if notes panel should be visible (user preference) */
export function getNotesVisible() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('nkya-book-notes-visible') === 'true';
}

/** Toggle notes panel visibility */
export function setNotesVisible(visible) {
  localStorage.setItem('nkya-book-notes-visible', visible ? 'true' : 'false');
}
