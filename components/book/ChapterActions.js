'use client';

import { useState, useEffect } from 'react';
import { toggleFavorite, isFavorite, setLastRead, markChapterRead } from '../../lib/book-storage';

export default function ChapterActions({ slug, title, label }) {
  const [faved, setFaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFaved(isFavorite(slug));
    // Track reading progress
    setLastRead(slug, title, label);
    markChapterRead(slug);
  }, [slug, title, label]);

  const handleFavorite = () => {
    const nowFaved = toggleFavorite(slug);
    setFaved(nowFaved);
  };

  const handleShare = async () => {
    const url = window.location.href;

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: `${label}: ${title}`, url });
        return;
      } catch { /* user cancelled, fall through to copy */ }
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard failed */ }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Favorite */}
      <button
        onClick={handleFavorite}
        className={`p-1.5 rounded-md transition-colors ${
          faved
            ? 'text-amber-400 bg-amber-400/10'
            : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800'
        }`}
        title={faved ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>

      {/* Share / Copy Link */}
      <button
        onClick={handleShare}
        className={`p-1.5 rounded-md transition-colors ${
          copied
            ? 'text-emerald-400 bg-emerald-400/10'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
        }`}
        title={copied ? 'Link copied!' : 'Share chapter'}
      >
        {copied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </button>
    </div>
  );
}
