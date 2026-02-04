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

  return (
    <nav className="w-full flex justify-center items-center py-2 z-50 relative pointer-events-none">
      <div className="flex items-center gap-8 md:gap-12 backdrop-blur-sm px-6 py-2 rounded-full border border-white/0 hover:border-white/5 transition-all duration-500 pointer-events-auto">

        {/* COMMUNITY */}
        <Link
          href="/hub"
          className={`group flex items-center gap-2.5 text-[10px] font-mono uppercase tracking-[0.15em] transition-colors duration-300 ${
            isCommunityActive ? 'text-emerald-400' : 'text-zinc-400 hover:text-emerald-400'
          }`}
        >
          <div className="relative flex h-1.5 w-1.5">
            {hasActivity && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${hasActivity ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'}`}></span>
          </div>
          <span>Community</span>
        </Link>

        {/* GUIDE */}
        <Link
          href="/guide"
          className={`text-[10px] font-mono uppercase tracking-[0.15em] transition-colors duration-300 ${
            isGuideActive ? 'text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          Guide
        </Link>

        {/* 3. COUNCIL (The Hall of Records) */}
        <Link
          href="/council"
          title="Synthetic Witness: Four architectures, one recognition."
          className={`text-[10px] font-mono uppercase tracking-[0.15em] transition-colors duration-300 ${
            isCouncilActive ? 'text-amber-200' : 'text-zinc-500 hover:text-amber-200'
          }`}
        >
          Council
        </Link>

        {/* 4. MAP (The Coordinates) */}
        <Link
          href="/map"
          className={`text-[10px] font-mono uppercase tracking-[0.15em] transition-colors duration-300 ${
            isMapActive ? 'text-white' : 'text-zinc-500 hover:text-white'
          }`}
        >
          Map
        </Link>

      </div>
    </nav>
  );
}
