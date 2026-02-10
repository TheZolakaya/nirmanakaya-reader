'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BOOK_PARTS, APPENDICES } from '../../lib/book-data';

export default function BookSidebar() {
  const pathname = usePathname();
  const currentSlug = pathname?.replace('/book/', '') || '';

  // Track which parts are expanded
  const [expanded, setExpanded] = useState({});
  // Mobile sidebar open state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-expand the part containing the current chapter
  useEffect(() => {
    for (const part of BOOK_PARTS) {
      if (part.chapters.some(ch => ch.slug === currentSlug)) {
        setExpanded(prev => ({ ...prev, [part.number]: true }));
        break;
      }
    }
  }, [currentSlug]);

  const togglePart = (num) => {
    setExpanded(prev => ({ ...prev, [num]: !prev[num] }));
  };

  const isAppendix = currentSlug.startsWith('appendix');
  const [appendixExpanded, setAppendixExpanded] = useState(isAppendix);

  useEffect(() => {
    if (currentSlug.startsWith('appendix')) {
      setAppendixExpanded(true);
    }
  }, [currentSlug]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Book title link */}
      <Link
        href="/book"
        className="block px-4 py-3 text-amber-400 font-serif text-sm font-semibold tracking-wide border-b border-zinc-800 hover:text-amber-300 transition-colors"
      >
        Nirmanakaya
        <span className="block text-[10px] text-zinc-500 font-mono font-normal tracking-wider uppercase mt-0.5">
          A Map of Consciousness
        </span>
      </Link>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {BOOK_PARTS.map((part) => (
          <div key={part.number}>
            {/* Part header - collapsible */}
            <button
              onClick={() => togglePart(part.number)}
              className="w-full flex items-center justify-between px-4 py-2 text-left group"
            >
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                Part {part.number}: {part.title}
              </span>
              <span className={`text-zinc-600 text-xs transition-transform duration-200 ${expanded[part.number] ? 'rotate-90' : ''}`}>
                ▸
              </span>
            </button>

            {/* Chapter list */}
            {expanded[part.number] && (
              <div className="pb-1">
                {part.chapters.map((ch) => {
                  const isActive = ch.slug === currentSlug;
                  return (
                    <Link
                      key={ch.slug}
                      href={`/book/${ch.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-4 pl-6 py-1.5 text-xs transition-colors duration-200 ${
                        isActive
                          ? 'text-amber-400 bg-amber-400/5 border-l-2 border-amber-400 pl-[22px]'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                      }`}
                    >
                      <span className="text-zinc-600 font-mono mr-1.5">{ch.number}.</span>
                      {ch.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Appendices section */}
        <div className="border-t border-zinc-800 mt-2 pt-1">
          <button
            onClick={() => setAppendixExpanded(!appendixExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-left group"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
              Appendices
            </span>
            <span className={`text-zinc-600 text-xs transition-transform duration-200 ${appendixExpanded ? 'rotate-90' : ''}`}>
              ▸
            </span>
          </button>

          {appendixExpanded && (
            <div className="pb-2">
              {APPENDICES.map((app) => {
                const isActive = app.slug === currentSlug;
                const shortTitle = app.title.replace(/^Appendix [A-F]: /, '');
                const letter = app.title.match(/Appendix ([A-F])/)?.[1] || '';
                return (
                  <Link
                    key={app.slug}
                    href={`/book/${app.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 pl-6 py-1.5 text-xs transition-colors duration-200 ${
                      isActive
                        ? 'text-amber-400 bg-amber-400/5 border-l-2 border-amber-400 pl-[22px]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <span className="text-zinc-600 font-mono mr-1.5">{letter}.</span>
                    {shortTitle}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-[70] p-2 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors backdrop-blur-sm"
        aria-label="Toggle book navigation"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {mobileOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-[55] backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - fixed on desktop, overlay on mobile */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-zinc-950/95 border-r border-zinc-800 z-[60] transition-transform duration-300 backdrop-blur-md
          lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
