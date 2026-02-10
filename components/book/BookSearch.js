'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BOOK_PARTS, APPENDICES } from '../../lib/book-data';

// Quick-match list for title-only search (instant, no API)
const SEARCHABLE = (() => {
  const items = [];
  for (const part of BOOK_PARTS) {
    for (const ch of part.chapters) {
      items.push({
        slug: ch.slug,
        label: `Chapter ${ch.number}`,
        title: ch.title,
        partTitle: part.title,
        searchText: `chapter ${ch.number} ${ch.title} ${part.title}`.toLowerCase(),
      });
    }
  }
  for (const app of APPENDICES) {
    const letter = app.title.match(/Appendix ([A-F])/)?.[1] || '';
    items.push({
      slug: app.slug,
      label: `Appendix ${letter}`,
      title: app.title.replace(/^Appendix [A-F]: /, ''),
      partTitle: 'Appendices',
      searchText: `appendix ${letter} ${app.title}`.toLowerCase(),
    });
  }
  return items;
})();

export default function BookSearch({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [titleResults, setTitleResults] = useState([]);
  const [contentResults, setContentResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const router = useRouter();

  // Combined results for keyboard navigation
  const allResults = [...titleResults, ...contentResults.filter(
    cr => !titleResults.some(tr => tr.slug === cr.slug)
  )];

  // Title search (instant)
  useEffect(() => {
    if (!query.trim()) {
      setTitleResults([]);
      setContentResults([]);
      setIsOpen(false);
      return;
    }
    const q = query.toLowerCase().trim();
    const matched = SEARCHABLE.filter(item => item.searchText.includes(q));
    setTitleResults(matched.slice(0, 5));
    setSelectedIdx(0);
    setIsOpen(true);
  }, [query]);

  // Full-text search (debounced API call)
  const doContentSearch = useCallback(async (q) => {
    if (q.length < 3) {
      setContentResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/book-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setContentResults(data.results || []);
    } catch {
      setContentResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length >= 3) {
      debounceRef.current = setTimeout(() => doContentSearch(q), 300);
    } else {
      setContentResults([]);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, doContentSearch]);

  const navigateTo = (slug) => {
    setQuery('');
    setIsOpen(false);
    router.push(`/book/${slug}`);
    onNavigate?.();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || allResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIdx]) {
      e.preventDefault();
      navigateTo(allResults[selectedIdx].slug);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  // Content results that aren't already shown as title results
  const uniqueContentResults = contentResults.filter(
    cr => !titleResults.some(tr => tr.slug === cr.slug)
  );

  return (
    <div className="relative px-3 py-2">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Search book..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && allResults.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-50 max-h-80 overflow-y-auto">
          {/* Title matches */}
          {titleResults.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[9px] font-mono uppercase tracking-wider text-zinc-600">
                Chapters
              </div>
              {titleResults.map((item, i) => (
                <button
                  key={item.slug}
                  onMouseDown={() => navigateTo(item.slug)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    i === selectedIdx
                      ? 'bg-amber-400/10 text-amber-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span className="font-mono text-zinc-600 mr-1.5">{item.label}</span>
                  {item.title}
                </button>
              ))}
            </>
          )}

          {/* Content matches */}
          {uniqueContentResults.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[9px] font-mono uppercase tracking-wider text-zinc-600 border-t border-zinc-800 mt-1">
                In content {loading ? '' : `(${contentResults.length})`}
              </div>
              {uniqueContentResults.slice(0, 10).map((item, i) => {
                const globalIdx = titleResults.length + i;
                return (
                  <button
                    key={item.slug}
                    onMouseDown={() => navigateTo(item.slug)}
                    className={`w-full text-left px-3 py-2 transition-colors ${
                      globalIdx === selectedIdx
                        ? 'bg-amber-400/10'
                        : 'hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-mono text-zinc-600">{item.label}</span>
                      <span className={`text-xs ${globalIdx === selectedIdx ? 'text-amber-400' : 'text-zinc-300'}`}>
                        {item.title}
                      </span>
                      <span className="text-[9px] text-zinc-600 ml-auto shrink-0">
                        {item.matchCount}x
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.snippet}
                    </p>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 3 && !loading && allResults.length === 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-50 px-3 py-3 text-xs text-zinc-500 text-center">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
