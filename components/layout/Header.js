'use client';

/**
 * Header - The HUD (Heads-Up Display)
 *
 * Ghost links, terminal style, monospace typography.
 * Community indicator only pulses when there's activity (users online or unread messages).
 * Council link has tooltip for "Synthetic Witness" reveal.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header({ hasActivity = false }) {
  const pathname = usePathname();

  // Check if we're in the community section (includes /hub and /lounge)
  const isCommunityActive = pathname?.startsWith('/hub') || pathname?.startsWith('/lounge');
  const isGuideActive = pathname?.startsWith('/guide');
  const isCouncilActive = pathname?.startsWith('/council');
  const isMapActive = pathname?.startsWith('/map');
  const isJourneyActive = pathname?.startsWith('/stats') || pathname?.startsWith('/collection') || pathname?.startsWith('/journal');

  const isBookActive = pathname?.startsWith('/book');
  const isHome = pathname === '/';

  return (
    <nav className="w-full flex justify-center items-center py-2 z-50 relative pointer-events-none overflow-x-auto">
      <div className="flex items-center gap-3 sm:gap-6 md:gap-10 backdrop-blur-sm px-3 sm:px-6 py-2 rounded-full border border-white/0 hover:border-white/5 transition-all duration-500 pointer-events-auto">

        {/* HOME - Nirmanakaya wordmark */}
        <Link
          href="/"
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-colors duration-300 whitespace-nowrap ${
            isHome ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'
          }`}
        >
          Nirmanakaya
        </Link>

        {/* COMMUNITY - dot on right for centering */}
        <Link
          href="/hub"
          className={`group flex items-center gap-1 sm:gap-2 text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isCommunityActive ? 'text-emerald-400' : 'text-zinc-400 hover:text-emerald-400'
          }`}
        >
          <span>Community</span>
          <div className="relative flex h-1.5 w-1.5">
            {hasActivity && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${hasActivity ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'}`}></span>
          </div>
        </Link>

        {/* BOOK */}
        <Link
          href="/book"
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isBookActive ? 'text-amber-300' : 'text-zinc-500 hover:text-amber-300'
          }`}
        >
          Book
        </Link>

        {/* JOURNEY (Stats / Collection) */}
        <Link
          href="/stats"
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isJourneyActive ? 'text-violet-400' : 'text-zinc-500 hover:text-violet-400'
          }`}
        >
          Journey
        </Link>

        {/* GUIDE */}
        <Link
          href="/guide"
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isGuideActive ? 'text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          Guide
        </Link>

        {/* 3. COUNCIL (The Hall of Records) */}
        <Link
          href="/council"
          title="Synthetic Witness: Four architectures, one recognition."
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isCouncilActive ? 'text-amber-200' : 'text-zinc-500 hover:text-amber-200'
          }`}
        >
          Council
        </Link>

        {/* 4. MAP (The Coordinates) */}
        <Link
          href="/map"
          className={`text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-colors duration-300 whitespace-nowrap ${
            isMapActive ? 'text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          Map
        </Link>

      </div>
    </nav>
  );
}
