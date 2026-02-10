/**
 * Book localStorage utilities — favorites, reading progress, bookmarks.
 * All client-side. No auth required.
 */

const KEYS = {
  favorites: 'nkya-book-favorites',
  lastRead: 'nkya-book-last-read',
  readingProgress: 'nkya-book-progress',
};

// --- Favorites ---

export function getFavorites() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS.favorites) || '[]');
  } catch { return []; }
}

export function isFavorite(slug) {
  return getFavorites().includes(slug);
}

export function toggleFavorite(slug) {
  const favs = getFavorites();
  const idx = favs.indexOf(slug);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(slug);
  }
  localStorage.setItem(KEYS.favorites, JSON.stringify(favs));
  return idx < 0; // returns true if now favorited
}

// --- Last Read (continue reading) ---

export function getLastRead() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(KEYS.lastRead));
  } catch { return null; }
}

export function setLastRead(slug, title, label) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.lastRead, JSON.stringify({
    slug, title, label, timestamp: Date.now(),
  }));
}

// --- Reading Progress (which chapters have been visited) ---

export function getReadChapters() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS.readingProgress) || '[]');
  } catch { return []; }
}

export function markChapterRead(slug) {
  if (typeof window === 'undefined') return;
  const read = getReadChapters();
  if (!read.includes(slug)) {
    read.push(slug);
    localStorage.setItem(KEYS.readingProgress, JSON.stringify(read));
  }
}
