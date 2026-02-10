'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLastRead, getFavorites } from '../../lib/book-storage';
import { getEntryBySlug, QUOTES } from '../../lib/book-data';

export function ContinueReading() {
  const [lastRead, setLastRead] = useState(null);

  useEffect(() => {
    setLastRead(getLastRead());
  }, []);

  if (!lastRead) return null;

  return (
    <Link
      href={`/book/${lastRead.slug}`}
      className="block max-w-xl mx-auto mb-8 px-4 py-3 rounded-lg bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group"
    >
      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
        Continue reading
      </span>
      <span className="block text-sm text-zinc-300 group-hover:text-amber-400 transition-colors mt-1">
        {lastRead.label}: {lastRead.title}
      </span>
    </Link>
  );
}

export function FavoritesList() {
  const [favSlugs, setFavSlugs] = useState([]);

  useEffect(() => {
    setFavSlugs(getFavorites());
  }, []);

  if (favSlugs.length === 0) return null;

  const favEntries = favSlugs
    .map(slug => getEntryBySlug(slug))
    .filter(Boolean);

  return (
    <section className="mb-10">
      <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-400/60 mb-3 px-1 flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        Favorites
      </h2>
      <div className="space-y-0.5">
        {favEntries.map((entry) => (
          <Link
            key={entry.slug}
            href={`/book/${entry.slug}`}
            className="group flex items-baseline gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors"
          >
            <span className="text-zinc-600 font-mono text-xs shrink-0">
              {entry.label}
            </span>
            <span className="text-zinc-300 text-sm group-hover:text-amber-400 transition-colors">
              {entry.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RandomQuote() {
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  if (!quote) return null;

  return (
    <blockquote className="max-w-xl mx-auto mb-12 px-4 py-4 border-l-2 border-amber-500/30 bg-amber-500/5 rounded-r">
      <p className="text-zinc-300 text-sm italic leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </p>
      <cite className="block mt-2 text-xs text-zinc-500 not-italic">
        — {quote.source}
      </cite>
    </blockquote>
  );
}
