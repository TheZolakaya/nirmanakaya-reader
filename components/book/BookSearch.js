'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BOOK_PARTS, APPENDICES } from '../../lib/book-data';

// Build a flat searchable list from the data index
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
  const [results, setResults] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const q = query.toLowerCase().trim();
    const matched = SEARCHABLE.filter(item => item.searchText.includes(q));
    setResults(matched.slice(0, 10));
    setSelectedIdx(0);
    setIsOpen(matched.length > 0);
  }, [query]);

  const navigateTo = (slug) => {
    setQuery('');
    setIsOpen(false);
    router.push(`/book/${slug}`);
    onNavigate?.();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      navigateTo(results[selectedIdx].slug);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

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
          onFocus={() => query.trim() && results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="Search chapters..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-50 max-h-64 overflow-y-auto">
          {results.map((item, i) => (
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
        </div>
      )}
    </div>
  );
}
